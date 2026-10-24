#!/usr/bin/env node
// PreToolUse hook for the GitNexus MCP tools.
//
// The GitNexus MCP server resolves `repo` from the directory it was started
// in, and `detect_changes` diffs that directory. In a linked worktree this
// fails in two ways: a session started inside the worktree gets "Multiple
// repositories indexed", and a session started in the main checkout diffs
// the main checkout and misses every worktree change. This hook fills in a
// missing `repo` (the main checkout path) and, for `detect_changes`, a
// missing `worktree` (only when `repo` is this project). It never overrides a value that the call already has.
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO_TOOLS = new Set([
  'query',
  'context',
  'impact',
  'detect_changes',
  'cypher',
  'check',
  'rename',
  'explain',
  'pdg_query',
  'route_map',
  'tool_map',
  'shape_check',
  'api_impact',
  'trace',
]);

const readGitPaths = (cwd) => {
  const env = { ...process.env };
  delete env.GIT_DIR;
  delete env.GIT_WORK_TREE;
  delete env.GIT_COMMON_DIR;
  const result = spawnSync(
    'git',
    [
      'rev-parse',
      '--path-format=absolute',
      '--show-toplevel',
      '--git-dir',
      '--git-common-dir',
    ],
    { cwd, env, encoding: 'utf-8', timeout: 3000, windowsHide: true }
  );
  if (result.status !== 0) return null;
  const [toplevel, gitDir, commonDir] = result.stdout.trim().split('\n');
  if (!toplevel || !gitDir || !commonDir) return null;
  return { toplevel, gitDir, commonDir };
};

const scope = (input) => {
  const tool = (input.tool_name || '').replace(/^mcp__gitnexus__/, '');
  const toolInput = input.tool_input || {};
  if (!REPO_TOOLS.has(tool)) return null;
  if (!input.cwd || !path.isAbsolute(input.cwd)) return null;

  const git = readGitPaths(input.cwd);
  if (!git || path.basename(git.commonDir) !== '.git') return null;

  const mainCheckout = path.dirname(git.commonDir);
  const inLinkedWorktree = path.resolve(git.gitDir) !== path.resolve(git.commonDir);
  const added = {};

  if (!toolInput.repo && fs.existsSync(path.join(mainCheckout, '.gitnexus'))) {
    added.repo = mainCheckout;
  }
  const repoIsThisProject =
    !toolInput.repo ||
    path.resolve(toolInput.repo) === mainCheckout ||
    toolInput.repo === path.basename(mainCheckout);
  if (
    tool === 'detect_changes' &&
    !toolInput.worktree &&
    inLinkedWorktree &&
    repoIsThisProject
  ) {
    added.worktree = git.toplevel;
  }
  if (Object.keys(added).length === 0) return null;

  const notes = Object.entries(added).map(([key, value]) => `${key}=${value}`);
  const context = [`GitNexus scope hook added ${notes.join(', ')}.`];
  if (inLinkedWorktree) {
    context.push(
      'The graph index describes the main checkout at its indexed commit, not this worktree. Read the source for symbols that this branch changed.'
    );
  }
  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      updatedInput: { ...toolInput, ...added },
      additionalContext: context.join(' '),
    },
  };
};

let raw = '';
process.stdin.on('data', (chunk) => {
  raw += chunk;
});
process.stdin.on('end', () => {
  try {
    const output = scope(JSON.parse(raw));
    if (output) process.stdout.write(JSON.stringify(output));
  } catch {
    // A hook failure must never block a GitNexus call.
  }
});
