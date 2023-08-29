export const isSupportedServerVersion = (version: string): boolean =>
  versionIsGreaterOrEqualsTo(version, '3.0.0');
}

