import { gte, coerce } from 'semver';

/**
 * Checks if a version meets or exceeds a minimum required version
 * Safely handles various version string formats by normalizing with semver.coerce
 *
 * @param version The version to check
 * @param minimumVersion The minimum version required
 * @returns boolean Whether the version meets or exceeds the minimum required version
 */
export function meetsMinimumVersion(
  version: string | undefined,
  minimumVersion: string
): boolean {
  if (!version) return false;

  // Coerce version to a valid semver format and use its normalized form
  const normalizedVersion = coerce(version)?.version || '0.0.0';

  return gte(normalizedVersion, minimumVersion);
}
