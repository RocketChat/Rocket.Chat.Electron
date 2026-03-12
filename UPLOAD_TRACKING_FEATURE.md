# Upload Tracking & Close Prevention Feature

## 🎯 Feature Description

**Purpose**: Prevent accidental app closure during active file uploads by showing a confirmation dialog.

**Behavior**:
- Tracks active file uploads in real-time
- Shows warning dialog when user tries to close app during upload
- Allows user to cancel close or force quit

## ✅ Implementation

### Files Created

1. **src/uploads/actions.ts** - Redux actions for upload tracking
2. **src/uploads/reducer.ts** - Redux reducer to count active uploads
3. **src/uploads/main.ts** - Main process upload tracking and dialog
4. **src/uploads/preload.ts** - Preload IPC bridge for upload events

### Files Modified

1. **src/ui/main/rootWindow.ts** - Added upload check before window close
2. **src/store/rootReducer.ts** - Added activeUploads reducer
3. **src/main.ts** - Added setupUploadTracking() call
4. **src/servers/preload/api.ts** - Exposed upload tracking API

## 🔧 How It Works

### 1. Upload Tracking Flow

```text
Rocket.Chat Web Client starts upload
         ↓
window.RocketChatDesktop.notifyUploadStarted(id, fileName)
         ↓
Preload (notifyUploadStarted)
         ↓
Redux Action (UPLOAD_STARTED)
         ↓
Main Process (activeUploads.add(id))
```

### 2. Close Prevention Flow

```text
User clicks close button
         ↓
rootWindow 'close' event
         ↓
Check if actually quitting (not hiding/minimizing)
         ↓
checkActiveUploads()
         ↓
activeUploads.size > 0?
         ↓
Show dialog: "Upload in progress. Quit?"
         ↓
User choice: Cancel (stay) or Quit (close)
```

### 3. Upload Completion Flow

```text
Upload finishes/fails
         ↓
window.RocketChatDesktop.notifyUploadFinished(id)
         ↓
Redux Action (UPLOAD_FINISHED)
         ↓
Main Process (activeUploads.delete(id))
```

## 📝 Usage in Rocket.Chat Web Client

### Track Upload Start

```javascript
// In Rocket.Chat web client upload code
function startFileUpload(file) {
  const uploadId = generateUniqueId();
  
  // Notify desktop app
  if (window.RocketChatDesktop) {
    window.RocketChatDesktop.notifyUploadStarted(uploadId, file.name);
  }
  
  // Start upload...
  uploadFile(file, uploadId);
}
```

### Track Upload Completion

```javascript
// On upload success
function onUploadSuccess(uploadId) {
  if (window.RocketChatDesktop) {
    window.RocketChatDesktop.notifyUploadFinished(uploadId);
  }
}

// On upload failure
function onUploadError(uploadId) {
  if (window.RocketChatDesktop) {
    window.RocketChatDesktop.notifyUploadFailed(uploadId);
  }
}
```

### Example Integration

```javascript
// Rocket.Chat upload manager
class UploadManager {
  async uploadFile(file) {
    const uploadId = Math.random().toString(36).slice(2);
    
    try {
      // Notify start
      window.RocketChatDesktop?.notifyUploadStarted(uploadId, file.name);
      
      // Perform upload
      const result = await fetch('/api/upload', {
        method: 'POST',
        body: file
      });
      
      // Notify success
      window.RocketChatDesktop?.notifyUploadFinished(uploadId);
      
      return result;
    } catch (error) {
      // Notify failure
      window.RocketChatDesktop?.notifyUploadFailed(uploadId);
      throw error;
    }
  }
}
```

## 🧪 Testing Instructions

### Manual Testing

1. **Start the app**:
   ```bash
   yarn start
   ```

2. **Test upload tracking**:
   - Login to Rocket.Chat
   - Start uploading a large file
   - Try to close the app
   - **Expected**: Warning dialog appears

3. **Test dialog options**:
   - Click "Cancel" → App stays open, upload continues
   - Click "Quit" → App closes, upload is interrupted

4. **Test without uploads**:
   - Close app when no uploads active
   - **Expected**: App closes normally (no dialog)

### Automated Testing

```typescript
// Test upload counter
describe('Upload Tracking', () => {
  it('should increment counter on upload start', () => {
    dispatch({ type: UPLOAD_STARTED, payload: { id: '1', fileName: 'test.pdf' } });
    expect(select(state => state.activeUploads)).toBe(1);
  });
  
  it('should decrement counter on upload finish', () => {
    dispatch({ type: UPLOAD_STARTED, payload: { id: '1', fileName: 'test.pdf' } });
    dispatch({ type: UPLOAD_FINISHED, payload: { id: '1' } });
    expect(select(state => state.activeUploads)).toBe(0);
  });
  
  it('should show dialog when uploads active', async () => {
    dispatch({ type: UPLOAD_STARTED, payload: { id: '1', fileName: 'test.pdf' } });
    const canClose = await checkActiveUploads();
    expect(canClose).toBe(false); // User clicked Cancel
  });
});
```

## 🎨 Dialog Appearance

```text
┌─────────────────────────────────────────┐
│  ⚠️  Upload in Progress                 │
├─────────────────────────────────────────┤
│                                         │
│  A file upload is currently in          │
│  progress. Are you sure you want        │
│  to quit?                                │
│                                         │
│         [ Cancel ]    [ Quit ]          │
└─────────────────────────────────────────┘
```

- **Type**: Warning
- **Buttons**: Cancel (default), Quit
- **Icon**: Warning triangle
- **Modal**: Yes (blocks other actions)

## 📊 State Management

### Redux State

```typescript
{
  activeUploads: number  // Count of active uploads
}
```

### Actions

```typescript
UPLOAD_STARTED: { id: string, fileName: string }
UPLOAD_FINISHED: { id: string }
UPLOAD_FAILED: { id: string }
```

## 🔒 Edge Cases Handled

1. **Multiple uploads**: Counter tracks all active uploads
2. **Upload failure**: Decrements counter on failure
3. **Counter underflow**: Uses `Math.max(0, count - 1)` to prevent negative
4. **App crash during upload**: Counter resets on restart
5. **Rapid close attempts**: Dialog is modal, prevents multiple dialogs

## 🚀 Future Enhancements

### Show Upload Progress in Dialog

```typescript
const choice = dialog.showMessageBoxSync(rootWindow, {
  type: 'warning',
  buttons: ['Cancel', 'Quit'],
  message: `${activeUploadsCount} file upload(s) in progress. Quit anyway?`,
  detail: 'Closing will interrupt the upload(s).',
});
```

### Add Upload List

```typescript
// Track upload details
const activeUploads = new Map<string, { fileName: string, progress: number }>();

// Show in dialog
const uploadList = Array.from(activeUploads.values())
  .map(u => `- ${u.fileName} (${u.progress}%)`)
  .join('\n');
```

### Configurable Behavior

```typescript
// Add setting
const warnOnUploadClose = readSetting('warnOnUploadClose') ?? true;

if (!warnOnUploadClose) {
  return true; // Allow close without warning
}
```

## 🐛 Troubleshooting

### Issue: Dialog doesn't appear

**Check**:
1. Upload tracking is called: `window.RocketChatDesktop.notifyUploadStarted()`
2. Counter is incremented: Check Redux DevTools
3. Dialog function is called: Add console.log in `checkActiveUploads()`

### Issue: Counter doesn't reset

**Check**:
1. Upload finish/fail is called
2. Reducer is handling actions correctly
3. Counter doesn't go negative

### Issue: Dialog appears when no uploads

**Check**:
1. Upload finish is called for all uploads
2. Counter is properly decremented
3. No orphaned upload tracking

## 📚 References

- [Electron Dialog API](https://www.electronjs.org/docs/latest/api/dialog)
- [Electron BrowserWindow Events](https://www.electronjs.org/docs/latest/api/browser-window#event-close)
- [Redux Reducers](https://redux.js.org/tutorials/fundamentals/part-3-state-actions-reducers)

---

**Created**: 2026-03-12
**Feature**: Upload tracking & close prevention
**Status**: ✅ Implemented
**Impact**: Prevents data loss from interrupted uploads
