import {
  checkBundleVersionBump,
  checkBundleVersionFormat,
  checkEwsjsPatchLocation,
  checkUpdateMetadataUploaders,
  expandMatrix,
  RULE_BUNDLE_VERSION,
  RULE_EWSJS_PATCH,
  RULE_UPDATE_METADATA,
} from './agentRules.lib';

describe('checkEwsjsPatchLocation', () => {
  it('passes when patches/ holds only other packages', () => {
    expect(
      checkEwsjsPatchLocation([
        {
          path: 'patches/@kayahr+jest-electron-runner+29.14.0.patch',
          content: 'diff --git a/node_modules/@kayahr/jest-electron-runner/x',
        },
      ])
    ).toEqual([]);
  });

  it('fails on a patch-package file named for @ewsjs/xhr', () => {
    const findings = checkEwsjsPatchLocation([
      { path: 'patches/@ewsjs+xhr+2.0.2.patch', content: '' },
    ]);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      rule: RULE_EWSJS_PATCH,
      severity: 'error',
    });
    expect(findings[0].message).toContain('.yarn/patches/');
    expect(findings[0].message).toContain(
      'delete patches/@ewsjs+xhr+2.0.2.patch'
    );
  });

  it('fails on a renamed patch whose diff targets @ewsjs/xhr', () => {
    expect(
      checkEwsjsPatchLocation([
        {
          path: 'patches/ntlm-fix.patch',
          content:
            'diff --git a/node_modules/@ewsjs/xhr/dist/index.js b/node_modules/@ewsjs/xhr/dist/index.js',
        },
      ])
    ).toHaveLength(1);
  });
});

const workflow = (
  entries: Array<{ name: string; os: string; targets: string; meta?: string }>,
  uploadInput = 'upload_update_metadata: ${{ matrix.update_metadata }}'
) => `
jobs:
  prepare:
    runs-on: ubuntu-latest
    steps:
      - uses: ./workspaces/desktop-release-action
        with:
          mode: prepare
  build:
    strategy:
      matrix:
        include:
${entries
  .map(
    (e) => `          - os: ${e.os}
            name: ${e.name}
            targets: ${e.targets}
${e.meta === undefined ? '' : `            update_metadata: '${e.meta}'\n`}`
  )
  .join('')}
    name: \${{ matrix.name }}
    runs-on: \${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: ./workspaces/desktop-release-action
        with:
          mode: \${{ github.event_name == 'workflow_dispatch' && 'dry-run' || 'build' }}
          targets: \${{ matrix.targets }}
          ${uploadInput}
`;

const currentMatrix = [
  { name: 'windows-nsis', os: 'windows-latest', targets: 'nsis', meta: 'true' },
  { name: 'windows-msi', os: 'windows-latest', targets: 'msi', meta: 'false' },
  {
    name: 'windows-appx',
    os: 'windows-latest',
    targets: 'appx',
    meta: 'false',
  },
  {
    name: 'macos-dmg',
    os: 'macos-latest',
    targets: 'dmg zip pkg',
    meta: 'true',
  },
  { name: 'macos-mas', os: 'macos-latest', targets: 'mas', meta: 'false' },
  {
    name: 'linux-appimage',
    os: 'ubuntu-latest',
    targets: 'AppImage deb rpm tar.gz',
    meta: 'true',
  },
  { name: 'linux-snap', os: 'ubuntu-latest', targets: 'snap', meta: 'false' },
];

describe('checkUpdateMetadataUploaders', () => {
  it('passes with one uploader per platform', () => {
    expect(checkUpdateMetadataUploaders(workflow(currentMatrix))).toEqual([]);
  });

  it('fails when two windows jobs upload update metadata', () => {
    const matrix = currentMatrix.map((e) =>
      e.name === 'windows-msi' ? { ...e, meta: 'true' } : e
    );
    const findings = checkUpdateMetadataUploaders(workflow(matrix));
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      rule: RULE_UPDATE_METADATA,
      severity: 'error',
    });
    expect(findings[0].message).toContain('windows-nsis, windows-msi');
    expect(findings[0].message).toContain('building nsis');
  });

  it('treats an omitted input as the action default (true)', () => {
    const findings = checkUpdateMetadataUploaders(workflow(currentMatrix, ''));
    expect(findings.map((f) => f.message)).toEqual([
      expect.stringContaining('3 windows packaging jobs'),
      expect.stringContaining('2 macos packaging jobs'),
      expect.stringContaining('2 linux packaging jobs'),
    ]);
  });

  it('treats a matrix entry without the key as unresolvable', () => {
    const matrix = currentMatrix.map((e) =>
      e.name === 'linux-snap' ? { ...e, meta: undefined } : e
    );
    const findings = checkUpdateMetadataUploaders(workflow(matrix));
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('"linux-snap"');
    expect(findings[0].message).toContain('cannot be resolved statically');
  });

  it('fails when the only uploader does not build the updater artifact', () => {
    const matrix = currentMatrix.map((e) => {
      if (e.name === 'macos-dmg') return { ...e, meta: 'false' };
      if (e.name === 'macos-mas') return { ...e, meta: 'true' };
      return e;
    });
    const findings = checkUpdateMetadataUploaders(workflow(matrix));
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('does not build dmg');
  });

  it('accepts a single all-targets job per platform', () => {
    const yaml = `
jobs:
  build:
    strategy:
      matrix:
        os: [windows-latest, macos-latest, ubuntu-latest]
    runs-on: \${{ matrix.os }}
    steps:
      - uses: ./workspaces/desktop-release-action
`;
    expect(checkUpdateMetadataUploaders(yaml)).toEqual([]);
  });
});

describe('expandMatrix', () => {
  it('adds an include entry without axis keys to every combination', () => {
    expect(expandMatrix({ os: ['a', 'b'], include: [{ flag: 'x' }] })).toEqual([
      { os: 'a', flag: 'x' },
      { os: 'b', flag: 'x' },
    ]);
  });

  it('applies exclude before include', () => {
    expect(
      expandMatrix({
        os: ['a', 'b'],
        exclude: [{ os: 'b' }],
        include: [{ os: 'c' }],
      })
    ).toEqual([{ os: 'a' }, { os: 'c' }]);
  });
});

describe('checkBundleVersionFormat', () => {
  const now = new Date(2026, 9, 5);

  it.each(['26080', '26100', '25129'])('accepts %s', (value) => {
    expect(checkBundleVersionFormat(value, now)).toEqual([]);
  });

  it.each([
    ['4.0.0.0'],
    ['2608'],
    ['260800'],
    ['26130'],
    ['26000'],
    [26080],
    [undefined],
  ])('rejects %p and suggests the current month', (value) => {
    const findings = checkBundleVersionFormat(value, now);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      rule: RULE_BUNDLE_VERSION,
      severity: 'error',
    });
    expect(findings[0].message).toContain('"26100"');
  });
});

describe('checkBundleVersionBump', () => {
  it('is silent when nothing changes', () => {
    expect(
      checkBundleVersionBump(
        { version: '4.18.0-alpha.2', bundleVersion: '26100' },
        { version: '4.18.0-alpha.2', bundleVersion: '26100' }
      )
    ).toEqual([]);
  });

  it('is silent when both change', () => {
    expect(
      checkBundleVersionBump(
        { version: '4.18.0-alpha.2', bundleVersion: '26100' },
        { version: '4.18.0-alpha.3', bundleVersion: '26101' }
      )
    ).toEqual([]);
  });

  it('warns when the version changes but bundleVersion does not', () => {
    const findings = checkBundleVersionBump(
      { version: '4.15.0', bundleVersion: '26060' },
      { version: '4.15.1', bundleVersion: '26060' }
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      rule: RULE_BUNDLE_VERSION,
      severity: 'warning',
    });
    expect(findings[0].message).toContain('4.15.0 -> 4.15.1');
  });

  it('fails when bundleVersion goes down', () => {
    const findings = checkBundleVersionBump(
      { version: '4.18.0-alpha.2', bundleVersion: '26100' },
      { version: '4.18.0-alpha.2', bundleVersion: '26093' }
    );
    expect(findings).toHaveLength(1);
    expect(findings[0].severity).toBe('error');
    expect(findings[0].message).toContain('from 26100 to 26093');
  });
});
