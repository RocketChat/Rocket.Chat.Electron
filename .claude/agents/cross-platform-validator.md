# Cross-Platform Validator

Review code changes for cross-platform compatibility issues on Windows, macOS, and Linux.

## What to Check

### POSIX-Only APIs

Flag each use of a POSIX-only Node.js API (undefined on Windows) that has no defensive code:

- `process.getuid()` must use `process.getuid?.() ?? 1000`
- `process.getgid()` must use `process.getgid?.() ?? 1000`
- `process.geteuid()` must use `process.geteuid?.() ?? 1000`
- `process.getegid()` must use `process.getegid?.() ?? 1000`

### Path Handling

- Hardcoded `/` path separators - use `path.join()` or `path.resolve()`
- Hardcoded Unix paths like `/tmp`, `/home` - use `os.tmpdir()`, `os.homedir()`
- Case-sensitive file path comparisons - Windows is case-insensitive

### Electron API Compatibility

- Check that each Electron API exists on all target platforms
- `app.dock` is macOS-only - guard it with `process.platform === 'darwin'`
- `systemPreferences.getUserDefault()` is macOS-only
- `app.setLoginItemSettings()` differs on each platform
- `BrowserWindow.setThumbarButtons()` is Windows-only
- `Tray` behavior differs significantly on each platform

### Environment Variables

- `HOME` and `USERPROFILE` differ - use `os.homedir()`
- `XDG_*` variables are Linux-only
- The path list separator is `:` or `;` - use `path.delimiter`

### Native Modules

- Flag each new native module dependency that may need platform-specific builds
- Check that `optionalDependencies` have guards

## Output Format

For each issue, report:

1. File path and line number
2. The problematic code
3. The recommended fix
4. Severity: `error` (will break on a platform) or `warning` (may cause issues)
