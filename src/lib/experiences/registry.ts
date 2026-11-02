import selection from '../../../config/experience-sources.json';
import { readingManifest, type ReadingExcerpt } from './captures';
import { engineeringExperience } from '../../content/experiences/engineering';
import { caseExperiences } from '../../content/experiences/index';
import { caseById, claimById, recordById, sourceById, figureById } from '../evidence/index';
import { ExperienceDefinitionSchema, type ExperienceDefinition } from './schema';

export { caseExperiences, engineeringExperience };
export const sourceExcerpts = selection.manifests.flatMap(path => readingManifest(path).excerpts);

function pointerExists(value: unknown, pointer: string): boolean {
  let current = value;
  for (const part of pointer.slice(1).split('/').map(value => value.replace(/~1/g, '/').replace(/~0/g, '~'))) {
    if (typeof current !== 'object' || current === null || !Object.hasOwn(current, part)) return false;
    current = (current as Record<string, unknown>)[part];
  }
  return true;
}

export function validateExperienceReferences(definitions: readonly ExperienceDefinition[], excerpts: readonly ReadingExcerpt[]): void {
  const ids = new Set<string>();
  const excerptIds = new Set(excerpts.map(excerpt => excerpt.id));
  if (excerptIds.size !== excerpts.length) throw new Error('Duplicate source excerpt identity');
  for (const input of definitions) {
    const definition = ExperienceDefinitionSchema.parse(input);
    if (ids.has(definition.id)) throw new Error(`Duplicate experience: ${definition.id}`);
    ids.add(definition.id);
    if (definition.caseId !== null && !caseById.has(definition.caseId)) throw new Error(`Dangling case: ${definition.caseId}`);
    const operationIds = new Set<string>();
    for (const operation of definition.operations) {
      if (operationIds.has(operation.id)) throw new Error(`Duplicate operation: ${operation.id}`);
      operationIds.add(operation.id);
      for (const id of operation.excerptIds) if (!excerptIds.has(id)) throw new Error(`Dangling source excerpt: ${id}`);
      for (const reference of operation.evidenceRefs) {
        let exists: boolean;
        switch (reference.kind) {
          case 'claim': exists = claimById.has(reference.id); break;
          case 'source': exists = sourceById.has(reference.id); break;
          case 'record': exists = recordById.has(reference.id) && pointerExists(recordById.get(reference.id), reference.field); break;
          case 'table': exists = figureById.has(reference.id) && (!reference.field || pointerExists(figureById.get(reference.id)?.table, reference.field)); break;
        }
        if (!exists) throw new Error(`Dangling ${reference.kind} reference: ${reference.id}`);
      }
    }
  }
}

export const experiences = [...caseExperiences, engineeringExperience];
validateExperienceReferences(experiences, sourceExcerpts);
