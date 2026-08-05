// Evaluate a JS expression inside a running app webview via CDP.
// The app must be launched with --remote-debugging-port=9222.
//
// Usage: node cdp-eval.mjs <targetUrlSubstring> <expression>
// Example:
//   node cdp-eval.mjs open.rocket.chat "typeof window.require"
const [, , urlPart, expression] = process.argv;

if (!urlPart || !expression) {
  console.error('usage: node cdp-eval.mjs <targetUrlSubstring> <expression>');
  process.exit(1);
}

const targets = await fetch('http://127.0.0.1:9222/json').then((r) =>
  r.json()
);
const target = targets.find(
  (t) => t.type === 'webview' && t.url.includes(urlPart)
);
if (!target) {
  console.error(
    'target not found; available:',
    targets.map((t) => `${t.type}:${t.url.slice(0, 60)}`)
  );
  process.exit(1);
}

const ws = new WebSocket(target.webSocketDebuggerUrl);
const result = await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('timeout')), 15000);
  ws.onopen = () => {
    ws.send(
      JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: { expression, returnByValue: true, awaitPromise: true },
      })
    );
  };
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id === 1) {
      clearTimeout(timer);
      resolve(msg.result);
    }
  };
  ws.onerror = (e) => {
    clearTimeout(timer);
    reject(new Error(`ws error: ${e.message}`));
  };
});
ws.close();
console.log(JSON.stringify(result, null, 2));
