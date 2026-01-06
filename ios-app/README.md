# CRM iOS App

This directory contains the iOS native app wrapper for the CRM HTML application.

## Overview

The iOS app uses WKWebView to wrap the HTML/CSS/JavaScript CRM application in a native iOS container. This provides:

- Native iOS app experience
- App Store distribution capability
- Full-screen display without browser chrome
- iOS integration (notifications, file system, etc.)
- Offline functionality via service worker

## Architecture

The app consists of:

1. **Swift UI Views**: Modern SwiftUI-based interface
2. **WKWebView**: Renders the HTML application
3. **Web Resources**: HTML, CSS, JS files bundled with the app

## Prerequisites

- macOS with Xcode 14.0 or later
- iOS 15.0+ target device or simulator
- Apple Developer account (for device testing and App Store submission)

## Setup Instructions

### 1. Create Xcode Project

1. Open Xcode
2. Select "Create a new Xcode project"
3. Choose "iOS" → "App"
4. Configure project:
   - Product Name: `CRM App`
   - Team: Select your development team
   - Organization Identifier: `com.yourcompany.crmapp`
   - Interface: SwiftUI
   - Language: Swift
   - Storage: None
   - Click "Next" and choose save location

### 2. Add Swift Files

1. Delete the default `ContentView.swift` file that Xcode creates
2. Add the provided Swift files to your project:
   - Drag `CRMApp.swift` into the project navigator
   - Drag `ContentView.swift` into the project navigator
3. When prompted, ensure "Copy items if needed" is checked
4. Target should be your app target

### 3. Add Web Resources

1. Create a new group in your project called "WebResources"
2. Copy all files from the parent directory into this group:
   - `index.html`
   - `manifest.json`
   - `service-worker.js`
   - `css/` directory (with all CSS files)
   - `js/` directory (with all JavaScript files)
   - `icons/` directory (with all icon files)
3. When adding files:
   - Check "Copy items if needed"
   - Select "Create folder references" (not groups)
   - Ensure target membership is checked

### 4. Configure Info.plist

Replace your project's Info.plist with the provided one, or add these keys:

```xml
<key>CFBundleDisplayName</key>
<string>CRM App</string>
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsLocalNetworking</key>
    <true/>
</dict>
```

### 5. Add App Icons

1. Create an App Icon set:
   - Select Assets.xcassets in project navigator
   - Right-click → "App Icons & Launch Images" → "New iOS App Icon"
2. Add icon images in required sizes:
   - Use the icons from the `icons/` directory
   - Drag and drop into appropriate size slots
   - Required sizes: 20pt, 29pt, 40pt, 60pt, 76pt, 83.5pt (in 1x, 2x, 3x)

**Note**: The provided Info.plist uses a default launch screen. For a custom launch screen:
1. Create a Launch Screen asset in Assets.xcassets
2. Or add a LaunchScreen.storyboard to your project
3. Xcode will automatically configure these for modern iOS apps

### 6. Build and Run

1. Select your target device or simulator
2. Press Cmd+R or click the "Run" button
3. The app should launch and display the CRM interface

## Project Structure

```
CRM App/
├── CRMApp.swift              # App entry point
├── ContentView.swift         # Main view with WKWebView
├── Info.plist               # App configuration
├── Assets.xcassets/         # App icons and assets
└── WebResources/            # HTML/CSS/JS files
    ├── index.html
    ├── manifest.json
    ├── service-worker.js
    ├── css/
    ├── js/
    └── icons/
```

## Features

### Implemented

- ✅ Full CRM functionality in native iOS app
- ✅ WKWebView integration
- ✅ Local storage persistence
- ✅ Responsive design for iPhone and iPad
- ✅ Service worker for offline support
- ✅ Progressive Web App features

### Future Enhancements

- [ ] Push notifications for task deadlines
- [ ] iOS share extension for importing data
- [ ] Siri shortcuts integration
- [ ] iCloud sync for data backup
- [ ] Face ID/Touch ID for app security
- [ ] iOS widgets for quick access
- [ ] Apple Pencil support for iPad
- [ ] Handoff support between devices

## Troubleshooting

### Web content not loading

- Verify all web files are included in app bundle
- Check "Target Membership" for all web resources
- Ensure "Create folder references" was selected when adding directories
- Check Xcode console for file path errors

### JavaScript errors

- Enable JavaScript in WKWebView configuration (already done in ContentView.swift)
- Check Safari Web Inspector for JavaScript errors
- Ensure all external CDN resources are accessible

### Local storage not persisting

- WKWebView's localStorage should persist automatically
- Check app isn't being cleared by iOS due to storage limits
- Verify WKWebViewConfiguration is properly set up

### Service worker not registering

- Service workers work in WKWebView with iOS 14.5+
- Check that service-worker.js is in the root of web resources
- Monitor console for service worker registration errors

## Building for Distribution

### TestFlight / App Store

1. **Prepare for Archive**:
   - Set a proper bundle identifier
   - Configure signing with your Apple Developer account
   - Update version and build numbers

2. **Create Archive**:
   - Select "Any iOS Device" as build target
   - Product → Archive
   - Wait for archiving to complete

3. **Submit to App Store**:
   - In Organizer, select your archive
   - Click "Distribute App"
   - Follow the App Store Connect wizard
   - Fill in app metadata and screenshots

### App Store Requirements

- App screenshots (required for submission)
- App description and keywords
- Privacy policy URL
- Support URL
- App category: Business or Productivity
- Content rating

## Alternative: Capacitor or Cordova

If you prefer a more automated approach, consider using:

### Capacitor (Recommended)

```bash
# Install Capacitor
npm install @capacitor/core @capacitor/cli
npx cap init "CRM App" "com.yourcompany.crmapp"

# Add iOS platform
npm install @capacitor/ios
npx cap add ios

# Copy web assets
npx cap copy

# Open in Xcode
npx cap open ios
```

### Cordova

```bash
# Install Cordova
npm install -g cordova

# Create project
cordova create CRMApp com.yourcompany.crmapp "CRM App"

# Copy web files to www/ directory
cp -r ../index.html ../css ../js ../icons www/

# Add iOS platform
cordova platform add ios

# Build
cordova build ios

# Open in Xcode
open platforms/ios/CRM\ App.xcworkspace
```

## Testing

### On Simulator

1. Select iOS Simulator from device menu
2. Run the app (Cmd+R)
3. Test all CRM features
4. Verify localStorage persistence
5. Check responsive design

### On Physical Device

1. Connect iPhone/iPad via USB
2. Select device from device menu
3. Trust developer certificate on device
4. Run the app
5. Test offline functionality
6. Verify performance on actual hardware

## Performance Optimization

- All web resources are bundled with the app
- No network requests for core functionality
- localStorage used for data persistence
- Service worker enables offline operation
- Lazy loading for better initial load time

## Security Considerations

- No server communication (currently)
- All data stored locally on device
- WKWebView has same-origin policy protection
- Consider adding:
  - Face ID/Touch ID authentication
  - Data encryption for sensitive information
  - Secure keychain storage for credentials

## Support

For issues specific to:
- **Web app functionality**: Check main repository README
- **iOS build issues**: Check Xcode console and build logs
- **WKWebView problems**: Enable Safari Web Inspector

## License

Same license as the main CRM application project.

## Resources

- [WKWebView Documentation](https://developer.apple.com/documentation/webkit/wkwebview)
- [SwiftUI Documentation](https://developer.apple.com/documentation/swiftui)
- [iOS App Distribution Guide](https://developer.apple.com/distribution/)
- [Capacitor Documentation](https://capacitorjs.com/docs)

---

Built for iOS 15.0+ • Supports iPhone and iPad • Universal binary
