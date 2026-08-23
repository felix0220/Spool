import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const source = readFileSync(
  fileURLToPath(new URL('../src/components/front/ReferenceFrontConsole.jsx', import.meta.url)),
  'utf8',
);

const transportSource = source.match(/function ScreenTapeTransport\([\s\S]*?\n}\n\nfunction ReferenceFrontConsole/)?.[0] || '';

test('screen tape transport declares every volume render value before use', () => {
  assert.notEqual(transportSource, '', 'ScreenTapeTransport source should be present');
  for (const name of ['volumeX', 'volumeY', 'volumeWidth', 'volumeValue']) {
    assert.match(transportSource, new RegExp(`const ${name}\\s*=`), `${name} must be declared in ScreenTapeTransport`);
  }
  assert.match(transportSource, /Number\.isFinite\(volume\)/, 'volume fallback must remain finite when the prop is absent');
});
