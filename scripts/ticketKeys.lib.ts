import ts from 'typescript';

// The Jira projects of the Desktop team and the projects that its work links to.
// Jira is internal and this repository is public. A key belongs in a PR title or a
// commit subject, not in the code.
export const TICKET_PROJECTS = [
  'CORE',
  'DMV2',
  'DSK',
  'LSE2EE',
  'PI',
  'PROD',
  'PROJ',
  'SUP',
];

const keyPattern = new RegExp(
  `\\b(?:${TICKET_PROJECTS.join('|')})-\\d+\\b`,
  'g'
);

const textKinds = new Set<ts.SyntaxKind>([
  ts.SyntaxKind.SingleLineCommentTrivia,
  ts.SyntaxKind.MultiLineCommentTrivia,
  ts.SyntaxKind.StringLiteral,
  ts.SyntaxKind.NoSubstitutionTemplateLiteral,
  ts.SyntaxKind.TemplateHead,
  ts.SyntaxKind.TemplateMiddle,
  ts.SyntaxKind.TemplateTail,
  ts.SyntaxKind.JsxText,
]);

export type TicketKeyHit = { key: string; line: number };

const languageVariantOf = (fileName: string) =>
  /\.(tsx|jsx)$/.test(fileName)
    ? ts.LanguageVariant.JSX
    : ts.LanguageVariant.Standard;

// Finds ticket keys in the comments and string literals of one source file.
// A full parse would be slower and is not necessary: the scanner already tells
// comments and strings apart from code.
export const findTicketKeys = (
  source: string,
  fileName: string
): TicketKeyHit[] => {
  const sourceFile = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true
  );
  const hits: TicketKeyHit[] = [];

  const collect = (start: number, text: string) => {
    for (const match of text.matchAll(keyPattern)) {
      const { line } = sourceFile.getLineAndCharacterOfPosition(
        start + (match.index ?? 0)
      );
      hits.push({ key: match[0], line: line + 1 });
    }
  };

  const scanner = ts.createScanner(
    ts.ScriptTarget.Latest,
    false,
    languageVariantOf(fileName),
    source
  );

  const visit = (node: ts.Node) => {
    ts.forEachLeadingCommentRange(source, node.getFullStart(), (pos, end) =>
      collect(pos, source.slice(pos, end))
    );
    ts.forEachTrailingCommentRange(source, node.getEnd(), (pos, end) =>
      collect(pos, source.slice(pos, end))
    );
    if (textKinds.has(node.kind)) {
      collect(node.getStart(sourceFile), node.getText(sourceFile));
    }
    if (ts.isJsxExpression(node) && !node.expression) {
      // A JSX comment such as {/* ... */} has no expression node to visit.
      scanner.resetTokenState(node.getStart(sourceFile) + 1);
      const kind = scanner.scan();
      if (textKinds.has(kind)) {
        collect(scanner.getTokenStart(), scanner.getTokenText());
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);

  const seen = new Set<string>();
  return hits
    .filter(({ key, line }) => {
      const id = `${line}:${key}`;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .sort((a, b) => a.line - b.line);
};
