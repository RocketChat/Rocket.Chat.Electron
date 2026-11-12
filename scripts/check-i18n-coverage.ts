import {
  checkI18nCoverage,
  formatCoverageReport,
  hasCoverageGaps,
} from './i18nCoverage.lib';

// Fails when an English key added since the previous release tag has no
// translation in a locale that the app loads, or when such a locale translates
// a plural key without every plural form of its language. `yarn release:tag` runs the same
// check before it creates a tag. build-release.yml runs this script, so a tag
// pushed by hand gets the check too.
//
// Usage: yarn i18n:check-coverage [--base <ref>] [--head <ref>]
// Set ALLOW_MISSING_TRANSLATIONS=true to report the missing keys and exit 0.

const readOption = (name: string): string | undefined => {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
};

const report = checkI18nCoverage({
  baseRef: readOption('--base'),
  headRef: readOption('--head'),
});

const hasMissingKeys = hasCoverageGaps(report);
const allowMissing = process.env.ALLOW_MISSING_TRANSLATIONS === 'true';

if (!hasMissingKeys) {
  console.log(formatCoverageReport(report));
} else if (allowMissing) {
  console.warn(formatCoverageReport(report));
  console.warn(
    '\nWARNING: continuing because ALLOW_MISSING_TRANSLATIONS is true.'
  );
} else {
  console.error(formatCoverageReport(report));
  process.exit(1);
}
