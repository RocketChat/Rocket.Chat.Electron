import jwt from 'jsonwebtoken';

import type {
  CloudInfo,
  Dictionary,
  Message,
  SupportedVersions,
  Version,
} from './types';

const privateKey = `-----BEGIN PRIVATE KEY-----
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
-----END PRIVATE KEY-----
`;

export function generateSignedJWT(payload: object) {
  const token = jwt.sign(payload, privateKey, { algorithm: 'RS256' });
  return token;
}

const sampleDictionary: Dictionary = {
  'en': {
    title:
      '{{instance_ws_name}} is running an unsupported version of Rocket.Chat',
    subtitle:
      'Mobile and desktop app access to {{instance_domain}} will be cut off in {{remaining_days}} days.',
    description:
      'User: {{instance_username}}\nEmail: {{instance_email}}\nExtra params: {{test_a}} {{test_b}}',
  },
  'pt-BR': {
    title: 'Versão não suportada do Rocket.Chat',
    subtitle:
      '{{instance_ws_name}} {{instance_domain}} {{remaining_days}} {{instance_username}} {{instance_email}} {{test_a}} {{test_b}}',
  },
};

const sampleMessages: Message[] = [
  {
    remainingDays: 30,
    title: 'title',
    subtitle: 'subtitle',
    description: 'description',
    type: 'primary',
    params: {
      instance_ws_name: 'WorkspaceName',
      instance_username: 'UserName',
      // instance_email: 'Email',
      // instance_domain: 'Domain',
      // remaining_days: 30,
    },
    link: 'http://link.example.com',
  },
  {
    remainingDays: 15,
    title: 'message_token',
    subtitle: 'message_token',
    description: 'message_token',
    type: 'warning',
    params: {
      instance_ws_name: 'WorkspaceName',
      instance_username: 'UserName',
      instance_email: 'Email',
      instance_domain: 'Domain',
      remaining_days: 30,
    },
    link: 'http://link.example.com',
  },
  {
    remainingDays: 7,
    title: 'message_token',
    subtitle: 'message_token',
    description: 'message_token',
    type: 'danger',
    params: {
      instance_ws_name: 'WorkspaceName',
      instance_username: 'UserName',
      instance_email: 'Email',
      instance_domain: 'Domain',
      remaining_days: 30,
    },
    link: 'http://link.example.com',
  },
];

const sampleVersion: Version = {
  version: '6.4.0',
  expiration: new Date('2023-09-31T23:59:59.999Z'),
  messages: sampleMessages,
};

export const sampleServerSupportedVersions: SupportedVersions = {
  timestamp: '2023-09-02T10:24:00.000Z',
  messages: sampleMessages,
  versions: [sampleVersion],
  exceptions: {
    domain: 'open.rocket.chat',
    uniqueId: '1234567890',
    messages: sampleMessages,
    versions: [sampleVersion],
  },
  i18n: sampleDictionary,
};

export const sampleServerInfo = {
  version: '6.4.0',
  success: true,
  supportedVersions: generateSignedJWT(sampleServerSupportedVersions),
  minimumClientVersions: {
    desktop: '3.0.0',
    mobile: '1.5.0',
  },
};

export const sampleCloudInfo: CloudInfo = {
  signed: generateSignedJWT(sampleServerSupportedVersions),
  timestamp: '2023-09-03T10:24:00.000Z',
  messages: sampleMessages,
  versions: [sampleVersion],
  exceptions: {
    domain: 'open.rocket.chat',
    uniqueId: '1234567890',
    messages: sampleMessages,
    versions: [sampleVersion],
  },
};

export const builtinSupportedVersions: SupportedVersions = {
  timestamp: '2023-09-01T10:24:00.000Z',
  messages: sampleMessages,
  versions: [sampleVersion],
  exceptions: {
    domain: 'open.rocket.chat',
    uniqueId: '1234567890',
    messages: sampleMessages,
    versions: [sampleVersion],
  },
  i18n: sampleDictionary,
};

export const builtinSupportedVersionsJWT = generateSignedJWT(
  builtinSupportedVersions
);
