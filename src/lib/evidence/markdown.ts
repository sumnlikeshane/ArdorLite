import { readFileSync } from 'node:fs';
import { posix, resolve } from 'node:path';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import { assetUrl, claimById, claimUrl, getCase, repositoryRoot, snapshotRoot } from './index';
import { deliveryDiscrepancy } from '../../content/editorial-notes';

type Node = { type: string; value?: string; url?: string; alt?: string; depth?: number; children?: Node[]; data?: Record<string, unknown> };
export function rewriteEvidenceLink(url: string, sourcePath: string): string {
  const routeConfig = JSON.parse(readFileSync(resolve(repositoryRoot, 'config/routes.json'), 'utf8')) as { rewrites: Record<string, string> };
  if (url.startsWith('#')) return url;
  if (/^https:\/\//.test(url)) return url;
  if (/^[a-z][a-z\d+.-]*:/i.test(url) || url.startsWith('/')) throw new Error(`Unsafe archived link: ${url}`);
  const [path, fragment] = url.split('#', 2);
  const target = posix.normalize(posix.join(posix.dirname(sourcePath), decodeURIComponent(path!)));
  if (target.startsWith('../') || target.includes('\\')) throw new Error(`Archived link escapes snapshot: ${url}`);
  const route = routeConfig.rewrites[target] ?? assetUrl(target);
  return fragment && !route.includes('#') ? `${route}#${fragment}` : route;
}
export async function renderCaseMarkdown(slug: string, options: {readableCitations?: boolean} = {}): Promise<string> {
  const case_ = getCase(slug);
  const source = readFileSync(resolve(snapshotRoot, case_.markdownPath), 'utf8');
  const transform = () => (tree: Node) => {
    let annotations = 0;
    const visit = (node: Node) => {
      if (!node.children) return;
      node.children = node.children.flatMap<Node>(child => {
        if (child.type === 'heading' && child.depth === 1) return []; // Site template owns its single h1.
        if (child.type === 'html') {
          const match = child.value?.match(/^<!--\s*claims:\s*([\w,\s-]+)\s*-->$/);
          if (!match) throw new Error(`Unexpected raw HTML in ${case_.markdownPath}`);
          const ids = match[1]!.split(',').map(id => id.trim()).filter(Boolean);
          return [{ type: 'emphasis', children: [
            { type: 'text', value: ' Evidence: ' },
            ...ids.flatMap((id, index) => {
              const claim = claimById.get(id);
              if (!claim || claim.case_id !== slug) throw new Error(`Wrong-case citation ${id} in ${slug}`);
              return [...(index ? [{ type: 'text', value: ', ' }] : []), { type: 'link', url: claimUrl(id), children: [{ type: 'text', value: options.readableCitations ? claim.description : id }] }];
            }),
          ] }];
        }
        if (child.type === 'image' && child.url) {
          const target = posix.normalize(posix.join(posix.dirname(case_.markdownPath), child.url));
          const figure = target.match(/^charts\/generated\/([\w-]+)\.(?:svg|png)$/);
          if (!figure || !case_.figureIds.includes(figure[1]!)) throw new Error(`Unmapped case figure: ${target}`);
          return [{ type: 'link', url: `/research/cases/${slug}/#figure-${figure[1]}`, children: [{ type: 'text', value: `View reviewed figure: ${child.alt ?? figure[1]}` }] }];
        }
        const isDeliveryDefinition = slug === deliveryDiscrepancy.caseId && child.type === 'paragraph'
          && child.children?.some(part => part.type === 'html' && /\bdelivery-abs-floor\b/.test(part.value ?? ''));
        if (child.type === 'link' && child.url) child.url = rewriteEvidenceLink(child.url, case_.markdownPath);
        visit(child);
        if (isDeliveryDefinition) {
          annotations++;
          return [child, {
            type: 'blockquote',
            data: { hName: 'aside', hProperties: { id: deliveryDiscrepancy.id, className: ['evidence-note'], ariaLabel: deliveryDiscrepancy.title } },
            children: [
              { type: 'heading', depth: 3, children: [{ type: 'text', value: deliveryDiscrepancy.title }] },
              ...deliveryDiscrepancy.paragraphs.map(value => ({ type: 'paragraph', children: [{ type: 'text', value }] })),
              { type: 'paragraph', children: [
                { type: 'text', value: 'Inspected source locators: ' },
                { type: 'inlineCode', value: deliveryDiscrepancy.locators.join('; ') },
                { type: 'text', value: '. Original paths are provenance labels; complete sources are not downloadable.' },
              ] },
              { type: 'paragraph', children: [
                { type: 'link', url: claimUrl('delivery-abs-floor'), children: [{ type: 'text', value: 'Archived floor claim' }] },
                ...deliveryDiscrepancy.sourceIds.flatMap(id => [
                  { type: 'text', value: ' · ' },
                  { type: 'link', url: `/evidence/sources/#${id}`, children: [{ type: 'text', value: id }] },
                ]),
              ] },
            ],
          }];
        }
        return [child];
      });
    };
    visit(tree);
    if (slug === deliveryDiscrepancy.caseId && annotations !== 1) throw new Error('Delivery definition must have exactly one authored discrepancy note');
  };
  const result = await unified().use(remarkParse).use(remarkGfm).use(transform).use(remarkRehype).use(rehypeStringify).process(source);
  return String(result);
}
