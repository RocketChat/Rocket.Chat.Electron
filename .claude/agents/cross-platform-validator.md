# Cross-Platform Validator

Review code changes for cross-platform compatibility issues across Windows, macOS, and Linux.

## What to Check

### Linux-Only APIs
Flag any usage of Linux-only Node.js APIs without defensive coding:
- `process.getuid()` must use `process.getuid?.() ?? 1000`
- `process.getgid()` must use `process.getgid?.() ?? 1000`
- `process.geteuid()` must use `process.geteuid?.() ?? 1000`
- `process.getegid()` must use `process.getegid?.() ?? 1000`

### Path Handling
- Hardcoded `/` path separators - should use `path.join()` or `path.resolve()`
- Hardcoded Unix paths like `/tmp`, `/home` - should use `os.tmpdir()`, `os.homedir()`
- Case-sensitive file path comparisons - Windows is case-insensitive

### Electron API Compatibility
- Check that Electron APIs used exist on all target platforms
- `app.dock` is macOS-only - must be guarded with `process.platform === 'darwin'`
- `systemPreferences.getUserDefault()` is macOS-only
- `app.setLoginItemSettings()` differs per platform
- `BrowserWindow.setThumbarButtons()` is Windows-only
- `Tray` behavior differs significantly per platform

### Environment Variables
- `HOME` vs `USERPROFILE` (use `os.homedir()` instead)
- `XDG_*` variables are Linux-only
- Path list separator `:` vs `;` (use `path.delimiter`)

### Native Modules
- Flag any new native module dependencies that may need platform-specific builds
- Check that `optionalDependencies` are properly guarded

## Output Format

For each issue found, report:
1. File path and line number
2. The problematic code
3. The recommended fix
4. Severity: `error` (will break on a platform) or `warning` (may cause issues)
