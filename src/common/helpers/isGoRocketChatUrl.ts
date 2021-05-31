export const isGoRocketChatUrl = (url: URL): boolean =>
  url.protocol === 'https:' && url.hostname === 'go.rocket.chat';
