// A small Chrome DevTools Protocol client for the packaged app.
//
// The app runs with --remote-debugging-port, so every webview and the root
// window are CDP targets. The harness drives the app only through CDP:
// mouse and key events go to the page, never to the operating system, so the
// test never takes the mouse or the focus.

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const listTargets = async (port) => {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/json`, {
      signal: AbortSignal.timeout(3000),
    });
    return await response.json();
  } catch {
    return [];
  }
};

// Waits until a target matches. Returns undefined after the timeout.
export const findTarget = async (port, predicate, timeoutMs = 60_000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const target = (await listTargets(port)).find(predicate);
    if (target) return target;
    await sleep(1000);
  }
  return undefined;
};

export const isServerWebview = (host) => (target) =>
  target.type === 'webview' && target.url.includes(host);

// The root window loads the app's index.html from the app bundle.
export const isRootWindow = (target) =>
  target.type === 'page' &&
  target.url.startsWith('file:') &&
  target.url.includes('index.html');

// Writes a value as a JavaScript literal for an expression that runs in the
// page. JSON.stringify alone leaves <, >, / and the line separators as they
// are.
export const jsLiteral = (value) =>
  JSON.stringify(value).replace(
    /[<>/\u2028\u2029]/g,
    (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`
  );

const REQUEST_TIMEOUT_MS = 60_000;

export const connect = async (target) => {
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });
  let seq = 0;
  const pending = new Map();
  ws.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    const resolve = pending.get(message.id);
    if (typeof resolve !== 'function') return;
    pending.delete(message.id);
    resolve(message);
  });

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      seq += 1;
      const id = seq;
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`${method} timed out`));
      }, REQUEST_TIMEOUT_MS);
      pending.set(id, (message) => {
        clearTimeout(timer);
        resolve(message);
      });
      ws.send(JSON.stringify({ id, method, params }));
    });

  // Runs an expression in the page and returns its value. A thrown error in
  // the page becomes a rejected promise here.
  const evaluate = async (expression) => {
    const response = await send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    const details = response.result?.exceptionDetails;
    if (response.error || details) {
      throw new Error(
        String(
          response.error?.message ??
            details.exception?.description ??
            details.text
        )
      );
    }
    return response.result.result.value;
  };

  // Polls an expression until it is truthy. Returns the last value.
  const waitFor = async (expression, timeoutMs = 30_000, intervalMs = 500) => {
    const deadline = Date.now() + timeoutMs;
    let value;
    while (Date.now() < deadline) {
      value = await evaluate(expression).catch(() => undefined);
      if (value) return value;
      await sleep(intervalMs);
    }
    return value;
  };

  // Clicks the center of an element with CDP mouse events. React Aria menus
  // and toggles ignore element.click(), but they take these events.
  const click = async (elementExpression) => {
    const box = await evaluate(`(() => {
      const element = (${elementExpression});
      if (!element) return null;
      element.scrollIntoView({ block: 'center' });
      const rect = element.getBoundingClientRect();
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    })()`);
    if (!box) return false;
    for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) {
      await send('Input.dispatchMouseEvent', {
        type,
        x: box.x,
        y: box.y,
        button: 'left',
        clickCount: type === 'mouseMoved' ? 0 : 1,
      });
      await sleep(80);
    }
    return true;
  };

  const pressKey = async (key, code, keyCode) => {
    await send('Input.dispatchKeyEvent', {
      type: 'keyDown',
      key,
      code,
      windowsVirtualKeyCode: keyCode,
    });
    await send('Input.dispatchKeyEvent', {
      type: 'keyUp',
      key,
      code,
      windowsVirtualKeyCode: keyCode,
    });
  };

  // Focuses an element, selects its text, and types the new text over it.
  const type = async (elementExpression, text, { enter = false } = {}) => {
    const focused = await evaluate(`(() => {
      const element = (${elementExpression});
      if (!element) return false;
      element.focus();
      element.select?.();
      return document.activeElement === element;
    })()`);
    if (!focused) return false;
    await send('Input.insertText', { text });
    await sleep(300);
    if (enter) await pressKey('Enter', 'Enter', 13);
    return true;
  };

  // A PNG of one element only, so the capture holds no other page content.
  const screenshotElement = async (elementExpression, maxHeight = 720) => {
    const clip = await evaluate(`(() => {
      const element = (${elementExpression});
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: Math.min(rect.height, ${maxHeight}) };
    })()`);
    if (!clip) return undefined;
    const response = await send('Page.captureScreenshot', {
      format: 'png',
      clip: { ...clip, scale: 1 },
    });
    return Buffer.from(response.result.data, 'base64');
  };

  const close = () => ws.close();

  return {
    send,
    evaluate,
    waitFor,
    click,
    type,
    pressKey,
    screenshotElement,
    close,
  };
};
