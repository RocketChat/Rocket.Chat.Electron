#!/bin/bash
# Run TypeScript type-check on edited .ts/.tsx files

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

if [[ "$FILE_PATH" != *.ts && "$FILE_PATH" != *.tsx ]]; then
  exit 0
fi

# Run tsc on the whole project (TypeScript doesn't support single-file checking well)
# Use --pretty false for cleaner output
cd "$CLAUDE_PROJECT_DIR" 2>/dev/null || exit 0
npx tsc --noEmit --pretty false 2>&1 | head -20

exit 0
