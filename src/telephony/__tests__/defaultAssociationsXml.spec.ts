import { readFileSync } from 'fs';
import { join } from 'path';

const repoRoot = join(__dirname, '..', '..', '..');
const xmlPath = join(repoRoot, 'build', 'RocketChatDefaultAppAssociations.xml');
const nshPath = join(repoRoot, 'build', 'installer.nsh');
const diagnosticsPath = join(repoRoot, 'src', 'telephony', 'diagnostics.ts');
const electronBuilderPath = join(repoRoot, 'electron-builder.json');

describe('RocketChatDefaultAppAssociations.xml', () => {
  const xml = readFileSync(xmlPath, 'utf8');
  const nsh = readFileSync(nshPath, 'utf8');
  const diagnostics = readFileSync(diagnosticsPath, 'utf8');
  const electronBuilder = readFileSync(electronBuilderPath, 'utf8');

  it('declares the tel association with the RocketChat.tel ProgId', () => {
    expect(xml).toMatch(
      /Identifier="tel"[^/>]*ProgId="RocketChat\.tel"|ProgId="RocketChat\.tel"[^/>]*Identifier="tel"/
    );
  });

  it('declares the callto association with the RocketChat.callto ProgId', () => {
    expect(xml).toMatch(
      /Identifier="callto"[^/>]*ProgId="RocketChat\.callto"|ProgId="RocketChat\.callto"[^/>]*Identifier="callto"/
    );
  });

  it('uses the same ProgIds the NSIS installer registers', () => {
    expect(nsh).toContain('RocketChat.tel');
    expect(nsh).toContain('RocketChat.callto');
  });

  it('stays aligned with diagnostics checks for registration and per-scheme verification', () => {
    expect(diagnostics).toContain('windows.registeredApp');
    expect(diagnostics).toContain('windows.capabilities.');
    expect(diagnostics).toContain('windows.progid.');
  });

  it('is included in packaged extraResources so MSI policy path resolves under resources\\', () => {
    const config = JSON.parse(electronBuilder) as {
      extraResources?: Array<string | { from?: string; to?: string }>;
    };
    expect(config.extraResources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          from: 'build/RocketChatDefaultAppAssociations.xml',
          to: 'resources/RocketChatDefaultAppAssociations.xml',
        }),
      ])
    );
  });
});
