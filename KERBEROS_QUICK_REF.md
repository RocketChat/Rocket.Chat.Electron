# Quick Reference - Kerberos/SAML Fix

## ✅ Fix Applied

**File**: `src/app/main/app.ts` (Lines 71-72)

**What**: Added Kerberos/SPNEGO authentication support for SAML on macOS

**Code**:
```typescript
// Enable Kerberos/SPNEGO authentication for SAML on macOS
if (process.platform === 'darwin') {
  app.commandLine.appendSwitch('auth-server-whitelist', '*.local,*.domain.local');
  app.commandLine.appendSwitch('auth-negotiate-delegate-whitelist', '*.local,*.domain.local');
}
```

## 🎯 What This Fixes

**Problem**: SAML authentication with Kerberos fails on macOS Desktop app (works in browser)

**Solution**: Enable Electron's Kerberos authentication flags

**Result**: Automatic SSO without password prompts

## 🧪 Quick Test

### Prerequisites
- macOS system
- Valid Kerberos ticket: `klist`
- SAML-enabled Rocket.Chat server

### Test Steps
```bash
# 1. Build
yarn start

# 2. Login
- Open app
- Click "Login with SAML"
- Should auto-authenticate (no password)

# 3. Verify
✅ Logged in without password prompt
✅ Uses existing Kerberos ticket
✅ Matches browser behavior
```

## 🔧 Customization

### Change Whitelisted Domains

Edit `src/app/main/app.ts`:
```typescript
// For specific domains
app.commandLine.appendSwitch('auth-server-whitelist', 'idp.company.com,auth.company.com');

// For all subdomains
app.commandLine.appendSwitch('auth-server-whitelist', '*.company.com');
```

### Make It Configurable

```typescript
const whitelist = process.env.KERBEROS_WHITELIST || '*.local,*.domain.local';
app.commandLine.appendSwitch('auth-server-whitelist', whitelist);
```

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Still asks for password | Check `klist` - renew ticket with `kinit` |
| Auth fails completely | Verify SAML config and IdP reachability |
| Works in browser only | Verify flags applied - check console logs |

## 📊 Commit Info

- **Commit**: `aea667fe8`
- **Branch**: `fix/pdf-viewer-plugins-clean`
- **Files**: 1 changed, 6 insertions
- **Platform**: macOS only

## 📚 Full Documentation

See `KERBEROS_SAML_FIX.md` for comprehensive details.

---

**Status**: ✅ Ready for testing
**Platform**: macOS only
**Impact**: SAML + Kerberos authentication
