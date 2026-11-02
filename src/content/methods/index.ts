import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import { z } from 'zod';
import { methodCaseContext } from '../evidence-context';
import { methodAttribution, methodInventory, rewriteEvidenceLink, snapshotRoot, syntheticDemo } from '../../lib/evidence';

type Node = { type: string; value?: string; url?: string; depth?: number; children?: Node[] };
const explanations: Record<string, { heading: string; summary: string; demoKeys: string[] }> = {
  'method-multiple-testing': { heading: 'Multiple testing', summary: 'Keep the declared family complete, then inspect BH and BY adjusted p-values without hiding invalid inputs.', demoKeys: ['bh', 'by'] },
  'method-units': { heading: 'Gross/net bps and fixed initial R', summary: 'Track return fractions, basis points and signed trade P&L with explicit complete costs and a fixed initial risk denominator.', demoKeys: ['units'] },
  'method-cluster-mean': { heading: 'Dependence-aware uncertainty arithmetic', summary: 'Use declared clusters when observations share dependence, and keep undefined uncertainty visible.', demoKeys: ['cluster_mean'] },
  'method-bridge': { heading: 'Finite positive bridge and explicit-input repair', summary: 'Show how rounding can destroy a valid ratio and why repair requires supplied unrounded inputs.', demoKeys: ['bridge'] },
  'method-lagged-quality': { heading: 'Lagged quality and training-only fold calibration', summary: 'Keep prior-session features and training-only calibration separate from future prices and validation observations.', demoKeys: ['lagged_quality'] },
};
export const methodPresentation = (id: string) => {
  const presentation = explanations[id];
  if (!presentation) throw new Error(`No reviewed method explanation mapping for ${id}`);
  return { ...presentation, relatedCase: methodCaseContext[id]! };
};
export const methodReferences = z.array(z.object({ id: z.string(), title: z.string(), url: z.url(), author_copy_url: z.url().optional(), kind: z.string() })).parse(methodAttribution.references);
export const sourceCapabilities = z.array(z.object({ id: z.string(), title: z.string(), maturity: z.string(), treatment: z.string(), source_execution_verified_in_this_preparation: z.literal(false) })).parse(methodInventory.source_capability_inventory);
export const methodDemo = (id: string) => {
  const output = syntheticDemo;
  if (!output) throw new Error('Synthetic demo output must be generated before rendering method pages');
  return Object.fromEntries(methodPresentation(id).demoKeys.map(key => {
    if (!(key in output)) throw new Error(`Missing recorded synthetic output key ${key}`);
    return [key, output[key]];
  }));
};

// Select the reviewed section by its declared heading in the Markdown AST.
// Narrative and source bytes stay in the frozen package; only links are mapped.
export async function renderMethodExplanation(id: string): Promise<string> {
  const sourcePath = 'docs/METHODS.md';
  const source = readFileSync(resolve(snapshotRoot, sourcePath), 'utf8');
  const heading = methodPresentation(id).heading;
  const text = (node: Node): string => node.value ?? node.children?.map(text).join('') ?? '';
  const transform = () => (tree: Node) => {
    const children = tree.children ?? [];
    const start = children.findIndex(node => node.type === 'heading' && node.depth === 3 && text(node) === heading);
    if (start < 0) throw new Error(`Missing reviewed methods section: ${heading}`);
    let end = start + 1;
    while (end < children.length && !(children[end]?.type === 'heading' && (children[end]?.depth ?? 6) <= 3)) end++;
    tree.children = children.slice(start + 1, end);
    const visit = (node: Node) => {
      if (node.type === 'html') throw new Error(`Unexpected raw HTML in reviewed method ${id}`);
      if ((node.type === 'link' || node.type === 'image') && node.url) node.url = rewriteEvidenceLink(node.url, sourcePath);
      node.children?.forEach(visit);
    };
    tree.children.forEach(visit);
  };
  return String(await unified().use(remarkParse).use(remarkGfm).use(transform).use(remarkRehype).use(rehypeStringify).process(source));
}
