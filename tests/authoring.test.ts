import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { loadEntries, validateEntry, renderEntry, requiredSections, type Entry } from '../src/lib/publication/entries';

const root = process.cwd();
const body = requiredSections.map(name => `## ${name}\n\nSynthetic fixture text explaining ${name.toLowerCase()} with explicitly bounded test inputs.\n`).join('\n');
const entry: Entry = { schemaVersion: 1, slug: 'fixture-note', kind: 'research', title: 'Synthetic fixture', summary: 'This synthetic entry tests the local authoring workflow.', date: '2026-10-31', status: 'published', references: ['/evidence/'], rights: { state: 'unknown', basis: null }, body };

test('included entries require a complete argument, evidence links and safe Markdown', async () => {
  validateEntry(entry);
  assert.match(await renderEntry({ ...entry, body: body + '\n[Evidence](/evidence/)\n' }), /href="\/evidence\/"/);
  for (const changed of [
    { ...entry, summary: '' }, { ...entry, references: [] }, { ...entry, body: body + '\nTODO\n' },
    { ...entry, body: body.replace('## Mechanism', '## Missing') },
    { ...entry, body: body + '\n## Decision\nRepeated decision' },
    { ...entry, body: body + '\n<script>alert(1)</script>' },
    { ...entry, body: body + '\n[x](javascript:alert)' },
    { ...entry, body: body + '\n[x](file:///private/secret)' },
    { ...entry, body: body + '\n![x](https://example.invalid/x.png)' },
    { ...entry, rights: { state: 'allowed', basis: '' } },
  ]) assert.throws(() => validateEntry(changed as Entry));
});

test('draft content remains editable but unsafe source paths and identity drift fail closed', () => {
  const temporary = mkdtempSync(resolve(tmpdir(), 'ardor-entry-schema-'));
  try {
    const folder = resolve(temporary, 'src/content/entries/fixture-note'); mkdirSync(folder, { recursive: true });
    const { body: _, ...metadata } = entry;
    writeFileSync(resolve(folder, 'entry.json'), JSON.stringify({ ...metadata, status: 'draft', summary: '', references: [] }));
    writeFileSync(resolve(folder, 'body.md'), 'TODO');
    assert.equal(loadEntries(temporary)[0]?.status, 'draft');
    writeFileSync(resolve(folder, 'entry.json'), JSON.stringify({ ...metadata, slug: 'different' }));
    assert.throws(() => loadEntries(temporary), /mismatch/);
    writeFileSync(resolve(folder, 'entry.json'), JSON.stringify(metadata));
    rmSync(resolve(folder, 'body.md'));
    symlinkSync(resolve(root, 'README.md'), resolve(folder, 'body.md'));
    assert.throws(() => loadEntries(temporary), /Unsafe entry file/);
  } finally { rmSync(temporary, { recursive: true, force: true }); }
});

