#!/bin/bash

# Build script for CRM iOS App
# This script helps prepare the web resources for iOS app bundling

set -e

echo "======================================"
echo "CRM iOS App Build Helper"
echo "======================================"

# Check if Xcode is installed
if ! command -v xcodebuild &> /dev/null; then
    echo "❌ Xcode is not installed. Please install Xcode from the App Store."
    exit 1
fi

echo "✅ Xcode detected"

# Define directories
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IOS_APP_DIR="$PROJECT_ROOT/ios-app"
WEB_RESOURCES_DIR="$PROJECT_ROOT"

echo ""
echo "Project root: $PROJECT_ROOT"
echo "iOS app directory: $IOS_APP_DIR"
echo ""

# Check for required web files
echo "Checking for required web files..."
REQUIRED_FILES=(
    "index.html"
    "manifest.json"
    "service-worker.js"
    "css/styles.css"
    "js/app.js"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$WEB_RESOURCES_DIR/$file" ]; then
        echo "✅ Found: $file"
    else
        echo "❌ Missing: $file"
        exit 1
    fi
done

echo ""
echo "======================================"
echo "Next Steps:"
echo "======================================"
echo ""
echo "1. Open Xcode and create a new iOS App project:"
echo "   - Product Name: CRM App"
echo "   - Interface: SwiftUI"
echo "   - Language: Swift"
echo ""
echo "2. Replace the default Swift files with:"
echo "   - $IOS_APP_DIR/CRMApp.swift"
echo "   - $IOS_APP_DIR/ContentView.swift"
echo ""
echo "3. Add web resources to the Xcode project:"
echo "   - Drag the following into Xcode:"
echo "     • index.html"
echo "     • manifest.json"
echo "     • service-worker.js"
echo "     • css/ folder"
echo "     • js/ folder"
echo "     • icons/ folder"
echo "   - Select 'Create folder references' (NOT groups)"
echo "   - Enable 'Copy items if needed'"
echo ""
echo "4. Update Info.plist with settings from:"
echo "   - $IOS_APP_DIR/Info.plist"
echo ""
echo "5. Build and run the app in Xcode"
echo ""
echo "======================================"
echo "For detailed instructions, see:"
echo "$IOS_APP_DIR/README.md"
echo "======================================"
