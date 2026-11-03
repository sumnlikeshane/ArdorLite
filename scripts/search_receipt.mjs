/** Write current-run search evidence, including fresh/nested output destinations. */
import {mkdir, writeFile} from 'node:fs/promises';
import {dirname} from 'node:path';

export async function writeSearchReceipt(destination, report) {
  await mkdir(dirname(destination), {recursive: true});
  await writeFile(destination, JSON.stringify(report, null, 2) + '\n');
}
