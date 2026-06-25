export type Dictionary = {
  [lng: string]: Record<string, string>;
};

export type Message = {
  remainingDays: number;
  title: string;
  subtitle: string;
  description: string;
  type: 'primary' | 'warning' | 'danger';
  /**
   * Roles allowed to see this message. When omitted (or empty), the message is
   * shown to every user. When present, the message is only shown to users whose
   * roles intersect this list (e.g. `["admin"]` targets workspace admins only).
   * Clients that predate this field ignore it and keep showing the message to
   * everyone, so the field is backward compatible.
   */
  roles?: string[];
  params: Record<string, unknown> & {
    instance_version?: string;
    instance_email?: string;
    instanceDomain?: string;
    remaining_days?: number;
  };
  link: string;
};

export type MessageTranslated = {
  title?: string;
  subtitle?: string;
  description?: string;
  link?: string;
};

export type Version = {
  version: string;
  expiration: Date;
  messages?: Message[];
};

export type SupportedVersions = {
  enforcementStartDate: string;
  timestamp: string;
  messages?: Message[];
  versions: Version[];
  exceptions?: {
    domain: string;
    uniqueId: string;
    messages?: Message[];
    versions: Version[];
  };
  i18n?: Dictionary;
};

export type ServerInfo = {
  version: string;
  uniqueId: string;
  build: {
    date: string;
    nodeVersion: string;
    arch: string;
    platform: string;
    osRelease: string;
    totalMemory: number;
    freeMemory: number;
    cpus: number;
  };
  marketplaceApiVersion: string;
  commit: {
    hash: string;
    date: Date;
    author: string;
    subject: string;
    tag: string;
    branch: string;
  };
  success: boolean;
  supportedVersions?: {
    signed: string;
  };
  minimumClientVersions?: {
    desktop: string;
    mobile: string;
  };
};

export type CloudInfo = {
  enforcementStartDate: string;
  signed: string;
  timestamp: string;
  messages?: Message[];
  versions: Version[];
  exceptions?: {
    domain: string;
    uniqueId: string;
    messages?: Message[];
    versions: Version[];
  };
};
