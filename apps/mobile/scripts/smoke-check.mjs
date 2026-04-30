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
  'lib/api.js',
  'lib/storage.js',
];

async function ensureFileExists(relativePath) {
  const absolutePath = path.join(mobileRoot, relativePath);
  await access(absolutePath);
}

async function verifyBackendEnv() {
  const envPath = path.join(mobileRoot, '.env');
  const content = await readFile(envPath, 'utf8');
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
