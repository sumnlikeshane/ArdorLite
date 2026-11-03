import {readdirSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import type {PagefindIndex} from 'pagefind';

// Pagefind's directory walk follows filesystem order. Feed its ordinary HTML
// parser serially in path order so page IDs and postings agree across runners.
export async function addHTMLDirectory(index: PagefindIndex, root: string) {
 const paths: string[] = [];
 function walk(relative: string) {
  for (const entry of readdirSync(join(root, relative), {withFileTypes: true})) {
   const path = relative ? `${relative}/${entry.name}` : entry.name;
   if (entry.isSymbolicLink()) throw Error(`Symlink in search inputs: ${path}`);
   if (entry.isDirectory()) walk(path);
   else if (entry.isFile() && path.endsWith('.html')) paths.push(path);
  }
 }
 walk('');
 paths.sort();
 for (const path of paths) {
  const result = await index.addHTMLFile({sourcePath: path, content: readFileSync(join(root, path), 'utf8')});
  if (result.errors.length) throw Error(result.errors.join('\n'));
 }
 return paths.length;
}
