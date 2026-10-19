// The web client's window CustomEvents that the desktop app reads instead of
// the webapp's internal modules. They fire in the Meteor build and in the Vite
// build, and a preload (isolated world) receives them with their `detail`.
export const SIGNAL_EVENTS = [
  'startup',
  'unread-changed',
  'unread-changed-by-subscription',
  'status-changed',
  'Custom_Script_Logged_In',
  'Custom_Script_Logged_Out',
  'Custom_Script_On_Logout',
  'notification',
] as const;

export type SignalEvent = (typeof SIGNAL_EVENTS)[number];

export type World = 'main' | 'isolated';

export type RecordedEvent = {
  t: number;
  name: string;
  detail: string;
};

export type PhaseName =
  | 'logged-out boot'
  | 'logged-in boot'
  | 'incoming message'
  | 'external status change'
  | 'forced logout';

export type PhaseRecord = {
  phase: PhaseName;
  events: Record<World, RecordedEvent[]>;
};

export type Expectation = {
  name: SignalEvent;
  detail?: RegExp;
};

// The contract the desktop depends on. `Custom_Script_On_Logout` is left out
// on purpose: the Meteor build does not fire it on a forced logout.
export const PHASE_EXPECTATIONS: Record<PhaseName, Expectation[]> = {
  'logged-out boot': [
    { name: 'startup', detail: /^boolean:true$/ },
    { name: 'Custom_Script_Logged_Out' },
  ],
  'logged-in boot': [
    { name: 'startup', detail: /^boolean:true$/ },
    { name: 'Custom_Script_Logged_In' },
    { name: 'status-changed', detail: /^string:/ },
    { name: 'unread-changed', detail: /^number:\d+$/ },
  ],
  'incoming message': [
    { name: 'unread-changed-by-subscription', detail: /^object:/ },
    { name: 'unread-changed', detail: /^number:\d+$/ },
    { name: 'notification', detail: /^object:/ },
  ],
  'external status change': [
    { name: 'status-changed', detail: /^string:busy$/ },
  ],
  'forced logout': [{ name: 'Custom_Script_Logged_Out' }],
};

// Serializes a CustomEvent detail the same way in both worlds, so the report
// can compare what the page world and the isolated world received.
export const describeDetail = (detail: unknown): string => {
  if (detail === null) return 'null';
  if (detail === undefined) return 'undefined';
  if (typeof detail !== 'object') {
    return `${typeof detail}:${String(detail).slice(0, 80)}`;
  }
  try {
    return `object:${JSON.stringify(detail).slice(0, 160)}`;
  } catch {
    return 'object:<unserializable>';
  }
};

// Runs at document start in each world. A string, so the TypeScript compiler
// cannot add helpers that do not exist in the page.
export const buildRecorderSource = (world: World): string => `(() => {
  const t0 = performance.now();
  const log = [];
  const describe = ${describeDetail.toString()};
  for (const name of ${JSON.stringify(SIGNAL_EVENTS)}) {
    window.addEventListener(name, (event) => {
      log.push({ t: Math.round(performance.now() - t0), name, detail: describe(event.detail) });
      if (document.documentElement) {
        document.documentElement.dataset[${JSON.stringify(
          `signals_${world}`
        )}] = JSON.stringify(log);
      }
    });
  }
})();`;

export const datasetKey = (world: World): string => `signals_${world}`;

// Paths the Rocket.Chat server answers itself. Mirrors `serverRoutes` in
// src/ui/main/serverView/uiOverride.ts and apps/meteor/vite/vite.config.mts.
export const SERVER_ROUTES = [
  '/api',
  '/_oauth',
  '/_saml',
  '/_cas',
  '/_accounts',
  '/_timesync',
  '/i18n',
  '/avatar',
  '/emoji-custom',
  '/custom-sounds',
  '/file-upload',
  '/file-decrypt',
  '/ufs',
  '/data-export',
  '/assets',
  '/livechat',
  '/theme.css',
  '/robots.txt',
  '/css-theme',
  '/scripts_',
  '/websocket',
  '/sockjs',
];

export const BUNDLE_ASSETS_PATH = '/bundle/';

export type Route = 'server' | 'bundle' | 'index';

// Same decision as the desktop UI preview (`uiOverride.ts`): bundle assets
// come from the Vite bundle, a document request outside the server routes
// gets the bundle's index.html, and everything else goes to the server.
export const routeRequest = ({
  url,
  serverOrigin,
  method,
  isDocument,
}: {
  url: URL;
  serverOrigin: string;
  method: string;
  isDocument: boolean;
}): Route => {
  if (url.origin !== serverOrigin || method !== 'GET') return 'server';
  if (url.pathname.startsWith(BUNDLE_ASSETS_PATH)) return 'bundle';
  if (!isDocument) return 'server';
  if (SERVER_ROUTES.some((route) => url.pathname.startsWith(route))) {
    return 'server';
  }
  return 'index';
};

// The Meteor server injects the runtime config into its HTML; the static
// bundle's index.html has none. Mirrors `prepareIndexHtml` in uiOverride.ts.
export const prepareIndexHtml = (html: string, serverUrl: string): string => {
  const { origin, pathname } = new URL(
    serverUrl.endsWith('/') ? serverUrl : `${serverUrl}/`
  );
  const runtimeConfig = JSON.stringify({
    ROOT_URL: origin + pathname,
    ROOT_URL_PATH_PREFIX: pathname.replace(/\/$/, ''),
  });
  return html
    .replace(/<base href="[^"]*"\s*\/?>/, `<base href="${pathname}" />`)
    .replace(
      '<head>',
      `<head><script>window.__meteor_runtime_config__ = ${runtimeConfig};</script>`
    );
};

export type Failure = {
  phase: PhaseName;
  world: World;
  event: SignalEvent;
  reason: string;
};

export const evaluatePhase = ({ phase, events }: PhaseRecord): Failure[] =>
  PHASE_EXPECTATIONS[phase].flatMap((expectation) =>
    (['main', 'isolated'] as const).flatMap((world): Failure[] => {
      const matches = events[world].filter(
        (event) => event.name === expectation.name
      );
      if (matches.length === 0) {
        return [
          { phase, world, event: expectation.name, reason: 'not received' },
        ];
      }
      const { detail } = expectation;
      if (detail && !matches.some((event) => detail.test(event.detail))) {
        return [
          {
            phase,
            world,
            event: expectation.name,
            reason: `detail ${matches
              .map((event) => event.detail.slice(0, 40))
              .join(', ')} does not match ${detail}`,
          },
        ];
      }
      return [];
    })
  );

// The unread count must grow when a new message arrives.
export const evaluateUnreadGrowth = (
  before: RecordedEvent[],
  after: RecordedEvent[]
): Failure[] => {
  const lastCount = (events: RecordedEvent[]) => {
    const counts = events
      .filter((event) => event.name === 'unread-changed')
      .map((event) => Number(event.detail.replace(/^number:/, '')))
      .filter(Number.isFinite);
    return counts.length ? counts[counts.length - 1] : undefined;
  };
  const previous = lastCount(before);
  const next = lastCount(after);
  if (previous === undefined || next === undefined || next > previous) {
    return [];
  }
  return [
    {
      phase: 'incoming message',
      world: 'main',
      event: 'unread-changed',
      reason: `count did not grow (${previous} → ${next})`,
    },
  ];
};
