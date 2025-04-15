// This module contains all the urls used in the app

export const rocketchat = {
  site: 'https://rocket.chat',
  subdomain: <T extends string>(subdomain: T) =>
    `https://${subdomain}.rocket.chat` as const,
} as const;

export const open = rocketchat.subdomain('open');

export const supportedVersions = ({
  domain,
  uniqueId,
}: {
  domain: string;
  uniqueId: string;
}): string =>
  `https://releases.rocket.chat/v2/server/supportedVersions?domain=${domain}&uniqueId=${uniqueId}&source=desktop` as const;

export const server = <T extends string>(serverUrl: T) =>
  ({
    uniqueId: `${serverUrl}api/v1/settings.public?_id=uniqueID` as const,
    setting: (id: string) =>
      `${serverUrl}api/v1/settings.public?query={"_id": ${JSON.stringify(
        id
      )}}` as const,
    info: `${serverUrl}api/info` as const,
    calendarEvents: {
      list: `${serverUrl}api/v1/calendar-events.list` as const,
      import: `${serverUrl}api/v1/calendar-events.import` as const,
      update: `${serverUrl}api/v1/calendar-events.update` as const,
      delete: `${serverUrl}api/v1/calendar-events.delete` as const,
    },
  }) as const;

export const docs = {
  index: 'https://docs.rocket.chat/', // TODO: should it be a go link?
  supportedVersions: 'https://go.rocket.chat/i/supported-versions',
  newIssue: 'https://github.com/RocketChat/Rocket.Chat/issues/new', // TODO: should it be a go link?
} as const;
