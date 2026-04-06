# Topic: desktop_release_action

## Overview
Covers the GitHub Actions workflow that builds and releases the Rocket.Chat Electron application. Handles platform-specific packaging, asset management, and multi-channel publishing.

## Key Concepts
- Release types (development, snapshot, tagged)
- Multi-platform packaging (Linux, macOS, Windows)
- GitHub release asset management
- Snap package publishing with channels
- Asset cleanup and limit management
- Branch-based release triggering

## Related Topics
- ci_cd/github_release_management - GitHub release asset operations
- ci_cd/linux_build_and_snapcraft_publishing - Linux-specific build and snap publishing
- ci_cd/macos_build_signing - macOS-specific build and code signing
- ci_cd/windows_signing - Windows-specific signing and packaging
