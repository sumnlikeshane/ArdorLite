import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { isPublicSource } from '../publication/scope';
import { SourceExcerptSchema } from './schema';
import { validateSourceManifest } from './provenance';
const root = fileURLToPath(new URL('../../../', import.meta.url));
const read = (path:string) => JSON.parse(readFileSync(resolve(root,path),'utf8'));
const {text: omittedTextSchema, ...metadataShape} = SourceExcerptSchema.shape;
export const PublicExcerptSchema = z.object(metadataShape).extend({contentOmitted:z.literal(true)}).strict().refine(value=>value.lineEnd>=value.lineStart,'Reversed source line range');
const publicData = isPublicSource ? read('src/content/public-provenance.json') : null;
export type ReadingExcerpt = z.infer<typeof SourceExcerptSchema> | z.infer<typeof PublicExcerptSchema>;
export function readingManifest(path:string): {excerpts: ReadingExcerpt[]} {
  if (!isPublicSource) return validateSourceManifest(read(path));
  if (existsSync(resolve(root,path))) throw new Error('Private capture present in public-source profile');
  return {excerpts:z.array(PublicExcerptSchema).min(1).parse(publicData.manifests[path].excerpts)};
}
export const walkthroughSource = (isPublicSource ? publicData.walkthrough : read('src/content/walkthrough-source.json')) as {
  capturedOn:string; notice:string; excerpts:Array<{id:string;title:string;path:string;startLine:number;endLine:number;fileSha256:string;excerptSha256:string;code?:string;contentOmitted?:true}>;
};
