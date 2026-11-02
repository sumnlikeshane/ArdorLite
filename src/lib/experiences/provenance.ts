import { createHash } from 'node:crypto';
import { SourceManifestSchema, SourceSpanSchema, type SourceManifest, type SourceExcerpt } from './schema';

export function validateSourceManifest(input: unknown): SourceManifest {
  const manifest = SourceManifestSchema.parse(input);
  const ids = new Set<string>();
  for (const excerpt of manifest.excerpts) {
    if (ids.has(excerpt.id)) throw new Error(`Duplicate source excerpt: ${excerpt.id}`);
    ids.add(excerpt.id);
    const segments = excerpt.path.split('/');
    if (!/^[a-zA-Z0-9_./-]+$/.test(excerpt.path) || segments.some(segment => !segment || segment === '.' || segment === '..')) {
      throw new Error(`Unsafe repository-relative source path: ${excerpt.path}`);
    }
    if (excerpt.text.includes('\r') || !excerpt.text.endsWith('\n')) throw new Error(`Source normalization mismatch: ${excerpt.id}`);
    const lines = excerpt.text.split('\n').length - 1;
    if (lines !== excerpt.lineEnd - excerpt.lineStart + 1) throw new Error(`Source line count mismatch: ${excerpt.id}`);
    if (createHash('sha256').update(excerpt.text, 'utf8').digest('hex') !== excerpt.excerptSha256) throw new Error(`Source excerpt hash mismatch: ${excerpt.id}`);
  }
  return manifest;
}

export function validateSourceSpan(input: unknown, excerpts: readonly Pick<SourceExcerpt, 'id' | 'lineStart' | 'lineEnd'>[]): void {
  const span = SourceSpanSchema.parse(input);
  const excerpt = excerpts.find(item => item.id === span.excerptId);
  if (!excerpt || span.lineStart < excerpt.lineStart || span.lineEnd > excerpt.lineEnd || span.lineEnd < span.lineStart) {
    throw new Error(`Source highlight outside captured range: ${span.excerptId}`);
  }
}
