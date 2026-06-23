#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import YAML from 'yaml';

const HEADERS = [
  'v2.id',
  'suite_id',
  'suite',
  'suite_without_cases',
  'title',
  'description',
  'preconditions',
  'postconditions',
  'severity',
  'priority',
  'status',
  'automation',
  'steps_type',
  'tags',
  'steps_actions',
  'steps_data',
  'steps_results',
];

const STEP_COLUMNS = [
  'Step',
  'Action',
  'Test data',
  'Expected result',
  'Agent action',
];

const packPath = process.argv[2];

if (!packPath) {
  console.error('Usage: node qa/scripts/export-qase-csv.mjs qa/<pack>');
  process.exit(1);
}

const root = process.cwd();
const absolutePackPath = path.resolve(root, packPath);
const flowsPath = path.join(absolutePackPath, 'flows');
const exportsPath = path.join(absolutePackPath, 'exports');
const outputPath = path.join(exportsPath, 'qase-import.csv');

const csvEscape = (value) => {
  const stringValue = value == null ? '' : String(value);
  return `"${stringValue.replaceAll('"', '""')}"`;
};

const stepEscape = (value) => String(value ?? '').replaceAll('"', '""');

const encodeStepLines = (values) =>
  values
    .map((value, index) => `${index + 1}. "${stepEscape(value)}"`)
    .join('\n');

const extractSection = (content, heading) => {
  const lines = content.split('\n');
  const start = lines.findIndex((line) => line === `## ${heading}`);

  if (start === -1) {
    return '';
  }

  const end = lines.findIndex(
    (line, index) => index > start && line.startsWith('## ')
  );

  return lines
    .slice(start + 1, end === -1 ? undefined : end)
    .join('\n')
    .trim();
};

const parseFlow = (filePath) => {
  const content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

  if (!frontmatterMatch) {
    throw new Error(`${filePath}: missing YAML frontmatter`);
  }

  const frontmatter = YAML.parse(frontmatterMatch[1]);
  const lines = content.split('\n');
  const tableStart = lines.findIndex(
    (line) => line.trim() === `| ${STEP_COLUMNS.join(' | ')} |`
  );

  if (tableStart === -1) {
    throw new Error(`${filePath}: missing Qase-compatible steps table`);
  }

  const steps = [];

  for (const line of lines.slice(tableStart + 2)) {
    if (!line.startsWith('|')) {
      break;
    }

    const cells = line
      .trim()
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((cell) => cell.trim());

    if (/^\d+$/.test(cells[0])) {
      steps.push({
        action: cells[1],
        data: [cells[2], cells[4] && `Agent: ${cells[4]}`]
          .filter(Boolean)
          .join('\n'),
        expected: cells[3],
      });
    }
  }

  return { content, frontmatter, steps };
};

const flowFiles = fs
  .readdirSync(flowsPath)
  .filter((file) => file.endsWith('.md'))
  .sort();

const flows = flowFiles.map((file) => parseFlow(path.join(flowsPath, file)));
const suites = [
  ...new Set(
    flows.map(({ frontmatter }) => frontmatter.qase?.suite).filter(Boolean)
  ),
];
const suiteIds = new Map(
  suites.map((suite, index) => [suite, String(index + 1)])
);
const rows = [];

for (const suite of suites) {
  rows.push({
    suite_id: suiteIds.get(suite),
    suite,
    suite_without_cases: '1',
  });
}

for (const { content, frontmatter, steps } of flows) {
  const qase = frontmatter.qase ?? {};
  const tags = [
    frontmatter.id,
    'source:repo-qa',
    ...(frontmatter.platforms ?? []).map((platform) => `platform:${platform}`),
    ...(frontmatter.requires ?? []).map(
      (requirement) => `requires:${requirement}`
    ),
  ];

  rows.push({
    'v2.id': qase.qase_id ?? '',
    'suite_id': suiteIds.get(qase.suite) ?? '',
    'suite': qase.suite ?? '',
    'title': frontmatter.title,
    'description': [
      `Source flow: ${frontmatter.id}`,
      frontmatter.expected_result,
    ]
      .filter(Boolean)
      .join('\n\n'),
    'preconditions': (frontmatter.requires ?? []).join('\n'),
    'postconditions': extractSection(content, 'Evidence'),
    'severity': qase.severity,
    'priority': qase.priority,
    'status': qase.status,
    'automation': qase.automation,
    'steps_type': 'classic',
    'tags': tags.join(','),
    'steps_actions': encodeStepLines(steps.map((step) => step.action)),
    'steps_data': encodeStepLines(steps.map((step) => step.data)),
    'steps_results': encodeStepLines(steps.map((step) => step.expected)),
  });
}

fs.mkdirSync(exportsPath, { recursive: true });
fs.writeFileSync(
  outputPath,
  `${HEADERS.join(',')}\n${rows
    .map((row) => HEADERS.map((header) => csvEscape(row[header])).join(','))
    .join('\n')}\n`
);

console.log(
  `Exported ${flows.length} Qase cases to ${path.relative(root, outputPath)}`
);
