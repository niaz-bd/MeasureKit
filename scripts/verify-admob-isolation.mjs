/**
 * Ensures only src/admobNative.ts may import/require the AdMob package.
 * Run: node scripts/verify-admob-isolation.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'src');
const needle = /(?:from\s+|require\s*\(\s*)['"]react-native-google-mobile-ads['"]/;
const allowed = new Set([path.normalize(path.join(src, 'admobNative.ts'))]);

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(tsx?|jsx?)$/.test(name)) out.push(p);
  }
  return out;
}

const offenders = [];
for (const file of walk(src)) {
  const text = fs.readFileSync(file, 'utf8');
  if (!needle.test(text)) continue;
  if (allowed.has(path.normalize(file))) continue;
  offenders.push(path.relative(root, file));
}

if (offenders.length) {
  console.error('AdMob import/require outside admobNative.ts:\n', offenders.join('\n'));
  process.exit(1);
}

console.log('OK: only src/admobNative.ts imports react-native-google-mobile-ads');
