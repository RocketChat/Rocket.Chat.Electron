# Patches Source Directory

This directory contains the source files for all package patches used in this project. It provides a structured way to maintain and update patches without having to manually edit `node_modules` files each time.

## Directory Structure

```
patches-src/
├── @ewsjs/
│   └── xhr/
│       └── src/
│           ├── ntlmProvider.ts   # Enhanced NTLM debugging
│           └── xhrApi.ts         # Enhanced XHR debugging
├── apply-patches.sh              # Automation script
└── README.md                     # This file
```

## How It Works

1. **Source Files**: Modified package files are stored in `patches-src/` with the same directory structure as the original package
2. **Apply Script**: `apply-patches.sh` copies files from `patches-src/` to `node_modules/` and regenerates patch files
3. **Patch Files**: Generated patches are stored in the main `patches/` directory

## Usage

### Making Changes

1. Edit the files in `patches-src/@ewsjs/xhr/src/`
2. Run the apply script:
   ```bash
   ./patches-src/apply-patches.sh
   ```
3. Test your changes
4. Commit both the source files and generated patch files

### Adding New Patches

1. Create the appropriate directory structure in `patches-src/`
2. Add your modified files
3. Update `apply-patches.sh` to include the new package
4. Run the script to generate the patch

## Current Patches

### @ewsjs/xhr

**Files Modified:**
- `src/ntlmProvider.ts` - Enhanced NTLM authentication debugging
- `src/xhrApi.ts` - Enhanced HTTP request debugging

**Purpose:** 
Adds comprehensive debugging for Exchange 2013 NTLM authentication issues. Logs detailed information about:
- NTLM authentication flow (Type 1, 2, 3 messages)
- Request/response headers and data
- Error details and network issues
- SSL certificate handling

**Debug Output:**
- `[DEBUG] NTLM Provider - ...` - NTLM-specific debugging
- `[DEBUG] XhrApi - ...` - General HTTP request debugging

## Benefits

- **Version Control**: Source files are tracked in git
- **Easy Maintenance**: Edit source files instead of regenerating patches manually
- **Documentation**: Clear history of what was changed and why
- **Automation**: Single script to apply all changes
- **Consistency**: Ensures patches are applied correctly every time

## Troubleshooting

If patches fail to apply:
1. Check that `node_modules/@ewsjs/xhr` exists
2. Ensure `yarn` and `patch-package` are installed
3. Verify file permissions on the script
4. Check for any TypeScript compilation errors in the source files