const required = [
  'SHARE_DOMAIN',
  'IOS_APP_STORE_URL',
  'ANDROID_PLAY_STORE_URL',
  'APPLE_TEAM_ID',
  'IOS_BUNDLE_ID',
  'ANDROID_PACKAGE_NAME',
  'ANDROID_SHA256_FINGERPRINT',
];

const missing = required.filter((name) => !process.env[name]);

if (missing.length) {
  console.error(`Missing required environment values: ${missing.join(', ')}`);
  process.exitCode = 1;
} else {
  console.log('Mirror Trip share-link configuration is complete.');
}
