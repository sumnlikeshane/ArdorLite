import { cases, records, claims, sources, figures, methods, publicationAssets } from './index';
import { buildEvidenceCrosswalk, type ExcerptReference } from './relationships';
import { methodCaseContext } from '../../content/evidence-context';
import captureSelection from '../../../config/experience-sources.json';
import { walkthroughSource as walkthrough, readingManifest } from '../experiences/captures';
import dispositions from '../../../config/material-dispositions.json';

const excerpts: ExcerptReference[] = captureSelection.manifests.flatMap(path => {
  const manifest = readingManifest(path);
  const route = captureSelection.embeddedRoutes[path as keyof typeof captureSelection.embeddedRoutes].replace(/index\.html$/, '');
  return manifest.excerpts.map(excerpt => ({ id: excerpt.id, path: excerpt.path, sha256: excerpt.sha256,
    href: `/${route}#${excerpt.id}-capture`, label: `${excerpt.symbol} · lines ${excerpt.lineStart}–${excerpt.lineEnd} · captured ${excerpt.capturedAt} · ${excerpt.historicalRelation}` }));
});
excerpts.push(...walkthrough.excerpts.map(excerpt => ({ id: `walkthrough-${excerpt.id}`, path: excerpt.path,
  sha256: excerpt.fileSha256, href: `/research/walkthrough/#walkthrough-source-${excerpt.id}`,
  label: `${excerpt.title} · lines ${excerpt.startLine}–${excerpt.endLine} · captured ${walkthrough.capturedOn} · historical parity not established` })));

export const evidenceCrosswalk = buildEvidenceCrosswalk({ cases, records, claims, sources, figures: figures.map(figure => figure.spec),
  methods, assets: publicationAssets, excerpts, methodCases: methodCaseContext });
export type { Entity } from './relationships';

// Read S1 dispositions; never infer permission from an export or relationship.
export function materialDisposition(category: keyof typeof dispositions.materials, id: string) {
  const assignments = dispositions.materials[category] as Record<string, string>;
  const profile = assignments[id];
  if (!profile || !Object.hasOwn(dispositions.profiles, profile)) throw new Error(`Missing material disposition: ${category}/${id}`);
  return dispositions.profiles[profile as keyof typeof dispositions.profiles];
}
