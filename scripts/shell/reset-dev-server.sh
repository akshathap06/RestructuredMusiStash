#!/bin/bash

echo "🔄 Resetting Expo Dev Server..."
echo ""

# Kill all processes
echo "1. Killing all Expo/Metro processes..."
pkill -9 -f "expo" 2>/dev/null
pkill -9 -f "metro" 2>/dev/null
pkill -9 -f "node.*8081" 2>/dev/null
sleep 2
echo "✅ Processes killed"
echo ""

# Clear all caches
echo "2. Clearing all caches..."
rm -rf .expo
rm -rf node_modules/.cache
rm -rf .metro
rm -rf $TMPDIR/metro-*
rm -rf $TMPDIR/haste-*
echo "✅ Caches cleared"
echo ""

# Clear watchman (if installed)
if command -v watchman &> /dev/null; then
  echo "3. Clearing Watchman..."
  watchman watch-del-all 2>/dev/null
  echo "✅ Watchman cleared"
  echo ""
fi

# Reset Metro bundler cache
echo "4. Resetting Metro bundler..."
npx expo start --clear --reset-cache 2>&1 | head -20 &
EXPO_PID=$!
sleep 5
kill $EXPO_PID 2>/dev/null
echo "✅ Metro reset"
echo ""

echo "✅ Dev server reset complete!"
echo ""
echo "Now run: npx expo start --clear"
echo ""

