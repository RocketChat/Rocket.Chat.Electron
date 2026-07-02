import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

// Bridge the build hook (CommonJS) into Jest's TS context.
const buildHook = jest.requireActual<{
  default: (wxsPath: string) => Promise<void>;
}>('../../../build/msiProjectCreated.js');
const hook = buildHook.default;

const SAMPLE_WXS = `<?xml version="1.0" encoding="UTF-8"?>
<Wix>
  <Product Id="*" Name="Rocket.Chat">
    <InstallExecuteSequence>
      <Custom Action="Existing" After="InstallFiles" />
    </InstallExecuteSequence>
  </Product>
</Wix>`;

describe('msiProjectCreated default-associations injection', () => {
  let workDir: string;
  let wxsPath: string;
  let injected: string;

  beforeAll(async () => {
    workDir = mkdtempSync(join(tmpdir(), 'msi-inject-'));
    wxsPath = join(workDir, 'test.wxs');
    writeFileSync(wxsPath, SAMPLE_WXS, 'utf8');
    await hook(wxsPath);
    injected = readFileSync(wxsPath, 'utf8');
  });

  afterAll(() => {
    rmSync(workDir, { recursive: true, force: true });
  });

  it('declares SET_DEFAULT_ASSOCIATIONS as a secure public property', () => {
    expect(injected).toContain(
      '<Property Id="SET_DEFAULT_ASSOCIATIONS" Secure="yes"/>'
    );
  });

  it('points the install CA at the GPO-equivalent policy key', () => {
    expect(injected).toContain(
      'HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System\\DefaultAssociationsConfiguration'
    );
  });

  it('writes a sentinel under Rocket.Chat\\InstallState so uninstall knows what it owns', () => {
    expect(injected).toContain(
      'HKLM\\SOFTWARE\\Rocket.Chat\\InstallState\\WroteDefaultAssociationsPolicy'
    );
  });

  it('points the install CA at the bundled XML under resources\\', () => {
    expect(injected).toContain(
      'resources\\RocketChatDefaultAppAssociations.xml'
    );
  });

  it('renders single backslashes in VBScript registry paths (no double-escape regression)', () => {
    // After JS template literal expansion the .wxs MUST contain single
    // backslashes that VBScript will parse as literal path separators.
    // A double-backslash would mean we mistakenly escaped twice.
    expect(injected).not.toContain('HKLM\\\\SOFTWARE');
    expect(injected).not.toContain('resources\\\\RocketChat');
  });

  it('schedules the install pair conditioned on the property + clean install', () => {
    expect(injected).toMatch(
      /<Custom Action="SetWriteDefaultAssociationsPolicyData"[^>]*>SET_DEFAULT_ASSOCIATIONS = "1" AND NOT Installed AND NOT REMOVE~="ALL"<\/Custom>/
    );
    expect(injected).toMatch(
      /<Custom Action="WriteDefaultAssociationsPolicy"[^>]*>SET_DEFAULT_ASSOCIATIONS = "1" AND NOT Installed AND NOT REMOVE~="ALL"<\/Custom>/
    );
  });

  it('schedules the uninstall pair to skip major-upgrade RemoveExistingProducts', () => {
    expect(injected).toMatch(
      /<Custom Action="SetCleanupDefaultAssociationsPolicyData"[^>]*>REMOVE~="ALL" AND UPGRADINGPRODUCTCODE=""<\/Custom>/
    );
    expect(injected).toMatch(
      /<Custom Action="CleanupDefaultAssociationsPolicy"[^>]*>REMOVE~="ALL" AND UPGRADINGPRODUCTCODE=""<\/Custom>/
    );
  });

  it('puts CustomAction + Property definitions as direct children of <Product>, not inside InstallExecuteSequence', () => {
    const productInner = injected.match(/<Product[^>]*>([\s\S]*)<\/Product>/);
    expect(productInner).not.toBeNull();
    const productBody = productInner![1];

    const seqMatch = productBody.match(
      /<InstallExecuteSequence>([\s\S]*?)<\/InstallExecuteSequence>/
    );
    expect(seqMatch).not.toBeNull();
    const seqBody = seqMatch![1];

    expect(seqBody).not.toContain('<CustomAction');
    expect(seqBody).not.toContain('<Property ');
    expect(productBody).toContain(
      '<CustomAction Id="WriteDefaultAssociationsPolicy"'
    );
    expect(productBody).toContain('<Property Id="SET_DEFAULT_ASSOCIATIONS"');
  });

  it('marks deferred CAs Execute="deferred" + Impersonate="no" so HKLM writes succeed', () => {
    expect(injected).toMatch(
      /Id="WriteDefaultAssociationsPolicy"[\s\S]{0,500}Execute="deferred"[\s\S]{0,500}Impersonate="no"/
    );
    expect(injected).toMatch(
      /Id="CleanupDefaultAssociationsPolicy"[\s\S]{0,500}Execute="deferred"[\s\S]{0,500}Impersonate="no"/
    );
  });

  it('uses Property="<deferred-CA-Id>" type-51 setter to populate CustomActionData', () => {
    expect(injected).toMatch(
      /<CustomAction Id="SetWriteDefaultAssociationsPolicyData"[^>]*Property="WriteDefaultAssociationsPolicy"/
    );
    expect(injected).toMatch(
      /<CustomAction Id="SetCleanupDefaultAssociationsPolicyData"[^>]*Property="CleanupDefaultAssociationsPolicy"/
    );
  });

  it('preserves the pre-existing DISABLE_AUTO_UPDATES injection', () => {
    expect(injected).toContain('DISABLE_AUTO_UPDATES');
    expect(injected).toContain('WriteUpdateJson');
  });

  it('registers telephony capabilities/ProgIds and RegisteredApplications for MSI installs', () => {
    expect(injected).toContain('WriteTelephonyCapabilities');
    expect(injected).toContain(
      'HKLM\\SOFTWARE\\RegisteredApplications\\Rocket.Chat'
    );
    expect(injected).toContain(
      'HKLM\\SOFTWARE\\Rocket.Chat\\Capabilities\\URLAssociations\\tel'
    );
    expect(injected).toContain(
      'HKLM\\SOFTWARE\\Rocket.Chat\\Capabilities\\URLAssociations\\callto'
    );
    expect(injected).toContain('HKLM\\SOFTWARE\\Classes\\RocketChat.tel');
    expect(injected).toContain('HKLM\\SOFTWARE\\Classes\\RocketChat.callto');
  });

  it('schedules telephony registration independent of SET_DEFAULT_ASSOCIATIONS', () => {
    expect(injected).toMatch(
      /<Custom Action="SetWriteTelephonyCapabilitiesData"[^>]*>NOT REMOVE~="ALL"<\/Custom>/
    );
    expect(injected).toMatch(
      /<Custom Action="WriteTelephonyCapabilities"[^>]*>NOT REMOVE~="ALL"<\/Custom>/
    );
  });

  it('schedules telephony cleanup to skip major-upgrade RemoveExistingProducts', () => {
    expect(injected).toMatch(
      /<Custom Action="SetCleanupTelephonyCapabilitiesData"[^>]*>REMOVE~="ALL" AND UPGRADINGPRODUCTCODE=""<\/Custom>/
    );
    expect(injected).toMatch(
      /<Custom Action="CleanupTelephonyCapabilities"[^>]*>REMOVE~="ALL" AND UPGRADINGPRODUCTCODE=""<\/Custom>/
    );
  });
});
