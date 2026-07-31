# MusiStash iOS Development Setup Guide

This guide walks through setting up the MusiStash iOS development environment from scratch, including common errors and their fixes.

## Prerequisites

Before starting, ensure you have:
- **macOS** (Sequoia 15.x recommended)
- **Xcode 16.1+** (required for React Native 0.81.x)
- **Node.js 22.x** (check with `node -v`)
- **CocoaPods 1.15+** (`sudo gem install cocoapods`)
- **Expo CLI** (`npm install -g expo-cli`)
- **EAS CLI** (`npm install -g eas-cli`)
- An **Expo account** (create at expo.dev)
- An **Apple Developer account** (for device builds)

---

## Quick Start (If Everything is Set Up)

```bash
cd musistash-mobile-clean
npm install
cd ios && pod install && cd ..
npx expo run:ios
```

---

## Full Setup Guide

### Step 1: Clone and Install Dependencies

```bash
git clone https://github.com/akshathap06/MS-Mobile.git musistash-mobile-clean
cd musistash-mobile-clean
npm install
```

### Step 2: Install iOS Pods

```bash
cd ios
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8
pod install
cd ..
```

### Step 3: Run on iOS Simulator

```bash
npx expo run:ios
```

This will:
1. Build the native iOS app
2. Install it on the simulator
3. Start the Metro bundler
4. Launch the app

---

## Running with Tunnel (For Physical Device Testing)

If you want to test on a physical device by scanning a QR code:

```bash
npx expo start --tunnel --dev-client --clear
```

Then scan the QR code with your phone's camera (iOS) or Expo Go app (Android).

---

## EAS Build (For Distribution/TestFlight)

### Login to EAS

```bash
eas login
```

### Build for iOS

```bash
eas build --profile development --platform ios --clear-cache
```

**Note:** You'll need an Apple App-Specific Password for EAS builds:
1. Go to https://appleid.apple.com/account/manage
2. Sign in with your Apple ID
3. Go to "App-Specific Passwords"
4. Generate a new password
5. Use this password when EAS prompts for Apple credentials

---

## Common Errors and Fixes

### Error 1: `react-native-reanimated` Compilation Error

**Symptom:**
```
error: non-virtual member function marked 'override' hides virtual member function
```

**Cause:** Incompatibility between `react-native-reanimated` 3.x and Xcode 16.3+

**Fix:** Upgrade to reanimated 4.x with worklets:
```bash
npm install react-native-reanimated@4.2.0
npm install react-native-worklets@0.7.0
cd ios && pod install && cd ..
```

---

### Error 2: `[Reanimated] react-native-worklets package isn't installed`

**Symptom:**
```
[Reanimated] react-native-worklets package isn't installed. Please install a version between 0.7.0 and 0.7
```

**Fix:**
```bash
npm install react-native-worklets@0.7.0
cd ios && pod install && cd ..
```

---

### Error 3: `folly/coro/Coroutine.h file not found`

**Symptom:**
```
fatal error: 'folly/coro/Coroutine.h' file not found
```

**Fix:** Add these lines to the top of `ios/Podfile`:
```ruby
ENV['RCT_NEW_ARCH_ENABLED'] = '0'
ENV['FOLLY_CFG_NO_COROUTINES'] = '1'
```

Then reinstall pods:
```bash
cd ios && pod install && cd ..
```

---

### Error 4: `React Native requires Xcode >= 16.1`

**Symptom:**
```
React Native requires XCode >= 16.1. Found 15.2.
```

**Fix:** Update Xcode from the Mac App Store or Apple Developer website.

For EAS builds, update `eas.json`:
```json
{
  "build": {
    "development": {
      "ios": {
        "image": "macos-sequoia-15.2-xcode-16.2"
      }
    }
  }
}
```

---

### Error 5: Pod Install Encoding Error

**Symptom:**
```
invalid byte sequence in UTF-8
```

**Fix:**
```bash
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8
cd ios && pod install && cd ..
```

---

### Error 6: Port 8081 Already in Use

**Symptom:**
```
Port 8081 is already in use
```

**Fix:**
```bash
# Find and kill the process using port 8081
lsof -i :8081
kill -9 <PID>

# Or use a different port
npx expo start --port 8082
```

---

### Error 7: Simulator Not Found / No Matching Device

**Symptom:**
```
No simulator available
```

**Fix:**
```bash
# List available simulators
xcrun simctl list devices

# Run on a specific simulator
npx expo run:ios --device "iPhone 16 Pro"
```

---

### Error 8: Development Build Not Installed

**Symptom:**
```
Unable to find a development build
```

**Fix:** Build and install the development client:
```bash
npx expo run:ios
```

Or for EAS:
```bash
eas build --profile development --platform ios
eas build:run --platform ios --latest
```

---

### Error 9: EAS Build Expired

**Symptom:**
```
The build is expired
```

**Fix:** Create a new build:
```bash
eas build --profile development --platform ios --clear-cache
```

---

### Error 10: Apple Credentials Required (Non-Interactive)

**Symptom:**
```
Input is required, but stdin is not readable
```

**Fix:** Run the command in your terminal directly (not through an IDE agent):
```bash
eas build --profile development --platform ios
```

Or build locally:
```bash
npx expo run:ios
```

---

## Project Structure

```
musistash-mobile-clean/
├── src/
│   ├── screens/          # All app screens
│   ├── components/       # Reusable components
│   ├── services/         # API and business logic
│   ├── navigation/       # React Navigation setup
│   ├── contexts/         # React contexts
│   ├── lib/              # Supabase client
│   └── styles/           # Theme and global styles
├── ios/                  # Native iOS code
│   ├── Podfile           # CocoaPods dependencies
│   └── MusiStash.xcworkspace
├── supabase/
│   └── functions/        # Edge functions
├── app.json              # Expo config
├── eas.json              # EAS build config
└── package.json
```

---

## Key Configuration Files

### `eas.json` - EAS Build Configuration

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "resourceClass": "m-medium",
        "buildConfiguration": "Release",
        "cocoapods": "1.16.2",
        "image": "latest"
      }
    }
  }
}
```

### `ios/Podfile` - Key Settings

Make sure these are at the top:
```ruby
ENV['RCT_NEW_ARCH_ENABLED'] = '0'
ENV['FOLLY_CFG_NO_COROUTINES'] = '1'
```

---

## Environment Variables

Create a `.env` file in the root (if not exists):

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
STRIPE_PUBLISHABLE_KEY=your_stripe_key
```

**Note:** Never commit `.env` to git. It's in `.gitignore`.

---

## Debugging Tips

### View Metro Bundler Logs
The terminal running `expo run:ios` shows all JavaScript logs.

### View Native Logs
```bash
# Open Console.app on Mac, filter by "MusiStash"
```

### Reset Metro Cache
```bash
npx expo start --clear
```

### Reset iOS Build
```bash
cd ios
rm -rf Pods Podfile.lock
rm -rf ~/Library/Developer/Xcode/DerivedData
pod install
cd ..
npx expo run:ios
```

### Full Clean Rebuild
```bash
rm -rf node_modules
rm -rf ios/Pods ios/Podfile.lock
rm -rf ~/Library/Developer/Xcode/DerivedData
npm install
cd ios && pod install && cd ..
npx expo run:ios
```

---

## Useful Commands Reference

| Command | Description |
|---------|-------------|
| `npx expo run:ios` | Build and run on iOS simulator |
| `npx expo start --tunnel --dev-client` | Start dev server with tunnel |
| `npx expo start --clear` | Start with cleared cache |
| `eas build --profile development --platform ios` | Create EAS build |
| `eas build:run --platform ios --latest` | Install latest EAS build |
| `cd ios && pod install` | Install/update iOS pods |
| `xcrun simctl list devices` | List available simulators |

---

## Getting Help

If you encounter issues not covered here:
1. Check the Expo docs: https://docs.expo.dev/
2. Check React Native docs: https://reactnative.dev/
3. Search Expo Discord or GitHub issues
4. Contact the team lead

---

## Version Info (Last Updated)

- React Native: 0.81.5
- Expo SDK: 53
- react-native-reanimated: 4.2.0
- react-native-worklets: 0.7.0
- Xcode: 16.2+
- Node.js: 22.x

---

*Last updated: December 2024*
