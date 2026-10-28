import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function collectJs(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...collectJs(full));
    else if (entry.isFile() && full.endsWith('.js')) files.push(full);
  }
  return files;
}

test('all relative JavaScript imports point to existing files', () => {
  const files = collectJs(root);
  const missing = [];
  const importPattern = /(?:from\s*|import\s*)['"](\.{1,2}\/[^'"]+)['"]/g;
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    for (const match of source.matchAll(importPattern)) {
      const specifier = match[1];
      const target = path.resolve(path.dirname(file), specifier);
      if (!fs.existsSync(target)) missing.push(`${path.relative(root, file)} -> ${specifier}`);
    }
  }
  assert.deepEqual(missing, [], `Missing relative imports:\n${missing.join('\n')}`);
});

test('uiTextCatalog.js is at the project root expected by callbacks.js', () => {
  assert.ok(fs.existsSync(path.join(root, 'uiTextCatalog.js')));
  const callbacks = fs.readFileSync(path.join(root, 'commands', 'callbacks.js'), 'utf8');
  assert.match(callbacks, /from ['"]\.\.\/uiTextCatalog\.js['"]/);
});
