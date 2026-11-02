/** Build-time authored additions. This module is never imported by a browser. */
import { existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';

export const entrySchema = z.object({
  schemaVersion: z.literal(1),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80).refine(s => !['index', 'new', 'admin', 'api'].includes(s)),
  kind: z.enum(['research', 'decision', 'publication']),
  title: z.string().trim().min(1).max(180),
  summary: z.string().trim().max(500),
  date: z.iso.date(),
  status: z.enum(['draft', 'published', 'archived']),
  resumeStatus: z.enum(['draft', 'published']).optional(),
  references: z.array(z.string().regex(/^\/(?!\/)[^\s\\]*$/)).max(50),
  rights: z.object({ state: z.enum(['unknown', 'local-only', 'allowed', 'restricted']), basis: z.string().nullable() }).strict(),
}).strict();
export type EntryMetadata = z.infer<typeof entrySchema>;
export type Entry = EntryMetadata & { body: string };
export const entryUrl = (entry: Pick<Entry, 'slug'>) => `/writing/${entry.slug}/`;
export const requiredSections = ['Question', 'Mechanism', 'Comparison and evaluation', 'Decision', 'Limitations', 'Evidence'];

type Node = { type: string; depth?: number; value?: string; url?: string; children?: Node[]; data?: { hProperties?: { id: string } } };
const text = (node: Node): string => node.value ?? node.children?.map(text).join('') ?? '';
export function validateEntry(entry: Entry): void {
  entrySchema.parse(Object.fromEntries(Object.entries(entry).filter(([key]) => key !== 'body')));
  const tree = unified().use(remarkParse).use(remarkGfm).parse(entry.body) as Node;
  function visit(node: Node) {
    if (node.type === 'heading' && node.depth === 1) throw new Error(`${entry.slug}: the page title supplies the only level-one heading`);
    if (['html', 'image', 'imageReference'].includes(node.type)) throw new Error(`${entry.slug}: raw HTML and embedded images require a separately reviewed asset/renderer change`);
    if (node.url && !/^(?:https:\/\/[^\s]+|\/(?!\/)[^\s\\]*|#[^\s]+)$/.test(node.url)) throw new Error(`${entry.slug}: unsafe or relative URL ${node.url}`);
    node.children?.forEach(visit);
  }
  visit(tree);
  if (entry.status !== 'published') return;
  if (entry.summary.length < 20 || entry.references.length === 0) throw new Error(`${entry.slug}: inclusion requires a summary and evidence references`);
  if (/\b(?:TODO|TBD|REPLACE_ME)\b/.test(entry.body)) throw new Error(`${entry.slug}: finish the draft placeholders before inclusion`);
  const headings = tree.children ?? [];
  for (const name of requiredSections) {
    const matches = headings.map((node, index) => ({ node, index })).filter(({ node }) => node.type === 'heading' && node.depth === 2 && text(node) === name);
    if (matches.length !== 1) throw new Error(`${entry.slug}: exactly one '## ${name}' section is required`);
    const start = matches[0]!.index + 1;
    const section = headings.slice(start).slice(0, headings.slice(start).findIndex(n => n.type === 'heading' && n.depth === 2) < 0 ? undefined : headings.slice(start).findIndex(n => n.type === 'heading' && n.depth === 2));
    if (section.filter(n => n.type !== 'heading' && n.type !== 'code').map(text).join(' ').trim().length < 30) throw new Error(`${entry.slug}: explain ${name} before inclusion`);
  }
  if (entry.rights.state === 'allowed' && !entry.rights.basis?.trim()) throw new Error(`${entry.slug}: allowed rights require a material-specific basis`);
}

export function loadEntries(root = process.cwd()): Entry[] {
  const directory = resolve(root, 'src/content/entries');
  // Refuse symlinks at every controlled level, including an otherwise empty collection.
  for (const part of ['src', 'src/content', 'src/content/entries']) {
    const path = resolve(root, part);
    if (existsSync(path) && lstatSync(path).isSymbolicLink()) throw new Error(`Symlink prohibited: ${part}`);
  }
  if (!existsSync(directory)) return [];
  return readdirSync(directory).sort().map(slug => {
    const folder = resolve(directory, slug);
    if (!lstatSync(folder).isDirectory() || lstatSync(folder).isSymbolicLink()) throw new Error(`Unexpected entry path: ${slug}`);
    if (JSON.stringify(readdirSync(folder).sort()) !== JSON.stringify(['body.md', 'entry.json'])) throw new Error(`${slug}: expected only entry.json and body.md`);
    for (const name of ['body.md', 'entry.json']) if (!lstatSync(resolve(folder, name)).isFile() || lstatSync(resolve(folder, name)).isSymbolicLink()) throw new Error(`Unsafe entry file: ${slug}/${name}`);
    const meta = entrySchema.parse(JSON.parse(readFileSync(resolve(folder, 'entry.json'), 'utf8')));
    if (meta.slug !== slug) throw new Error(`Entry slug/directory mismatch: ${slug}`);
    const entry = { ...meta, body: readFileSync(resolve(folder, 'body.md'), 'utf8') };
    validateEntry(entry);
    return entry;
  }).sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
}

export async function renderEntry(entry: Entry): Promise<string> {
  validateEntry(entry);
  const headingIds = () => (tree: Node) => {
    const used = new Map<string, number>();
    function visit(node: Node) {
      if (node.type === 'heading') {
        const base = text(node).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'section';
        const count = (used.get(base) ?? 0) + 1; used.set(base, count);
        node.data = { hProperties: { id: count === 1 ? base : `${base}-${count}` } };
      }
      node.children?.forEach(visit);
    }
    visit(tree);
  };
  return String(await unified().use(remarkParse).use(remarkGfm).use(headingIds).use(remarkRehype).use(rehypeStringify).process(entry.body));
}
