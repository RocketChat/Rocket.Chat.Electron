#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import YAML from 'yaml';

const REQUIRED_QASE_FIELDS = [
  'suite',
  'priority',
  'severity',
  'status',
  'automation',
];
const REQUIRED_STEP_COLUMNS = [
  'Step',
  'Action',
  'Test data',
  'Expected result',
  'Agent action',
];
const VAGUE_NAVIGATION_PATTERNS = [
  /\bOpen Settings\b/i,
  /\bOpen Telephony settings\b/i,
  /\bEnable Telephony\b/i,
  /\bTurn Telephony\b/i,
];
const SELF_CONTAINED_NAVIGATION_PATTERNS = [
  /three-dots\/kebab button/i,
  /left vertical server list/i,
  /Voice & Video/i,
  /Telephony/i,
  /test-links\.html/i,
  /prompt button labeled/i,
  /diagnostics row/i,
];

const packPath = process.argv[2];

if (!packPath) {
  console.error('Usage: node qa/scripts/validate-flows.mjs qa/<pack>');
  process.exit(1);
}

const root = process.cwd();
const absolutePackPath = path.resolve(root, packPath);
const flowsPath = path.join(absolutePackPath, 'flows');
const htmlPath = path.join(absolutePackPath, 'test-links.html');

const errors = [];

const parseFlow = (filePath) => {
  const content = fs.readFileSync(filePath, 'utf8');
  const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);

  if (!frontmatterMatch) {
    throw new Error('missing YAML frontmatter');
  }

  const frontmatter = YAML.parse(frontmatterMatch[1]);
  const lines = content.split('\n');

  const tableStart = lines.findIndex(
    (line) => line.trim() === `| ${REQUIRED_STEP_COLUMNS.join(' | ')} |`
  );

  if (tableStart === -1) {
    throw new Error(
      `missing steps table header: | ${REQUIRED_STEP_COLUMNS.join(' | ')} |`
    );
  }

  const stepRows = [];

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
      stepRows.push(cells);
    }
  }

  return {
    content,
    frontmatter,
    stepRows,
  };
};

const assertArray = (flow, field, file) => {
  if (!Array.isArray(flow.frontmatter[field])) {
    errors.push(`${file}: frontmatter.${field} must be an array`);
  }
};

const ids = new Map();
const testLinks = new Set();

if (!fs.existsSync(flowsPath)) {
  errors.push(`${packPath}: missing flows directory`);
} else {
  const flowFiles = fs
    .readdirSync(flowsPath)
    .filter((file) => file.endsWith('.md'))
    .sort();

  for (const file of flowFiles) {
    const flowPath = path.join(flowsPath, file);

    try {
      const flow = parseFlow(flowPath);
      const { content, frontmatter, stepRows } = flow;

      for (const field of ['id', 'title', 'priority', 'expected_result']) {
        if (!frontmatter[field]) {
          errors.push(`${file}: frontmatter.${field} is required`);
        }
      }

      assertArray(flow, 'platforms', file);
      assertArray(flow, 'requires', file);

      if (/^## How To Find This UI$/m.test(content)) {
        errors.push(
          `${file}: remove ## How To Find This UI; navigation must live in executable steps`
        );
      }

      if (frontmatter.id) {
        if (ids.has(frontmatter.id)) {
          errors.push(
            `${file}: duplicate id ${frontmatter.id} also used by ${ids.get(frontmatter.id)}`
          );
        }

        ids.set(frontmatter.id, file);
      }

      if (!frontmatter.qase || typeof frontmatter.qase !== 'object') {
        errors.push(`${file}: frontmatter.qase block is required`);
      } else {
        for (const field of REQUIRED_QASE_FIELDS) {
          if (!frontmatter.qase[field]) {
            errors.push(`${file}: frontmatter.qase.${field} is required`);
          }
        }
        // qase_id must be present but may be null for not-yet-imported flows.
        if (!('qase_id' in frontmatter.qase)) {
          errors.push(`${file}: frontmatter.qase.qase_id is required`);
        }
      }

      if (stepRows.length === 0) {
        errors.push(
          `${file}: steps table must contain at least one numbered step`
        );
      }

      for (const [index, row] of stepRows.entries()) {
        if (row.length !== REQUIRED_STEP_COLUMNS.length) {
          errors.push(
            `${file}: step ${index + 1} has ${row.length} columns, expected ${REQUIRED_STEP_COLUMNS.length}`
          );
        }

        if (!row[1]) {
          errors.push(`${file}: step ${index + 1} action is required`);
        }

        if (!row[3]) {
          errors.push(`${file}: step ${index + 1} expected result is required`);
        }

        if (
          /navigation\.md/i.test(row[1]) ||
          /^Use\b/i.test(row[1]) ||
          VAGUE_NAVIGATION_PATTERNS.some((pattern) => pattern.test(row[1]))
        ) {
          const hasConcreteNavigation = SELF_CONTAINED_NAVIGATION_PATTERNS.some(
            (pattern) => pattern.test(row[1])
          );

          if (!hasConcreteNavigation) {
            errors.push(
              `${file}: step ${index + 1} must include visually findable navigation in the action text`
            );
          }
        }

        if (
          /Customize and control app/i.test(row[1]) &&
          !/three-dots\/kebab button|left vertical server list/i.test(row[1])
        ) {
          errors.push(
            `${file}: step ${index + 1} uses hidden menu title without a visible anchor`
          );
        }
      }

      for (const link of frontmatter.test_links ?? []) {
        testLinks.add(link);
      }
    } catch (error) {
      errors.push(`${file}: ${error.message}`);
    }
  }
}

if (testLinks.size > 0) {
  if (!fs.existsSync(htmlPath)) {
    errors.push(
      `${packPath}: test_links are declared but test-links.html is missing`
    );
  } else {
    const html = fs.readFileSync(htmlPath, 'utf8');
    const hrefs = new Set(
      [...html.matchAll(/href="([^"]+)"/g)].map((match) => decodeURI(match[1]))
    );

    for (const link of testLinks) {
      if (!hrefs.has(link)) {
        errors.push(
          `${packPath}: test link ${link} is not present in test-links.html`
        );
      }
    }
  }
}

if (errors.length > 0) {
  console.error(errors.map((error) => `- ${error}`).join('\n'));
  process.exit(1);
}

console.log(`Validated ${ids.size} QA flows in ${packPath}`);
