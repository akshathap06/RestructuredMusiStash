#!/usr/bin/env bash

# EAS Build hook to use npm install instead of npm ci
# This ensures legacy-peer-deps works properly

set -e

echo "🔧 Using npm install with legacy-peer-deps..."

# Remove package-lock.json if it exists to force fresh install
if [ -f package-lock.json ]; then
  echo "📦 Removing package-lock.json..."
  rm package-lock.json
fi

# Install with legacy peer deps
npm install --legacy-peer-deps

echo "✅ Dependencies installed successfully!"

