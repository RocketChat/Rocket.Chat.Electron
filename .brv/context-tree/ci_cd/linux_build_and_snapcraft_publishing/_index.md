---
children_hash: f9e5daf66cc8281d2c531e76a1408ec6553eac2da63caaa4ccc47dd779ba0ae6
compression_ratio: 0.9939024390243902
condensation_order: 1
covers: [linux_build_and_snapcraft_publishing.md]
covers_token_total: 328
summary_level: d1
token_count: 326
type: summary
---
# Linux Build and Snapcraft Publishing

## Overview
Linux build pipeline implementing multi-format packaging and cumulative Snapcraft channel promotion via three core functions in `workspaces/desktop-release-action/src/linux.ts`.

## Build Pipeline Flow
**setupSnapcraft** → **packOnLinux** → **uploadSnap**

## Key Components

### setupSnapcraft
- Installs snapcraft CLI via snap with stable channel
- Prerequisite for snap packaging operations

### packOnLinux
- Builds multiple distribution formats using electron-builder:
  - tar.gz (archive)
  - deb (Debian package)
  - rpm (RedHat package)
  - snap (Snapcraft package)
  - AppImage (portable executable)

### uploadSnap
- Publishes snaps to Snapcraft channels using cumulative promotion strategy
- Channel selection logic:
  - Development builds → edge channel
  - Tagged releases → channel derived from semver prerelease identifier
- Promotion behavior: uploads to ALL channels from edge up to target level (cumulative)

## Dependencies
- snapcraft CLI (installed via snap)
- electron-builder (packaging engine)
- @actions/core (GitHub Actions logging/grouping)

## Key Architectural Decision
Cumulative channel promotion ensures snaps propagate through the release pipeline systematically, with edge serving as the entry point for all releases.