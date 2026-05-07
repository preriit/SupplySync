import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mobileRoot = path.resolve(__dirname, '..');

const requiredFiles = [
  'app/login.js',
  'app/dashboard.js',
  'app/inventory/index.js',
  'app/inventory/[subcategoryId]/products.js',
  'app/inventory/[subcategoryId]/products/[productId].js',
  'app/search.js',
  'app/stock-alerts.js',
  'app/reports.js',
  'app/activity.js',
  'app/profile.js',
  'app/team-members.js',
  'components/DealerTabBar.js',
  'components/DealerAppBar.js',
  'components/DealerMenuSheet.js',
  'components/DealerStackHeader.js',
  'components/DealerBackButton.js',
  'theme/typography.js',
  'lib/api.js',
  'lib/storage.js',
  'lib/dashboardAlertDigest.js',
];

async function ensureFileExists(relativePath) {
  const absolutePath = path.join(mobileRoot, relativePath);
  await access(absolutePath);
}

async function verifyBackendEnv() {
  if (process.env.EXPO_PUBLIC_BACKEND_URL) {
    return;
  }
  const envPath = path.join(mobileRoot, '.env');
  let content = '';
  try {
    content = await readFile(envPath, 'utf8');
  } catch (_error) {
    if (process.env.CI) {
      console.warn('apps/mobile/.env not found in CI, skipping local env file check');
      return;
    }
    throw new Error('Missing apps/mobile/.env and EXPO_PUBLIC_BACKEND_URL env var');
  }
  const hasBackendVar = /^EXPO_PUBLIC_BACKEND_URL=.+$/m.test(content);
  if (!hasBackendVar) {
    throw new Error('Missing EXPO_PUBLIC_BACKEND_URL in apps/mobile/.env');
  }
}

async function main() {
  for (const file of requiredFiles) {
    await ensureFileExists(file);
  }
  await verifyBackendEnv();
  console.log('mobile smoke checks passed');
}

main().catch((error) => {
  console.error(`mobile smoke checks failed: ${error.message}`);
  process.exit(1);
});
