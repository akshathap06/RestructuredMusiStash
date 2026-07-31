const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add support for .cjs and .mjs files
config.resolver.assetExts.push('cjs');
config.resolver.sourceExts = ['js', 'json', 'ts', 'tsx', 'jsx', 'mjs', 'cjs'];

// NOTE: Enabling package exports globally breaks React Native internals
// (ReactSharedInternals, etc.). Configure per-package resolution instead if needed.
// config.resolver.unstable_enablePackageExports = true;

module.exports = config;
