// Evaluates a JavaScript expression in a child frame (iframe) of a webview
// target. A cross-origin iframe inside a webview can share the webview's
// process. Then it is not in /json/list, and Target.setAutoAttach does not
// show it. This script finds the frame with Page.getFrameTree.
//
// Usage:
//   node cdp-frame.mjs <webview-url-substring> <frame-url-substring> -e '<expression>' [--main]
//
// Default context: an isolated world on the frame (DOM access, postMessage).
// --main: the frame's own main world (page globals).
// Environment: CDP_PORT (default 9222).
const port = process.env.CDP_PORT ?? '9222';
const [hostMatch, frameMatch, , expr, flag] = process.argv.slice(2);

const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const host = targets.find((t) => t.type === 'webview' && t.url.includes(hostMatch));
if (!host) {
  console.log('NO WEBVIEW TARGET');
  process.exit(1);
}

const ws = new WebSocket(host.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.onopen = resolve;
  ws.onerror = reject;
});

let nextId = 0;
const pending = new Map();
const contexts = [];
ws.onmessage = (m) => {
  const data = JSON.parse(m.data);
  if (data.method === 'Runtime.executionContextCreated') {
    contexts.push(data.params.context);
  }
  if (data.id && pending.has(data.id)) {
    pending.get(data.id)(data);
    pending.delete(data.id);
  }
};
const send = (method, params = {}) =>
  new Promise((resolve) => {
    nextId += 1;
    pending.set(nextId, resolve);
    ws.send(JSON.stringify({ id: nextId, method, params }));
  });

const frames = [];
const walk = (node) => {
  frames.push(node.frame);
  (node.childFrames ?? []).forEach(walk);
};
walk((await send('Page.getFrameTree')).result.frameTree);

const frame = frames.find((f) => f.url.includes(frameMatch));
if (!frame) {
  console.log('NO FRAME. Frames:');
  frames.forEach((f) => console.log(`  ${f.url.slice(0, 120)}`));
  ws.close();
  process.exit(1);
}

let contextId;
if (flag === '--main') {
  await send('Runtime.enable');
  await new Promise((resolve) => setTimeout(resolve, 500));
  contextId = contexts.find(
    (c) => c.auxData?.frameId === frame.id && c.auxData?.isDefault
  )?.id;
} else {
  const world = await send('Page.createIsolatedWorld', {
    frameId: frame.id,
    worldName: 'dev-app-verify',
  });
  contextId = world.result?.executionContextId;
}
if (!contextId) {
  console.log('NO EXECUTION CONTEXT');
  ws.close();
  process.exit(1);
}

const reply = await send('Runtime.evaluate', {
  expression: expr,
  awaitPromise: true,
  returnByValue: true,
  contextId,
});
const result = reply.result;
if (result?.exceptionDetails) {
  console.log(`EXC ${JSON.stringify(result.exceptionDetails).slice(0, 500)}`);
  process.exitCode = 1;
} else {
  const value = result?.result;
  console.log(JSON.stringify(value?.value ?? value?.description ?? value, null, 1));
}
ws.close();
