import { isPublicSource } from '../src/lib/publication/scope';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { claims, repositoryRoot, snapshotRoot, claimById, sourceById, figureById } from '../src/lib/evidence';
import { studies, claimPresentation, publicationDependencies } from '../src/lib/publication';
import { rolloutCompositions } from '../src/content/research/rollout';
import { trendSupplementHash } from '../src/lib/publication/supplement';

const hash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const fileHash = (path: string) => hash(readFileSync(resolve(repositoryRoot, path)));
const renderers = ['src/components/CasePilot.astro','src/components/ClaimEntry.astro','src/components/EvidenceFigure.astro',
  'src/components/SourceEntry.astro','src/components/TrendFoldContext.astro','src/components/ReproductionLabel.astro',
  'src/scripts/evidence-locate.ts','src/styles/case-pilot.css','src/styles/evidence.css','src/scripts/pilot-disclosures.ts',
  'src/layouts/SiteLayout.astro','src/styles/global.css','src/styles/tokens.css','src/scripts/experiences/bridge.ts',
  'src/pages/research/cases/[slug].astro','src/styles/research-presentation.css','src/scripts/research-reading.ts','src/components/experiences/BridgePipeline.astro',
  ...readdirSync(resolve(repositoryRoot,'src/components/research')).filter(p=>p.endsWith('.astro')).sort().map(p=>`src/components/research/${p}`)];
const shared = ['src/content/explanations/pilots.ts','src/lib/publication/index.ts','src/lib/publication/gates.ts','src/lib/publication/supplement.ts','config/evidence-supplements.json',
  'src/pages/index.astro','src/pages/about.astro','src/pages/research/index.astro','src/pages/research/catalog.astro','src/pages/research/records/[id].astro','src/pages/methods/index.astro','src/scripts/catalog.ts','src/scripts/catalog-return.ts',
  'src/content/research/trend-quality.ts','src/content/research/rollout.ts','src/content/explanations/rollout.ts','src/lib/research/presentation.ts'];
const snapshotManifestSha256 = hash(readFileSync(resolve(snapshotRoot,'evidence/manifest.json')));
const dependencies = publicationDependencies.map(dep => {
  assert.equal(new Set(dep.claimIds).size, dep.claimIds.length);
  for (const id of dep.claimIds) {
    assert.equal(claimById.get(id)?.case_id, dep.studyId);
    assert.equal(claimPresentation(id)?.study.id, dep.studyId);
  }
  for (const id of dep.sourceIds) assert.ok(sourceById.has(id));
  for (const id of dep.figureIds) assert.equal(figureById.get(id)?.spec.case_id, dep.studyId);
  const files = [...shared,...renderers].map(path => ({ path, sha256: fileHash(path) }));
  const digest = hash(JSON.stringify({ dep, study:studies.find(s=>s.id===dep.studyId), files, snapshotManifestSha256, trendSupplementHash,
    evidence:dep.claimIds.map(id=>claimById.get(id)) }));
  return { ...dep, files, dependencyDigest: digest, reviewState:'authored_source_review_recorded; human_scientific_acceptance_pending',
    humanReaderValidation:'unperformed', scientificAcceptance:'not_recorded',
    determiningInputState:isPublicSource?'private_inputs_excluded_not_verified; archived_flags_only; no_condition_reconstruction':dep.studyId==='trend-quality'?'approved_local_supplement; four_complete_conjunctions_agree; partial_excluded':'canonical_reviewed_derivatives; unavailable_premises_preserved; no_original_research_rerun' };
});
assert.equal(dependencies.flatMap(d=>d.claimIds).length,204);
const outside = claims.filter(c=>!studies.some(s=>s.id===c.case_id));
assert.equal(outside.length,0);
const report = {schemaVersion:1,planId:'AL-COMP-001',status:'structurally_verified_not_accepted',snapshotManifestSha256,
  dependencies,affectedSurfaceTypes:['case guide','claim direct entry in case and registry','figure/table','source entry','reproduction context'],
  legacyNonpilotClaims:outside.map(c=>c.id),
  freshnessRule:'Any changed evidence, rule, authored context or listed renderer changes the digest. An acceptance receipt may apply only to its exact matching digest and observed scope. This report never grants acceptance.',
  gates:{S3:'rendered_design_approved',S4:'structural_rollout_verified; final_browser_rendered_state_in_dated_receipt',humanComprehension:'unperformed',trendFoldReconstruction:isPublicSource?'private_supplement_absent; archived_flags_only':'saved_inputs_inspectable; no_research_rerun'}};
writeFileSync(resolve(repositoryRoot,'receipts/publication-context.json'),JSON.stringify(report,null,2)+'\n');
for(const composition of rolloutCompositions) {
 assert.deepEqual([...composition.chapters.flatMap(c=>c.figureId?[c.figureId]:[])].sort(), dependencies.find(d=>d.studyId===composition.caseId)!.figureIds.slice().sort());
}
console.log('Publication context: all 204 mappings, 18 figures and 6 dependency scopes verified; zero legacy claim exceptions. No scientific/human acceptance granted.');
