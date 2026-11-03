import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {writeSearchReceipt} from '../scripts/search_receipt.mjs';

for (const name of ['acceptance', 'performance']) {
  test(`${name} receipt creates a fresh nested destination and preserves earlier runs`, async () => {
    const root = await mkdtemp(join(tmpdir(), 'ardor-search-receipt-'));
    try {
      const first = join(root, 'receipts', 'search', name, 'first.json');
      const next = join(root, 'receipts', 'search', name, 'second.json');
      await writeSearchReceipt(first, {status: 'failed', failures: ['fixture failure'], artifactIdentity: 'first'});
      const retained = await readFile(first, 'utf8');
      await writeSearchReceipt(next, {status: 'passed', artifactIdentity: 'second'});
      assert.equal(await readFile(first, 'utf8'), retained);
      assert.equal(JSON.parse(retained).status, 'failed');
      assert.deepEqual(JSON.parse(await readFile(next, 'utf8')), {status: 'passed', artifactIdentity: 'second'});
    } finally { await rm(root, {recursive: true, force: true}); }
  });
}
