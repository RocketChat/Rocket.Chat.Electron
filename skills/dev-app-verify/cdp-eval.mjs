// Evaluates a JavaScript expression in one CDP target of a packaged
// Rocket.Chat Desktop app started with --remote-debugging-port.
//
// Usage:
//   node cdp-eval.mjs --list
//   node cdp-eval.mjs <url-substring|target-id> -e '<expression>' [--type webview|page]
//   node cdp-eval.mjs <url-substring|target-id> <file.js> [--type webview|page]
//
// Environment: CDP_PORT (default 9222).
// The expression runs with awaitPromise and returnByValue. The script prints
// the JSON value, or "EXC" and the exception details.
import fs from 'node:fs';

const port = process.env.CDP_PORT ?? '9222';
const args = process.argv.slice(2);
const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();

if (args[0] === '--list') {
  for (const t of targets) {
    console.log(`${t.type} | ${t.url.slice(0, 120)} | ${t.id}`);
  }
  process.exit(0);
}

const [match, exprOrFile, maybeExpr] = args;
const expr = exprOrFile === '-e' ? maybeExpr : fs.readFileSync(exprOrFile, 'utf8');
const typeIndex = args.indexOf('--type');
const wantType = typeIndex >= 0 ? args[typeIndex + 1] : null;

const target = targets.find(
  (t) =>
    (t.id === match || t.url.includes(match)) &&
    (!wantType || t.type === wantType)
);
if (!target) {
  console.log('NO TARGET. Run with --list.');
  process.exit(1);
}

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.onopen = resolve;
  ws.onerror = reject;
});
ws.send(
  JSON.stringify({
    id: 1,
    method: 'Runtime.evaluate',
    params: { expression: expr, awaitPromise: true, returnByValue: true },
  })
);
const reply = await new Promise((resolve) => {
  ws.onmessage = (m) => {
    const data = JSON.parse(m.data);
    if (data.id === 1) resolve(data);
  };
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
