// The state file of the harness: the credentials that it generated and the
// test world of each server. The file holds passwords, so it is written with
// mode 0600 and the harness never prints its secrets.
//
// Usage:
//   node state.mjs init                 makes the credentials when missing
//   node state.mjs get <dotted.path>    prints one value (for example admin.username)
//   node state.mjs forget-world <port>  drops every test world of the server on that port
//
// Other scripts import `readState`, `writeState`, `ensureCredentials`,
// `usersOf` and `worldKey`.
//
// A named world (for example `win` for the Windows test) has its own users
// in `worldUsers.<name>` and its own entry `worlds.<port>-<name>`. The default
// world keeps `users` and `worlds.<port>`.

import { randomBytes } from 'node:crypto';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const harnessDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(harnessDir, '..', '..');

export const stateDir = () =>
  process.env.HARNESS_STATE_DIR ??
  join(repoRoot, '.localdev', 'e2ee-search-harness');

export const stateFile = () =>
  process.env.STATE_FILE ?? join(stateDir(), 'state.json');

export const readState = () => {
  const file = stateFile();
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
};

export const writeState = (state) => {
  const file = stateFile();
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
  chmodSync(file, 0o600);
};

// A password with upper and lower case letters, digits and a symbol, so it
// passes the default password policy of the server.
const newPassword = () => `Hx-${randomBytes(12).toString('base64url')}-9a!`;

const userTemplate = (username) => ({
  username,
  email: `${username}@harness.invalid`,
  name: username,
});

// The key of a world in `worlds`: the port for the default world, and
// `<port>-<name>` for a named world.
export const worldKey = (port, world = '') =>
  world ? `${port}-${world}` : String(port);

// The users A and B of a world.
export const usersOf = (state, world = '') =>
  world ? state.worldUsers?.[world] : state.users;

export const ensureCredentials = (world = '') => {
  const state = readState();
  state.admin ??= { ...userTemplate('harnessadmin'), password: newPassword() };
  if (world) {
    state.worldUsers ??= {};
    const users = (state.worldUsers[world] ??= {});
    users.a ??= {
      ...userTemplate(`${world}harnessa`),
      password: newPassword(),
    };
    users.b ??= {
      ...userTemplate(`${world}harnessb`),
      password: newPassword(),
    };
    writeState(state);
    return state;
  }
  state.users ??= {};
  state.users.a ??= {
    ...userTemplate('harnessalice'),
    password: newPassword(),
  };
  state.users.b ??= { ...userTemplate('harnessbob'), password: newPassword() };
  writeState(state);
  return state;
};

const getPath = (object, path) =>
  path
    .split('.')
    .reduce((value, key) => (value == null ? undefined : value[key]), object);

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [, , command, path] = process.argv;
  if (command === 'init') {
    ensureCredentials();
  } else if (command === 'forget-world' && path) {
    // After a database reset, the ids of every world on that server are
    // gone: the default world and each named world.
    const state = readState();
    for (const key of Object.keys(state.worlds ?? {})) {
      if (key === path || key.startsWith(`${path}-`)) delete state.worlds[key];
    }
    writeState(state);
  } else if (command === 'get' && path) {
    const value = getPath(readState(), path);
    if (value === undefined) process.exit(1);
    console.log(typeof value === 'string' ? value : JSON.stringify(value));
  } else {
    console.error('usage: node state.mjs init | get <dotted.path>');
    process.exit(2);
  }
}
