// Checks that key.bin is wrapped by the DPAPI-protected key of the Chromium
// profile (Electron safeStorage on Windows). Runs on the Windows host.
//
//   node keycheck.mjs <profile folder> <key.bin path>
//
// It reads the os_crypt key from "Local State", removes its DPAPI protection
// for the current user, and opens key.bin with it (AES-256-GCM, "v10"
// prefix, 12-byte nonce, 16-byte tag). The plaintext must start with the
// wrapped-key prefix "kw1.", and key.bin itself must not hold that prefix.
// It prints one JSON line with booleans and lengths only, never key material.

import { execFileSync } from 'node:child_process';
import { createDecipheriv } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const [profile, keyFile] = process.argv.slice(2);
const result = {};
try {
  const localState = JSON.parse(
    readFileSync(join(profile, 'Local State'), 'utf8')
  );
  const encrypted = Buffer.from(localState.os_crypt.encrypted_key, 'base64');
  result.localStateKeyPrefix = encrypted.subarray(0, 5).toString('latin1');
  const blob = encrypted.subarray(5).toString('base64');
  const command =
    'Add-Type -AssemblyName System.Security; ' +
    '[Convert]::ToBase64String([Security.Cryptography.ProtectedData]::Unprotect(' +
    `[Convert]::FromBase64String('${blob}'), $null, 'CurrentUser'))`;
  const aesKey = Buffer.from(
    execFileSync('powershell', ['-NoProfile', '-Command', command])
      .toString()
      .trim(),
    'base64'
  );
  result.dpapiUnprotectOk = aesKey.length === 32;

  const wrapped = readFileSync(keyFile);
  result.keyBinBytes = wrapped.length;
  result.keyBinPrefix = wrapped.subarray(0, 3).toString('latin1');
  result.keyBinHoldsPlainKw1 = wrapped.includes(Buffer.from('kw1.'));
  const nonce = wrapped.subarray(3, 15);
  const tag = wrapped.subarray(wrapped.length - 16);
  const body = wrapped.subarray(15, wrapped.length - 16);
  const decipher = createDecipheriv('aes-256-gcm', aesKey, nonce);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(body), decipher.final()]);
  result.gcmAuthOk = true;
  result.plainStartsWithKw1 =
    plain.subarray(0, 4).toString('latin1') === 'kw1.';
} catch (error) {
  result.gcmAuthOk ??= false;
  result.error = String(error?.message ?? error);
}
console.log(JSON.stringify(result));
