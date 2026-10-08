#!/usr/bin/env node

// Keeps a release QA run on track across interruptions. The checklist is a
// Markdown file, `qa/<pack>/results/checklist.md`, with one item for each
// flow × target. A target is a package (`dmg`, `mas`, `exe`, ...) when the
// flow lists `packages:` in its frontmatter, else a platform.
//
//   node skills/release-qa-plan/checklist.mjs init   qa/<pack>
//   node skills/release-qa-plan/checklist.mjs sync   qa/<pack>
//   node skills/release-qa-plan/checklist.mjs next   qa/<pack> [--target <t>]
//   node skills/release-qa-plan/checklist.mjs mark   qa/<pack> <flow-id> <target> <status> [--note "..."]
//   node skills/release-qa-plan/checklist.mjs status qa/<pack>
//
// Status: todo, wip, pass, fail, blocked. `sync` adds the items of new
// flows and targets and keeps every recorded result. The build under test
// comes from the pack README (`Build under test: <tag>`). A result that was
// recorded on another build is stale: `next` gives it again.

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import YAML from 'yaml';

const PACKAGE_PLATFORM = {
  dmg: 'macos',
  pkg: 'macos',
  mas: 'macos',
  exe: 'windows',
  msi: 'windows',
  appx: 'windows',
  appimage: 'linux',
  deb: 'linux',
  rpm: 'linux',
  snap: 'linux',
  targz: 'linux',
};
const PLATFORM_ORDER = ['macos', 'windows', 'linux'];
const PRIORITY_ORDER = ['smoke', 'release', 'high', 'medium', 'low'];
const BOXES = { todo: ' ', wip: '~', pass: 'x', fail: '!', blocked: '-' };
const STATUSES = Object.keys(BOXES);

const [command, packArg, ...rest] = process.argv.slice(2);
const option = (name) => {
  const index = rest.indexOf(`--${name}`);
  return index === -1 ? null : rest[index + 1];
};
const fail = (message) => {
  console.error(message);
  process.exit(1);
};

if (!command || !packArg) {
  fail(
    'Usage: checklist.mjs <init|sync|next|mark|status> qa/<pack> [args]\nSee the header of this file.'
  );
}

const pack = path.resolve(packArg);
const checklistPath = path.join(pack, 'results', 'checklist.md');
const display = (file) => {
  const relative = path.relative(process.cwd(), file);
  return relative.startsWith('..') ? file : relative;
};

const buildUnderTest = () => {
  const readme = path.join(pack, 'README.md');
  if (!fs.existsSync(readme)) fail(`${packArg}: README.md is missing`);
  const match = fs
    .readFileSync(readme, 'utf8')
    .match(/Build under test: (\S+)/);
  if (!match)
    fail(`${packArg}/README.md has no "Build under test: <tag>" line`);
  return match[1].replace(/[`*]/g, '');
};

const parseFlow = (absolutePath, order, priorityOverride) => {
  const file = path.relative(pack, absolutePath);
  const content = fs.readFileSync(absolutePath, 'utf8');
  const frontmatter = YAML.parse(
    content.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? ''
  );
  if (!frontmatter?.id) fail(`${file}: frontmatter.id is missing`);
  const packages = (frontmatter.packages ?? []).map((name) =>
    String(name).toLowerCase()
  );
  for (const name of packages) {
    if (!PACKAGE_PLATFORM[name]) {
      fail(
        `${file}: unknown package "${name}" (use ${Object.keys(PACKAGE_PLATFORM).join(', ')})`
      );
    }
  }
  const targets = packages.length
    ? packages
    : (frontmatter.platforms ?? []).map(String);
  return {
    id: frontmatter.id,
    title: frontmatter.title,
    priority: priorityOverride ?? frontmatter.priority ?? 'medium',
    file,
    order,
    targets,
  };
};

// Flows from other packs that this pack reuses. The README lists them in a
// `## Reused flows` section, one per line: `- CONF-QA-001` or
// `- CONF-QA-001 priority: release`.
const reusedFlowIds = () => {
  const readme = fs.readFileSync(path.join(pack, 'README.md'), 'utf8');
  const section = readme.match(
    /^## Reused flows\s*$([\s\S]*?)(?=^## |(?![\s\S]))/m
  );
  if (!section) return [];
  return [...section[1].matchAll(/^- `?([A-Z0-9-]+-QA-\d+)`?(.*)$/gm)].map(
    ([, id, rest]) => ({ id, priority: rest.match(/priority:\s*(\w+)/)?.[1] })
  );
};

const readFlows = () => {
  const flowsDir = path.join(pack, 'flows');
  if (!fs.existsSync(flowsDir)) fail(`${packArg}: flows/ is missing`);
  const own = fs
    .readdirSync(flowsDir)
    .filter((file) => file.endsWith('.md'))
    .sort()
    .map((file, order) => parseFlow(path.join(flowsDir, file), order));

  const reused = reusedFlowIds();
  if (!reused.length) return own;
  const qaDir = path.dirname(pack);
  const elsewhere = fs
    .readdirSync(qaDir)
    .filter((name) => path.join(qaDir, name) !== pack)
    .flatMap((name) => {
      const dir = path.join(qaDir, name, 'flows');
      return fs.existsSync(dir)
        ? fs
            .readdirSync(dir)
            .filter((file) => file.endsWith('.md'))
            .map((file) => path.join(dir, file))
        : [];
    });
  const byId = new Map(elsewhere.map((file) => [parseFlow(file, 0).id, file]));
  return own.concat(
    reused.map(({ id, priority }, index) => {
      if (!byId.has(id)) {
        fail(
          `README "Reused flows" lists ${id}, but no flow under qa/ has that id`
        );
      }
      return parseFlow(byId.get(id), own.length + index, priority);
    })
  );
};

const platformOf = (target) => PACKAGE_PLATFORM[target] ?? target;
const rank = (item) => [
  PRIORITY_ORDER.indexOf(item.priority) === -1
    ? PRIORITY_ORDER.length
    : PRIORITY_ORDER.indexOf(item.priority),
  item.order,
];
const byRank = (a, b) => {
  const [pa, oa] = rank(a);
  const [pb, ob] = rank(b);
  return pa - pb || oa - ob;
};

const ITEM_LINE = /^- \[(.)\] (\S+) \| (\S+) \| (.*?) \((\w+)\) — (\S+)$/;
const META_LINE =
  /^ {2}- status: (\w+) \| build: (.*?) \| at: (.*?) \| note: (.*)$/;

const parseChecklist = () => {
  if (!fs.existsSync(checklistPath)) {
    fail(`${display(checklistPath)} is missing. Run init first.`);
  }
  const fileLines = fs.readFileSync(checklistPath, 'utf8').split('\n');
  const items = [];
  for (let i = 0; i < fileLines.length; i++) {
    const item = fileLines[i].match(ITEM_LINE);
    const meta = fileLines[i + 1]?.match(META_LINE);
    if (item && meta) {
      items.push({
        id: item[2],
        target: item[3],
        title: item[4],
        priority: item[5],
        file: item[6],
        status: meta[1],
        build: meta[2].trim(),
        at: meta[3].trim(),
        note: meta[4].trim(),
      });
    }
  }
  return items;
};

const writeChecklist = (items, build) => {
  const out = [
    `# Release QA checklist`,
    '',
    `Build under test: ${build}`,
    '',
    'Do not edit the item lines by hand. Use',
    '`node skills/release-qa-plan/checklist.mjs next|mark|status`.',
    'Boxes: `[ ]` todo, `[~]` wip, `[x]` pass, `[!]` fail, `[-]` blocked.',
    '',
  ];
  for (const platform of PLATFORM_ORDER.concat(
    [...new Set(items.map((item) => platformOf(item.target)))].filter(
      (name) => !PLATFORM_ORDER.includes(name)
    )
  )) {
    const group = items
      .filter((item) => platformOf(item.target) === platform)
      .sort(byRank);
    if (!group.length) continue;
    out.push(`## ${platform}`, '');
    for (const item of group) {
      out.push(
        `- [${BOXES[item.status]}] ${item.id} | ${item.target} | ${item.title} (${item.priority}) — ${item.file}`,
        `  - status: ${item.status} | build: ${item.build} | at: ${item.at} | note: ${item.note}`
      );
    }
    out.push('');
  }
  fs.mkdirSync(path.dirname(checklistPath), { recursive: true });
  fs.writeFileSync(checklistPath, out.join('\n'));
};

const itemsFromFlows = (flows, previous = []) => {
  const known = new Map(
    previous.map((item) => [`${item.id}|${item.target}`, item])
  );
  return flows.flatMap((flow) =>
    flow.targets.map((target) => {
      const old = known.get(`${flow.id}|${target}`);
      return {
        id: flow.id,
        target,
        title: flow.title,
        priority: flow.priority,
        file: flow.file,
        order: flow.order,
        status: old?.status ?? 'todo',
        build: old?.build ?? '',
        at: old?.at ?? '',
        note: old?.note ?? '',
      };
    })
  );
};

const isStale = (item, build) =>
  item.status !== 'todo' && item.build && item.build !== build;

const withOrder = (items) => {
  const flows = readFlows();
  const order = new Map(flows.map((flow) => [flow.id, flow.order]));
  return items.map((item) => ({ ...item, order: order.get(item.id) ?? 1e6 }));
};

const build = buildUnderTest();

if (command === 'init' || command === 'sync') {
  if (command === 'init' && fs.existsSync(checklistPath)) {
    fail(
      `${display(checklistPath)} exists. Use sync to add new flows and keep the results.`
    );
  }
  const previous = command === 'sync' ? parseChecklist() : [];
  const items = itemsFromFlows(readFlows(), previous);
  const dropped = previous.filter(
    (old) =>
      !items.some((item) => item.id === old.id && item.target === old.target)
  );
  writeChecklist(items, build);
  console.log(
    `${command}: ${items.length} item(s) in ${display(checklistPath)} for build ${build}`
  );
  for (const item of dropped) {
    console.log(
      `  removed (flow or target no longer in the pack): ${item.id} ${item.target} [${item.status}]`
    );
  }
} else if (command === 'next') {
  const target = option('target');
  const items = withOrder(parseChecklist())
    .filter(
      (item) =>
        !target || item.target === target || platformOf(item.target) === target
    )
    .sort(byRank);
  const open =
    items.find((item) => item.status === 'wip') ??
    items.find((item) => item.status === 'todo' || isStale(item, build));
  if (!open) {
    console.log(`Nothing left${target ? ` for ${target}` : ''} on ${build}.`);
  } else {
    let why = 'todo';
    if (open.status === 'wip') {
      why = 'in progress — start the flow again from step 1';
    } else if (isStale(open, build)) {
      why = `stale: ${open.status} on ${open.build}, run it again on ${build}`;
    }
    console.log(
      `${open.id} | ${open.target} | ${open.title} (${open.priority})\n  ${path.join(packArg, open.file)}\n  ${why}${open.note ? `\n  note: ${open.note}` : ''}`
    );
  }
} else if (command === 'mark') {
  const [id, target, status] = rest;
  if (!STATUSES.includes(status)) {
    fail(`status must be one of: ${STATUSES.join(', ')}`);
  }
  const items = withOrder(parseChecklist());
  const item = items.find(
    (entry) => entry.id === id && entry.target === target
  );
  if (!item) fail(`no item ${id} | ${target} in the checklist`);
  if (['fail', 'blocked'].includes(status) && !option('note')) {
    fail(`${status} needs --note "<what happened and the evidence path>"`);
  }
  item.status = status;
  item.build = status === 'todo' ? '' : build;
  item.at = status === 'todo' ? '' : new Date().toISOString().slice(0, 16);
  item.note = (option('note') ?? (status === 'todo' ? '' : item.note)).replace(
    /\s*\n\s*/g,
    ' '
  );
  writeChecklist(items, build);
  console.log(`${id} | ${target} → ${status} on ${build}`);
} else if (command === 'status') {
  const items = withOrder(parseChecklist());
  const effective = (item) => (isStale(item, build) ? 'stale' : item.status);
  console.log(`Build under test: ${build}\n`);
  console.log('| Platform | pass | fail | blocked | wip | todo | stale |');
  console.log('| --- | --- | --- | --- | --- | --- | --- |');
  for (const platform of [
    ...new Set(items.map((item) => platformOf(item.target))),
  ]) {
    const group = items.filter((item) => platformOf(item.target) === platform);
    const count = (name) =>
      group.filter((item) => effective(item) === name).length;
    console.log(
      `| ${platform} | ${['pass', 'fail', 'blocked', 'wip', 'todo', 'stale'].map(count).join(' | ')} |`
    );
  }
  const problems = items.filter((item) =>
    ['fail', 'blocked'].includes(effective(item))
  );
  if (problems.length) {
    console.log('\nFailures and blocked items:');
    for (const item of problems) {
      console.log(
        `- ${item.status.toUpperCase()} ${item.id} | ${item.target} (${item.priority}): ${item.note}`
      );
    }
  }
  const smokeOpen = items.filter(
    (item) => item.priority === 'smoke' && effective(item) !== 'pass'
  );
  const releaseFail = items.filter(
    (item) => item.priority === 'release' && effective(item) === 'fail'
  );
  const done = items.every(
    (item) =>
      effective(item) !== 'todo' &&
      effective(item) !== 'wip' &&
      effective(item) !== 'stale'
  );
  console.log(
    `\nProgress: ${items.filter((item) => effective(item) === 'pass').length}/${items.length} pass. ` +
      `Smoke not passed: ${smokeOpen.length}. Release-priority failures: ${releaseFail.length}. ` +
      `${done ? 'Every item has a result.' : 'Items are still open.'}`
  );
} else {
  fail(`unknown command: ${command}`);
}
