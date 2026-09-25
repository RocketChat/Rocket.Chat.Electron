import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import { gunzipSync } from 'zlib';

import { app, net } from 'electron';

// Published by Rocket.Chat's `UI Preview Publish` workflow; public, so pulls need no GitHub login.
const registry = 'https://ghcr.io';
const repository = 'rocketchat/rocket.chat-ui-preview';

export const getUiPreviewReference = (tag: string) =>
  `ghcr.io/${repository}:${tag}`;

// ponytail: ustar only (files and directories), which is what the workflow writes with `tar --format=ustar`.
export const extractTar = (tar: Buffer, targetDir: string): void => {
  const root = path.resolve(targetDir);
  fs.mkdirSync(root, { recursive: true });

  for (let offset = 0; offset + 512 <= tar.length; ) {
    const header = tar.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) {
      break;
    }

    const field = (start: number, length: number) =>
      header
        .subarray(start, start + length)
        .toString('utf8')
        .replace(/\0[\s\S]*$/, '');
    const name = field(0, 100);
    const prefix = field(345, 155);
    const size = parseInt(field(124, 12).trim() || '0', 8);
    const type = field(156, 1) || '0';
    const dataStart = offset + 512;
    offset = dataStart + Math.ceil(size / 512) * 512;

    const entryName = prefix ? `${prefix}/${name}` : name;
    const target = path.resolve(root, entryName);
    if (target !== root && !target.startsWith(`${root}${path.sep}`)) {
      throw new Error(`Unsafe path in UI preview bundle: ${entryName}`);
    }

    if (type === '5') {
      fs.mkdirSync(target, { recursive: true });
    } else if (type === '0') {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, tar.subarray(dataStart, dataStart + size));
    }
  }
};

const fetchOk = async (url: string, init?: RequestInit) => {
  const response = await net.fetch(url, init);
  if (!response.ok) {
    throw new Error(`${url} responded ${response.status}`);
  }
  return response;
};

// Resolves to a local directory holding the bundle; each layer digest is extracted once and reused.
export const pullUiPreview = async (tag: string): Promise<string> => {
  const { token } = await (
    await fetchOk(`${registry}/token?scope=repository:${repository}:pull`)
  ).json();
  const headers = { Authorization: `Bearer ${token}` };

  const manifest = await (
    await fetchOk(`${registry}/v2/${repository}/manifests/${tag}`, {
      headers: {
        ...headers,
        Accept: 'application/vnd.oci.image.manifest.v1+json',
      },
    })
  ).json();

  const digest: unknown = manifest.layers?.[0]?.digest;
  if (typeof digest !== 'string' || !/^sha256:[a-f0-9]{64}$/.test(digest)) {
    throw new Error(`${getUiPreviewReference(tag)} has no bundle layer`);
  }
  const hash = digest.slice('sha256:'.length);

  const dir = path.join(app.getPath('userData'), 'ui-previews', hash);
  if (fs.existsSync(path.join(dir, 'index.html'))) {
    return dir;
  }

  const blob = Buffer.from(
    await (
      await fetchOk(`${registry}/v2/${repository}/blobs/${digest}`, {
        headers,
      })
    ).arrayBuffer()
  );
  if (createHash('sha256').update(blob).digest('hex') !== hash) {
    throw new Error(`${getUiPreviewReference(tag)} failed digest check`);
  }

  const partialDir = `${dir}.partial`;
  fs.rmSync(partialDir, { recursive: true, force: true });
  extractTar(gunzipSync(blob), partialDir);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.renameSync(partialDir, dir);

  return dir;
};
