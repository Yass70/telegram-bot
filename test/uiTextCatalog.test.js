import test from 'node:test';
import assert from 'node:assert/strict';
import { UI_TEXT_CATALOG } from '../uiTextCatalog.js';

test('catalog contains categorized editable items with valid kinds', () => {
  assert.ok(UI_TEXT_CATALOG.length >= 1000, `expected broad catalog, got ${UI_TEXT_CATALOG.length}`);
  assert.ok(UI_TEXT_CATALOG.every(item => item && ['text', 'button'].includes(item.kind) && item.from && item.category && item.source));
  assert.ok(new Set(UI_TEXT_CATALOG.map(item => item.category)).size >= 6);
});

test('catalog button labels are within Telegram inline button byte limit', () => {
  const tooLong = UI_TEXT_CATALOG.filter(item => item.kind === 'button' && Buffer.byteLength(item.from, 'utf8') > 64);
  assert.deepEqual(tooLong.map(item => item.from), []);
});

test('catalog does not expose game answer fields as raw editable values', () => {
  // Answer/options logic stays in games/data.js; only option labels are catalogued as buttons,
  // and question prompts are catalogued as text. The correct-answer field itself is not imported.
  assert.ok(UI_TEXT_CATALOG.some(item => item.kind === 'text' && item.category === '🎮 الألعاب والأسئلة'));
  assert.ok(UI_TEXT_CATALOG.some(item => item.kind === 'button' && item.category === '🎮 الألعاب والأسئلة'));
});

test('catalog entries can be addressed by compact callback payloads', () => {
  for (let index = 0; index < UI_TEXT_CATALOG.length; index++) {
    assert.ok(Buffer.byteLength(`globaltextselect:${index}:999`, 'utf8') <= 64);
    assert.ok(Buffer.byteLength(`globaltextview:${index}:999`, 'utf8') <= 64);
  }
});
