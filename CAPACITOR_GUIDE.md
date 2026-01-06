# Quick Start Guide: Building iOS App with Capacitor

This is the **easiest and recommended method** to create an iOS app from the CRM web application.

## What is Capacitor?

Capacitor is a cross-platform native runtime that makes it easy to build web apps that run natively on iOS, Android, and the web. It's maintained by the Ionic team and is the modern successor to Cordova/PhoneGap.

## Prerequisites

- macOS computer
- Node.js installed (v16 or later)
- Xcode installed (v14 or later)
- CocoaPods installed (`sudo gem install cocoapods`)

## Step-by-Step Instructions

### 1. Install Capacitor

Open Terminal in the project root directory and run:

```bash
npm install
```

This will install Capacitor core, CLI, and iOS platform.

### 2. Initialize Capacitor iOS Platform

```bash
npx cap add ios
```

This creates an `ios/` directory with a complete Xcode project.

### 3. Sync Web Assets

```bash
npx cap sync ios
```

This copies your web files into the iOS project and updates native dependencies.

### 4. Open in Xcode

```bash
npx cap open ios
```

This opens the iOS project in Xcode.

### 5. Configure the Project

In Xcode:

1. Select the project in the navigator
2. Under "Signing & Capabilities":
   - Select your Team
   - Xcode will automatically generate a Bundle Identifier
3. Select a simulator or connected device
4. Click the "Run" button (▶️) or press Cmd+R

### 6. Run on Simulator or Device

The app will build and launch on your selected device/simulator.

## Making Changes

After modifying HTML/CSS/JS files:

```bash
# Copy changes to iOS project
npx cap copy ios

# Or sync everything (recommended)
npx cap sync ios
```

## File Structure After Capacitor Setup

```
crm-html/
├── ios/                    # Native iOS project (created by Capacitor)
│   ├── App/
│   │   ├── App/
│   │   │   ├── capacitor.config.json
│   │   │   └── public/    # Your web files are copied here
│   │   └── App.xcodeproj
│   └── Podfile
├── index.html             # Your web app
├── css/
├── js/
├── capacitor.config.json  # Capacitor configuration
└── package.json          # Node dependencies
```

## Customization

### App Icon

1. Prepare an app icon (1024x1024 PNG)
2. In Xcode, select `ios/App/App/Assets.xcassets`
3. Click on "AppIcon"
4. Drag your icon into the 1024x1024 slot
5. Xcode will generate all required sizes

### App Name

Edit `capacitor.config.json`:

```json
{
  "appName": "Your Custom Name"
}
```

Then run `npx cap sync ios`.

### App ID (Bundle Identifier)

**Important**: Before building for App Store, change the placeholder app ID in `capacitor.config.json`:

```json
{
  "appId": "com.yourcompany.crmapp"
}
```

Replace `com.yourcompany.crmapp` with your own reverse domain name (e.g., `com.acme.crmapp`).

Then run `npx cap sync ios`.

### Bundle Identifier in Xcode

In Xcode:
1. Select the project
2. Change "Bundle Identifier" under "General" tab

### Splash Screen

Edit `capacitor.config.json`:

```json
{
  "plugins": {
    "SplashScreen": {
      "launchShowDuration": 3000,
      "backgroundColor": "#4CAF50",
      "showSpinner": true
    }
  }
}
```

## Building for Distribution

### For Testing (TestFlight)

1. In Xcode: Product → Archive
2. After archiving: Window → Organizer
3. Select your archive and click "Distribute App"
4. Follow the wizard to upload to App Store Connect
5. Add to TestFlight for beta testing

### For App Store Release

1. Complete app metadata in App Store Connect
2. Upload screenshots
3. Set pricing and availability
4. Submit for review

## Advantages of Capacitor

✅ **Easy Setup**: Simple CLI commands
✅ **Native APIs**: Access iOS features (camera, notifications, etc.)
✅ **Hot Reload**: See changes instantly during development
✅ **TypeScript Support**: Optional TypeScript integration
✅ **Plugin Ecosystem**: Extensive plugin library
✅ **Modern**: Actively maintained and updated
✅ **PWA Compatible**: Works alongside your PWA
✅ **Live Updates**: Can push updates without App Store review (for web assets)

## Adding Native Features

### Example: Push Notifications

```bash
npm install @capacitor/push-notifications
npx cap sync ios
```

Then in your JavaScript:

```javascript
import { PushNotifications } from '@capacitor/push-notifications';

// Request permission
await PushNotifications.requestPermissions();

// Register for push
await PushNotifications.register();

// Listen for notifications
PushNotifications.addListener('pushNotificationReceived', (notification) => {
  console.log('Push received:', notification);
});
```

### Example: Camera Access

```bash
npm install @capacitor/camera
npx cap sync ios
```

### Example: Local Notifications

```bash
npm install @capacitor/local-notifications
npx cap sync ios
```

## Troubleshooting

### Build Fails in Xcode

```bash
# Clean derived data
rm -rf ~/Library/Developer/Xcode/DerivedData

# Update pods
cd ios/App
pod install
cd ../..
```

### Changes Not Appearing

```bash
# Force sync
npx cap sync ios --force
```

### Module Not Found Errors

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
npx cap sync ios
```

## Development Workflow

1. Make changes to HTML/CSS/JS
2. Test in web browser first
3. Sync to iOS: `npx cap sync ios`
4. Test in simulator/device
5. Repeat

## Live Reload for Faster Development

1. Start a local server:
```bash
npx http-server . -p 8080
```

2. Get your local IP address:
```bash
ipconfig getifaddr en0  # macOS
```

3. Edit `capacitor.config.json`:
```json
{
  "server": {
    "url": "http://YOUR_IP:8080",
    "cleartext": true
  }
}
```

4. Run `npx cap sync ios`
5. Changes reload automatically in the app!

## Performance Tips

- Keep web assets optimized (minify CSS/JS)
- Optimize images
- Use lazy loading for heavy content
- Monitor memory usage with Xcode Instruments
- Test on real devices, not just simulator

## Resources

- [Capacitor Documentation](https://capacitorjs.com)
- [Capacitor iOS Guide](https://capacitorjs.com/docs/ios)
- [Plugin Development](https://capacitorjs.com/docs/plugins)
- [Capacitor Community Plugins](https://github.com/capacitor-community)

## Getting Help

- Capacitor Forum: https://forum.ionicframework.com/c/capacitor
- GitHub Issues: https://github.com/ionic-team/capacitor
- Stack Overflow: Tag `capacitor`

---

**Recommended**: Use this Capacitor method for the easiest and most maintainable iOS app!
