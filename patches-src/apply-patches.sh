#!/bin/bash

# Script to apply patches from patches-src to node_modules and regenerate patch files
# This automates the process of maintaining and updating patches

set -e

echo "🔧 Applying patches from patches-src..."

# Function to copy and apply a patch
apply_patch() {
    local package_name="$1"
    local src_dir="patches-src/$package_name"
    local dest_dir="node_modules/$package_name"
    
    if [ -d "$src_dir" ]; then
        echo "📦 Processing $package_name..."
        
        # Copy all files from patches-src to node_modules
        find "$src_dir" -type f \( -name "*.ts" -o -name "*.js" -o -name "*.json" \) | while read -r file; do
            # Get relative path from src_dir
            rel_path="${file#$src_dir/}"
            dest_file="$dest_dir/$rel_path"
            
            # Create destination directory if it doesn't exist
            mkdir -p "$(dirname "$dest_file")"
            
            # Copy file
            cp "$file" "$dest_file"
            echo "  ✅ Copied $rel_path"
        done
        
        # Generate patch file
        echo "  🔄 Generating patch file..."
        # Handle scoped package names properly
        if [[ "$package_name" == @* ]]; then
            # For scoped packages like @ewsjs/xhr, we need to pass the full name
            yarn patch-package "$package_name"
        else
            yarn patch-package "$package_name"
        fi
        echo "  ✅ Patch file updated"
    else
        echo "⚠️  No patches found for $package_name"
    fi
}

# Apply patches for all packages in patches-src
# Handle scoped packages like @ewsjs/xhr
apply_patch "@ewsjs/xhr"

echo "🎉 All patches applied successfully!"
echo ""
echo "💡 To edit patches in the future:"
echo "   1. Edit files in patches-src/"
echo "   2. Run ./patches-src/apply-patches.sh"
echo "   3. Test your changes"