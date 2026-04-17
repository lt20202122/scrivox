# Scrivox Keyboard — Xcode Setup Instructions

After running `npx expo prebuild` on macOS, follow these steps to add the keyboard extension target in Xcode.

## Prerequisites
- macOS with Xcode 15+
- Run `npx expo prebuild --clean` to generate the `ios/` folder (do this on macOS, not Windows)
- Apple Developer account with App Group capability enabled

## Step 1 — Open the project
```
open ios/scrivox.xcworkspace
```

## Step 2 — Add the Keyboard Extension target
1. In Xcode, select the project file in the navigator
2. Click **+** at the bottom of the targets list
3. Choose **Custom Keyboard Extension**
4. Set:
   - Product Name: `ScrivoxKeyboard`
   - Bundle Identifier: `com.scrivox.app.ScrivoxKeyboard`
   - Language: Swift
5. Click **Finish** (uncheck "Activate scheme" if prompted)

## Step 3 — Replace generated files
Copy the files from this directory into the new target:
- `KeyboardViewController.swift` → replace the generated `KeyboardViewController.swift`
- `Info.plist` → replace the generated `Info.plist`

## Step 4 — Add App Group capability
Add the App Group `group.com.scrivox.app` to BOTH:
- The **scrivox** (main app) target → Signing & Capabilities → + Capability → App Groups
- The **ScrivoxKeyboard** extension target → same steps

## Step 5 — Link Speech framework
In the **ScrivoxKeyboard** target:
1. Go to **Build Phases** → **Link Binary With Libraries**
2. Add `Speech.framework`

## Step 6 — Verify entitlements
Both targets should have an `.entitlements` file with:
```xml
<key>com.apple.security.application-groups</key>
<array>
    <string>group.com.scrivox.app</string>
</array>
```

## Step 7 — Build and test
Build the main app on a real device (keyboard extensions don't work in the simulator).
Go to Settings → General → Keyboard → Keyboards → Add New Keyboard → Scrivox.
