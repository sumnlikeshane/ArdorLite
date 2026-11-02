/** Read-only authored-entry validation shared by private and public builds. */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEntries } from '../src/lib/publication/entries';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const entries = loadEntries(root);
console.log(`Validated ${entries.length} authored entries; ${entries.filter(entry => entry.status === 'published').length} included locally.`);
