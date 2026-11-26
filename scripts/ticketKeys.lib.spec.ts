import { findTicketKeys } from './ticketKeys.lib';

// Builds each key at runtime, so that this file holds no key as literal text.
const key = (project: string, id: number) => `${project}-${id}`;

describe('findTicketKeys', () => {
  it('finds a key in a line comment', () => {
    const source = `const a = 1;\n// Fixed for ${key('LSE2EE', 17)}.\n`;

    expect(findTicketKeys(source, 'a.ts')).toEqual([
      { key: key('LSE2EE', 17), line: 2 },
    ]);
  });

  it('finds keys in a block comment, with the line of each key', () => {
    const source = `/*\n * See ${key('CORE', 2704)}\n * and ${key('DSK', 231)}.\n */\nexport {};\n`;

    expect(findTicketKeys(source, 'a.ts')).toEqual([
      { key: key('CORE', 2704), line: 2 },
      { key: key('DSK', 231), line: 3 },
    ]);
  });

  it('finds a key in a test title', () => {
    const source = `it('returns hits newest first (${key('LSE2EE', 17)})', () => {});\n`;

    expect(findTicketKeys(source, 'a.spec.ts')).toEqual([
      { key: key('LSE2EE', 17), line: 1 },
    ]);
  });

  it('finds a key in a template literal', () => {
    const source = `const t = \`see ${key('SUP', 1097)} for \${x}\`;\n`;

    expect(findTicketKeys(source, 'a.ts')).toEqual([
      { key: key('SUP', 1097), line: 1 },
    ]);
  });

  it('finds keys in a JSX file', () => {
    const source = `export const A = () => <div>{/* ${key('PROD', 595)} */}</div>;\n`;

    expect(findTicketKeys(source, 'a.tsx')).toEqual([
      { key: key('PROD', 595), line: 1 },
    ]);
  });

  it('finds a key in a JSX comment with whitespace around it', () => {
    const source = `export const A = () => <div>{ /* a */ /* ${key('PROD', 595)} */ }</div>;\n`;

    expect(findTicketKeys(source, 'a.tsx')).toEqual([
      { key: key('PROD', 595), line: 1 },
    ]);
  });

  it('ignores names that only look like keys', () => {
    const source = [
      "const hash = 'SHA-256';",
      "const enc = 'UTF-8'; // AES-256 and ISO-8601",
      "const header = 'X-RateLimit-Reset';",
      '// PR #3467 and RocketChat/Rocket.Chat#43193',
    ].join('\n');

    expect(findTicketKeys(source, 'a.ts')).toEqual([]);
  });

  it('ignores a key in code that is not a comment or a string', () => {
    const source = 'const CORE = 1; const x = CORE - 2704;\n';

    expect(findTicketKeys(source, 'a.ts')).toEqual([]);
  });
});
