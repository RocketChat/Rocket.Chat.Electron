import { readFileSync } from 'fs';
import { join } from 'path';

const repoRoot = join(__dirname, '..', '..', '..');
const xmlPath = join(repoRoot, 'build', 'RocketChatDefaultAppAssociations.xml');
const nshPath = join(repoRoot, 'build', 'installer.nsh');

describe('RocketChatDefaultAppAssociations.xml', () => {
  const xml = readFileSync(xmlPath, 'utf8');
  const nsh = readFileSync(nshPath, 'utf8');

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
});
