import { parse as parseYaml } from 'yaml';

export type Severity = 'error' | 'warning';

export type Finding = {
  rule: string;
  severity: Severity;
  message: string;
};

export const RULE_EWSJS_PATCH = 'ewsjs-patch-location';
export const RULE_UPDATE_METADATA = 'update-metadata-uploader';
export const RULE_BUNDLE_VERSION = 'mac-bundle-version';

export type PatchFile = { path: string; content: string };

const EWSJS_FILENAME = /(^|[/\\])@ewsjs\+xhr\+[^/\\]*\.patch$/;
const EWSJS_CONTENT = /node_modules\/@ewsjs\/xhr\//;

export const checkEwsjsPatchLocation = (
  patchPackageFiles: PatchFile[]
): Finding[] =>
  patchPackageFiles
    .filter(
      ({ path, content }) =>
        EWSJS_FILENAME.test(path) || EWSJS_CONTENT.test(content)
    )
    .map(({ path }) => ({
      rule: RULE_EWSJS_PATCH,
      severity: 'error',
      message:
        `${path} patches @ewsjs/xhr through patch-package. @ewsjs/xhr is ` +
        'patched only through the Yarn patch protocol (.yarn/patches/, ' +
        'referenced from package.json); a second patch-package copy tries to ' +
        're-apply to already-patched code and fails yarn install in CI. ' +
        `Fix: delete ${path} and make the change in the .yarn/patches/ ` +
        'patch instead (yarn patch @ewsjs/xhr, then yarn patch-commit -s <dir>).',
    }));

type Platform = 'windows' | 'macos' | 'linux';

const UPDATER_TARGET: Record<Platform, string> = {
  windows: 'nsis',
  macos: 'dmg',
  linux: 'AppImage',
};

type Combo = Record<string, unknown>;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const matches = (combo: Combo, partial: Combo, keys: string[]): boolean =>
  keys.every((key) => combo[key] === partial[key]);

export const expandMatrix = (matrix: unknown): Combo[] => {
  if (!isPlainObject(matrix)) return [{}];

  const { include, exclude, ...axes } = matrix;
  const axisKeys = Object.keys(axes);

  let combos: Combo[] = [{}];
  for (const key of axisKeys) {
    const values = Array.isArray(axes[key]) ? (axes[key] as unknown[]) : [];
    combos = combos.flatMap((combo) =>
      values.map((value) => ({ ...combo, [key]: value }))
    );
  }
  if (axisKeys.length === 0) combos = [];

  if (Array.isArray(exclude)) {
    combos = combos.filter(
      (combo) =>
        !exclude.some(
          (entry) =>
            isPlainObject(entry) && matches(combo, entry, Object.keys(entry))
        )
    );
  }

  if (Array.isArray(include)) {
    const original = [...combos];
    for (const entry of include) {
      if (!isPlainObject(entry)) continue;
      const sharedKeys = Object.keys(entry).filter((key) =>
        axisKeys.includes(key)
      );
      const targets = original.filter((combo) =>
        matches(combo, entry, sharedKeys)
      );
      if (targets.length === 0) {
        combos.push({ ...entry });
      } else {
        targets.forEach((combo) => Object.assign(combo, entry));
      }
    }
  }

  return combos.length > 0 ? combos : [{}];
};

const MATRIX_EXPRESSION = /^\$\{\{\s*matrix\.([\w-]+)\s*\}\}$/;

type Resolved = { ok: true; value: string } | { ok: false; raw: string };

const resolveValue = (value: unknown, combo: Combo): Resolved => {
  if (typeof value === 'boolean' || typeof value === 'number') {
    return { ok: true, value: String(value) };
  }
  if (typeof value !== 'string') return { ok: false, raw: String(value) };
  const trimmed = value.trim();
  const expression = MATRIX_EXPRESSION.exec(trimmed);
  if (expression) {
    const fromMatrix = combo[expression[1]];
    return fromMatrix === undefined
      ? { ok: false, raw: trimmed }
      : { ok: true, value: String(fromMatrix) };
  }
  if (trimmed.includes('${{')) return { ok: false, raw: trimmed };
  return { ok: true, value: trimmed };
};

const platformOf = (runsOn: string): Platform | null => {
  const label = runsOn.toLowerCase();
  if (label.startsWith('windows')) return 'windows';
  if (label.startsWith('macos')) return 'macos';
  if (label.startsWith('ubuntu') || label.startsWith('linux')) return 'linux';
  return null;
};

type Uploader = { job: string; targets: string[] };

export const checkUpdateMetadataUploaders = (
  workflowYaml: string,
  { uploadDefault = 'true', workflowPath = 'build-release.yml' } = {}
): Finding[] => {
  const findings: Finding[] = [];
  const fail = (message: string) =>
    findings.push({ rule: RULE_UPDATE_METADATA, severity: 'error', message });

  const workflow = parseYaml(workflowYaml);
  const jobs = isPlainObject(workflow) ? workflow.jobs : undefined;
  if (!isPlainObject(jobs)) {
    fail(
      `${workflowPath} has no jobs map. Fix: restore the packaging jobs or ` +
        'update scripts/agentRules.lib.ts if the release workflow moved.'
    );
    return findings;
  }

  const uploaders: Record<Platform, Uploader[]> = {
    windows: [],
    macos: [],
    linux: [],
  };

  for (const [jobId, job] of Object.entries(jobs)) {
    if (!isPlainObject(job) || !Array.isArray(job.steps)) continue;
    const releaseSteps = job.steps.filter(
      (step): step is Record<string, unknown> =>
        isPlainObject(step) &&
        typeof step.uses === 'string' &&
        step.uses.includes('desktop-release-action')
    );
    if (releaseSteps.length === 0) continue;

    const strategy = isPlainObject(job.strategy) ? job.strategy : {};
    for (const combo of expandMatrix(strategy.matrix)) {
      const nameValue = resolveValue(job.name ?? jobId, combo);
      const instance = nameValue.ok ? nameValue.value : jobId;

      for (const step of releaseSteps) {
        const inputs = isPlainObject(step.with) ? step.with : {};
        const mode = resolveValue(inputs.mode ?? 'build', combo);
        if (mode.ok && mode.value === 'prepare') continue;

        const upload = resolveValue(
          inputs.upload_update_metadata ?? uploadDefault,
          combo
        );
        if (!upload.ok) {
          fail(
            `${workflowPath} job "${instance}" sets upload_update_metadata to ` +
              `"${upload.raw}", which cannot be resolved statically. Fix: use ` +
              "a literal 'true'/'false' or ${{ matrix.<key> }} backed by a " +
              'literal in every matrix entry.'
          );
          continue;
        }
        if (upload.value !== 'true') continue;

        const runsOn = resolveValue(job['runs-on'], combo);
        const platform = runsOn.ok ? platformOf(runsOn.value) : null;
        if (!platform) {
          fail(
            `${workflowPath} job "${instance}" uploads update metadata but its ` +
              `runs-on (${runsOn.ok ? runsOn.value : runsOn.raw}) does not ` +
              'name a windows-, macos- or ubuntu- runner. Fix: use a literal ' +
              'runner label or ${{ matrix.os }} so the platform is known.'
          );
          continue;
        }

        const targets = resolveValue(inputs.targets ?? '', combo);
        uploaders[platform].push({
          job: instance,
          targets: targets.ok ? targets.value.split(/\s+/).filter(Boolean) : [],
        });
      }
    }
  }

  for (const platform of Object.keys(uploaders) as Platform[]) {
    const owners = uploaders[platform];
    const expected = UPDATER_TARGET[platform];
    if (owners.length > 1) {
      fail(
        `${workflowPath}: ${owners.length} ${platform} packaging jobs upload ` +
          `update metadata (${owners.map((o) => o.job).join(', ')}). Each ` +
          "job's latest*.yml lists only the files that job built, so the last " +
          'uploader replaces the others with a partial list and breaks ' +
          `auto-update. Fix: set update_metadata: 'false' on every ${platform} ` +
          `job except the one building ${expected} (upload_update_metadata ` +
          "defaults to 'true' when omitted)."
      );
    } else if (
      owners.length === 1 &&
      owners[0].targets.length > 0 &&
      !owners[0].targets.includes(expected)
    ) {
      fail(
        `${workflowPath}: the ${platform} update metadata is uploaded by ` +
          `"${owners[0].job}" (targets: ${owners[0].targets.join(' ')}), ` +
          `which does not build ${expected}, the artifact electron-updater ` +
          `downloads. Fix: move update_metadata: 'true' to the job building ` +
          `${expected}.`
      );
    }
  }

  return findings;
};

export const BUNDLE_VERSION_FORMAT = /^\d{2}(0[1-9]|1[0-2])\d$/;

const yymm = (now: Date): string =>
  `${String(now.getFullYear() % 100).padStart(2, '0')}${String(
    now.getMonth() + 1
  ).padStart(2, '0')}`;

export const checkBundleVersionFormat = (
  bundleVersion: unknown,
  now: Date = new Date()
): Finding[] => {
  if (
    typeof bundleVersion === 'string' &&
    BUNDLE_VERSION_FORMAT.test(bundleVersion)
  ) {
    return [];
  }
  return [
    {
      rule: RULE_BUNDLE_VERSION,
      severity: 'error',
      message:
        `electron-builder.json mac.bundleVersion is ${JSON.stringify(
          bundleVersion
        )}; it must be a string of YYMM plus one build-counter digit ` +
        '(e.g. "26080" = first build of August 2026). Fix: set it to ' +
        `"${yymm(now)}0" for the first build this month, or the next ` +
        'counter digit if this month already shipped one (git log -p ' +
        '--follow -- electron-builder.json).',
    },
  ];
};

export type VersionPair = { version: string; bundleVersion: unknown };

export const checkBundleVersionBump = (
  base: VersionPair,
  head: VersionPair
): Finding[] => {
  const findings: Finding[] = [];
  const valid = (value: unknown): value is string =>
    typeof value === 'string' && BUNDLE_VERSION_FORMAT.test(value);

  if (
    valid(base.bundleVersion) &&
    valid(head.bundleVersion) &&
    Number(head.bundleVersion) < Number(base.bundleVersion)
  ) {
    findings.push({
      rule: RULE_BUNDLE_VERSION,
      severity: 'error',
      message:
        `electron-builder.json mac.bundleVersion went down from ` +
        `${base.bundleVersion} to ${head.bundleVersion}. Apple requires ` +
        'CFBundleVersion to strictly increase. Fix: set it above ' +
        `${base.bundleVersion}.`,
    });
  }

  if (
    base.version !== head.version &&
    head.bundleVersion === base.bundleVersion
  ) {
    findings.push({
      rule: RULE_BUNDLE_VERSION,
      severity: 'warning',
      message:
        `package.json version changes ${base.version} -> ${head.version} but ` +
        `electron-builder.json mac.bundleVersion stays ` +
        `${String(head.bundleVersion)}. A build submitted to the App Store ` +
        'needs a CFBundleVersion higher than the last one submitted. Fix: if ' +
        'this version ships to the App Store or gets notarized, bump ' +
        'mac.bundleVersion (YYMM + counter digit); otherwise ignore this ' +
        'warning.',
    });
  }

  return findings;
};

export const formatFinding = ({ rule, severity, message }: Finding): string =>
  `${severity.toUpperCase()} [${rule}] ${message}`;
