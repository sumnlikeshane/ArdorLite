import assert from 'node:assert/strict';
import test from 'node:test';
import { extractAstro, extractStructured } from '../scripts/prose_check.mjs';

test('actual Astro parser extracts visible prose and both conditional branches without code or machine attributes', () => {
  const source = `---
import x from './internal module';
const title = 'A human title';
---
<section class="internal class" data-secret="never prose">
<h2>{title}</h2><p>Concrete mechanism before evidence.</p>
<p>{flag ? 'First visible branch.' : 'Second visible branch.'}</p>
<img alt="A labelled original figure" src="/internal path" />
<code>preserve complete flag</code><script>const text='never lint script';</script>
</section>`;
  const text = extractAstro(source).map(s => s.text).join('\n');
  for (const expected of ['A human title', 'Concrete mechanism before evidence.', 'First visible branch.', 'Second visible branch.', 'A labelled original figure']) assert.ok(text.includes(expected), expected);
  for (const excluded of ['internal module', 'internal class', 'never prose', 'internal path', 'preserve complete flag', 'never lint script']) assert.ok(!text.includes(excluded), excluded);
  assert.equal(extractAstro(source).find(s => s.text === 'Concrete mechanism before evidence.').line, 6);
});

test('structured prose includes authored strings without executing imports or including comments and types', () => {
  const source = `import x from 'never execute import';
// not a publication sentence
type Internal = 'never check type';
export const note = { summary: 'A concrete research question.', id: 'x9' };`;
  assert.deepEqual(extractStructured(source, 'ts').map(s => s.text), ['A concrete research question.']);
  assert.deepEqual(extractStructured('{"summary":"A human summary.","id":"x9"}', 'json').map(s => s.text), ['A human summary.']);
});

test('interpolated authored prose and Unicode line locators remain inspectable', () => {
  const values=extractStructured('export const description = `Keep the earlier threshold ${count} while the later period is tested.`;','ts');
  assert.ok(values.some(s=>s.text.includes('Keep the earlier threshold')));
  assert.ok(values.some(s=>s.text.includes('while the later period is tested.')));
  const source='<p>'+'₹'.repeat(100)+'</p>\n<p>Check this exact location.</p>\n<p>Later sentence to distinguish offsets.</p>';
  assert.equal(extractAstro(source).find(s=>s.text==='Check this exact location.').line,2);
});
