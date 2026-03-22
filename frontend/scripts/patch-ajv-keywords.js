/**
 * Re-apply ajv-keywords fix after npm install.
 * Fixes: TypeError in extendFormats when ajv._formats is undefined (ajv 8).
 */
const fs = require('fs');
const path = require('path');

const nodeModules = path.join(__dirname, '..', 'node_modules');
const needle = 'var formats = ajv._formats;\n  for (var name in COMPARE_FORMATS)';
const replacement = 'var formats = ajv._formats;\n  if (!formats) return;\n  for (var name in COMPARE_FORMATS)';

function walkDir(dir, callback) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules') walkDir(full, callback);
      else walkDir(full, callback);
    } else if (e.name === '_formatLimit.js' && dir.replace(/\\/g, '/').includes('ajv-keywords/keywords')) {
      callback(full);
    }
  }
}

let patched = 0;
walkDir(nodeModules, (file) => {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes(needle) && !content.includes('if (!formats) return;')) {
    content = content.replace(needle, replacement);
    fs.writeFileSync(file, content);
    patched++;
  }
});
if (patched > 0) {
  console.log('patch-ajv-keywords: patched', patched, 'file(s)');
}
