import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { repositoryRoot } from '../evidence';
import { isPublicSource } from './scope';

// These are existing local-only explanations, moved verbatim rather than granted
// source-redistribution rights. A public source build never opens this input.
const local = isPublicSource ? null : JSON.parse(readFileSync(resolve(repositoryRoot, 'src/content/local-publication-context.json'), 'utf8')) as Record<string,string>;
export function localExplanation(key: string): string {
  const text = local?.[key];
  if (!text) throw new Error(`Local-only explanation is absent from this source profile: ${key}`);
  return text;
}
