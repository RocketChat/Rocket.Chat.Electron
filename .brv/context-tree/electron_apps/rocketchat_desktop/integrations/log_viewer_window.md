---
title: Log Viewer Window
tags: []
related: [electron_apps/rocketchat_desktop/integrations/ipc_communication_system.md, electron_apps/rocketchat_desktop/integrations/ipc_main_process_implementation.md]
keywords: []
importance: 55
recency: 1
maturity: draft
updateCount: 1
createdAt: '2026-04-04T18:16:12.526Z'
updatedAt: '2026-04-04T18:44:24.512Z'
---
## Raw Concept
**Task:**
Implement Log Viewer window for displaying and managing application logs

**Changes:**
- Log Viewer opens as centered BrowserWindow
- Supports file selection and custom log file viewing
- Implements secure file access validation
- Provides log tailing with streaming for large files
- Exports logs as ZIP archives

**Files:**
- src/public/log-viewer-window.html
- src/logViewerWindow/ipc.ts
- src/logViewerWindow/constants.ts

**Flow:**
User opens Log Viewer -> Window centered on screen -> Load log file (default or selected) -> Display with tailing updates -> Export/Clear logs

**Timestamp:** 2026-04-04

**Patterns:**
- `^\[([^\]]+)\]\s+\[([^\]]+)\]` - Log entry format: [timestamp] [level] message
- `^Bearer\s+[A-Za-z0-9-._~+/]+=*$` - Validates Bearer token format in Authorization header

## Narrative
### Structure
Log Viewer consists of: (1) HTML template in src/public/log-viewer-window.html that mounts React app, (2) IPC handlers in src/logViewerWindow/ipc.ts that manage file operations and window lifecycle, (3) Window is opened via openLogViewerWindow() which centers it on the nearest screen display.

### Dependencies
Requires Electron BrowserWindow API, fs module for file I/O, archiver for ZIP compression, i18next for internationalization. Log file path managed via app.getPath("logs"). Server information retrieved from Redux store state.servers.

### Highlights
Security features: path traversal validation, absolute path requirement, .log/.txt extension filtering, allowedLogPaths Set for access control. Performance: streaming file reads from byte offset for efficient log tailing. User features: file selection dialog, last N entries filtering, log export as ZIP, clear with confirmation dialog.

### Rules
Rule 1: Only absolute paths allowed for log files
Rule 2: Only .log and .txt file extensions permitted
Rule 3: Path traversal (..) not allowed
Rule 4: Log files must be selected via file dialog before custom paths can be accessed
Rule 5: Default log path (main.log) is always accessible without prior selection

### Examples
Example log entry format: [2026-04-04T10:30:45.123Z] [INFO] Application started
Example IPC call: ipcRenderer.invoke("log-viewer-window/read-logs", {limit: 100})
Example file save: Logs exported as ZIP with compression level 9

## Facts
- **log_viewer_window_type**: Log Viewer is opened as a separate BrowserWindow using logViewerWindow.loadFile() [project]
- **log_viewer_html_path**: HTML template loaded from app/log-viewer-window.html at runtime [project]
- **log_viewer_stylesheets**: Log Viewer uses CSS from main.css and icons/rocketchat.css (Fuselage icon font) [project]
- **window_positioning**: Window is centered on screen using getDisplayNearestPoint and screen work area calculations [project]
- **window_size_multiplier**: Window size is calculated as 60% of screen work area (WINDOW_SIZE_MULTIPLIER = 0.6) [project]
- **security_config**: Log Viewer has nodeIntegration: true and contextIsolation: false in webPreferences [project]
- **ipc_channel_prefix**: IPC channels are prefixed with 'log-viewer-window/' for file operations [project]
- **log_entry_regex**: Log entries are parsed using regex pattern /^\[([^\]]+)\]\s+\[([^\]]+)\]/ to identify entry boundaries [project]
- **security_file_access**: Allowed log paths are stored in a Set to prevent unauthorized file access [project]
- **log_file_validation**: Log file validation checks for path traversal, absolute paths only, and .log/.txt extensions [project]
- **default_log_path**: Default log file location is app.getPath('logs')/main.log [project]
- **log_reading_strategy**: Log tail reading uses streaming from a specified byte offset to handle large files [project]
- **log_export_format**: Logs can be saved as ZIP files with archiver library (compression level 9) [project]
- **server_mapping_source**: Server mapping is retrieved from Redux store state.servers for hostname resolution in logs [project]
