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

let targets;
try {
  const response = await fetch('http://127.0.0.1:9222/json', {
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) {
    console.error(`CDP endpoint returned ${response.status}`);
    process.exit(1);
  }
  targets = await response.json();
} catch (error) {
  console.error(
    'CDP endpoint unreachable (is the app running with --remote-debugging-port=9222?):',
    error.message
  );
  process.exit(1);
}

const matches = targets.filter(
  (t) => t.type === 'webview' && t.url.includes(urlPart)
);
if (matches.length !== 1) {
  console.error(
    matches.length === 0
      ? 'target not found; available:'
      : `ambiguous: ${matches.length} webviews match "${urlPart}" — be more specific:`,
    (matches.length === 0 ? targets : matches).map(
      (t) => `${t.type}:${t.url.slice(0, 60)}`
    )
  );
  process.exit(1);
}
const [target] = matches;

const ws = new WebSocket(target.webSocketDebuggerUrl);
try {
  const result = await new Promise((resolve, reject) => {
    let settled = false;
    const settle = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn(value);
    };
    const timer = setTimeout(
      () => settle(reject, new Error('timeout')),
      15000
    );
    ws.onopen = () => {
      try {
        ws.send(
          JSON.stringify({
            id: 1,
            method: 'Runtime.evaluate',
            params: { expression, returnByValue: true, awaitPromise: true },
          })
        );
      } catch (error) {
        settle(reject, error);
      }
    };
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.id === 1) {
          settle(resolve, msg.result);
        }
      } catch (error) {
        settle(reject, error);
      }
    };
    ws.onerror = (e) => settle(reject, new Error(`ws error: ${e.message}`));
    ws.onclose = () =>
      settle(reject, new Error('ws closed before a result arrived'));
  });
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  ws.close();
}
