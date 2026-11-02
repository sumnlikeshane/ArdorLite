import { ExperienceDefinitionSchema } from '../../lib/experiences/schema';
import { bridgeExperience } from './bridge';

// Discovery metadata only. Case instruments are implemented one complete slice at a time.
export const caseExperiences = [
  { id: 'atlas-experience', caseId: 'atlas-ssf', visualKind: 'atlas-translation', question: 'Can an observation survive execution?', implementationStatus: 'entry-only', limitations: ['The new translation instrument is planned; the complete reviewed case remains available.'], operations: [] },
  { id: 'momentum-experience', caseId: 'momentum-v2', visualKind: 'momentum-questions', question: 'What did the passing test actually establish?', implementationStatus: 'existing', limitations: ['The existing synthetic signal walkthrough remains available. The separate attribution-question instrument is planned.'], operations: [] },
  { id: 'swing-experience', caseId: 'swing-autopsy', visualKind: 'swing-anatomy', question: 'Did correcting the accounting change the conclusion?', implementationStatus: 'entry-only', limitations: ['The new anatomy instrument is planned; the complete reviewed case remains available.'], operations: [] },
  { id: 'trend-experience', caseId: 'trend-quality', visualKind: 'trend-window', question: 'What could the decision know?', implementationStatus: 'entry-only', limitations: ['The predecessor engine hash differs from current source; no historical replay is claimed.'], operations: [] },
  { id: 'delivery-experience', caseId: 'delivery-insider', visualKind: 'event-clocks', question: 'Does co-occurrence predict what happens next?', implementationStatus: 'entry-only', limitations: ['The June historical event-builder identity is unrecovered; current code cannot establish its exact construction.'], operations: [] },
  bridgeExperience,
].map(value => ExperienceDefinitionSchema.parse(value));
