# Renew CI Credentials

Reference for rotating expired publishing credentials used by the
`Build pull request artifacts` and `Build release` workflows.

Update each set when the corresponding CI job fails with an
authentication / expiration error.

---

## Snap Store (Linux)

Used by `snapcore/action-publish@v1` step in
`.github/workflows/pull-request-build.yml` and `build-release.yml`.

**Symptom in CI log:**

```text
Exported credentials are no longer valid for the Snap Store.
Recommended resolution: Run export-login and update SNAPCRAFT_STORE_CREDENTIALS.
```

**Snap name:** `rocketchat-desktop` (NOT `rocketchat` — store registration uses `-desktop` suffix; using the wrong name returns `resource-not-found: Snap not found for the given snap name 'rocketchat'`).

### Steps

Must run on a real Ubuntu machine (or WSL Ubuntu). macOS and Windows
do not have a working `snapcraft` CLI for `export-login` — the command
silently no-ops or fails on credential storage backends.

1. On Ubuntu, install snapcraft if needed:

   ```bash
   sudo snap install --classic snapcraft
   ```

2. Generate exported credentials scoped to the `rocketchat-desktop` snap:

   ```bash
   snapcraft export-login \
     --snaps=rocketchat-desktop \
     --acls=package_access,package_push,package_update,package_release \
     exported-credentials.txt
   ```

   Login with the Ubuntu One account that owns the `rocketchat-desktop`
   snap registration (Rocket.Chat publisher account). 2FA prompt may
   appear in browser.

3. Copy the full file contents:

   ```bash
   cat exported-credentials.txt
   ```

4. GitHub → repo Settings → Secrets and variables → Actions →
   `SNAPCRAFT_STORE_CREDENTIALS` → Update secret. Paste raw file
   contents (no base64, no trimming — `snapcore/action-publish@v1`
   handles encoding).

5. Delete `exported-credentials.txt` from disk.

6. Re-run failed CI job to confirm.

### Notes

- Credentials expire ~1 year after issue. Calendar reminder
  recommended.
- `--acls` set covers upload + release to channels; do not broaden.
- ACL `package_register` is NOT needed (snap already registered).

---

## Apple code signing (macOS)

Used by `electron-builder --mac` step in pull-request-build and
build-release workflows. Affects MAS (`mas` target) and direct
distribution (`dmg`, `pkg`, `zip`).

**Symptom in CI log:**

```text
skipped macOS application code signing
reason=cannot find valid "Apple Distribution, 3rd Party Mac Developer Application" identity
... (CSSMERR_TP_CERT_EXPIRED) for multiple identities
```

### Steps

Must run on macOS with Xcode + valid Apple Developer Program access
to Rocket.Chat Technologies Corp. team (`S6UPZG7ZR3`).

1. Renew certificates in Apple Developer portal:
   - Apple Distribution
   - 3rd Party Mac Developer Application
   - 3rd Party Mac Developer Installer
   - Mac Developer / Apple Development (if used for testing)

   Existing valid certs (do not need replacement now):
   - Developer ID Application
   - Developer ID Installer

2. Download new `.cer` files; double-click to import to Keychain.

3. Export combined `.p12` from Keychain Access:
   - Select all renewed certs + their private keys.
   - File → Export Items → `.p12` format.
   - Save as `certs.p12` (or rename to `certs.p12` before step 4 to
     match the command below).
   - Set strong password.

4. Base64 encode for GitHub. Strip newlines so `CSC_LINK` is a clean
   single-line payload:

   ```bash
   base64 -i certs.p12 | tr -d '\n' | pbcopy
   ```

5. GitHub → repo Settings → Secrets and variables → Actions:
   - `CSC_LINK` → paste base64 contents.
   - `CSC_KEY_PASSWORD` → set to `.p12` password.
   - After saving the secret, securely delete the local file and
     clear the clipboard:
     ```bash
     rm -P certs.p12
     pbcopy < /dev/null
     ```

6. Verify `APPLEID`, `APPLEIDPASS` (app-specific password), and
   `ASC_PROVIDER=S6UPZG7ZR3` secrets are still valid for notarization.

7. Renew provisioning profile if MAS build still fails:
   - Apple Developer portal → Profiles → regenerate against renewed
     Apple Distribution cert (Name: `Desktop`, App ID: `RocketChat`).
   - Download `.provisionprofile` and replace
     `Desktop.provisionprofile` at repo root (referenced by
     `mac.provisioningProfile` in `electron-builder.json`).
     electron-builder embeds it into the `.app` bundle as
     `Contents/embedded.provisionprofile` automatically — do NOT
     keep a separate `embedded.provisionprofile` at repo root
     (legacy stale file, removed 2026-04-27).
   - Verify expiry:
     ```bash
     security cms -D -i Desktop.provisionprofile | grep -A1 ExpirationDate
     ```

8. Re-run failed CI job to confirm.

### Notes

- Apple certs expire 1 year (development) or 5 years (Developer ID).
- Provisioning profile must reference a non-expired Apple
  Distribution cert; renewing the cert invalidates the profile.
- Two-phase signing flow on Windows (Google Cloud KMS) is unrelated
  — different secret set.

---

## Windows code signing (Google Cloud KMS)

Used by jsign step in workflows. Not currently failing.

Secrets involved:
- `WIN_CSC_KEY_NAME` (KMS key path)
- `WIN_CSC_LINK` (cert chain)
- GCP service account JSON via `GOOGLE_APPLICATION_CREDENTIALS`

KMS keys do not expire; service account keys may. Rotate via GCP
console if `failed to authenticate to KMS` appears.

---

## Quick reference

| Platform | Secret(s) | Renewal cadence | Where to run |
|----------|-----------|-----------------|--------------|
| Snap | `SNAPCRAFT_STORE_CREDENTIALS` | ~1 year | Ubuntu only |
| macOS | `CSC_LINK`, `CSC_KEY_PASSWORD`, `Desktop.provisionprofile` | typically ~1 year; confirm expiry in the Apple Developer portal for the specific certificate/profile | macOS only |
| Windows KMS | `WIN_CSC_*`, GCP SA JSON | SA key rotation policy | Any |
