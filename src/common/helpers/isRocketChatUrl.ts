export const isRocketChatUrl = (url: URL): boolean =>
  url.protocol === 'rocketchat:';
