import type {Reporter, FullConfig, FullResult, TestCase, TestResult} from '@playwright/test/reporter';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';

// Explicit journey identities prevent a duplicated or unrelated test from filling a coverage gap.
const EXPECTED_JOURNEYS = [
  'Sticky masthead keeps navigation and evidence anchors visible',
  'Responsive masthead menu preserves keyboard and no-JS navigation',
  'S5 judged search tasks and exact canonical destinations retain evidence context',
  'S5 search URL filters reload history invalid state and empty recovery remain usable',
  'S5 search populated facets keyboard loading failure and pagination recover',
  'S5 search reflows with accessible controls and keeps no-JS print browse recovery',
  'S4 six investigations connect reading chapters, exact figures and complete references',
  'S4 catalog common and advanced controls preserve exact state and return to results',
  'S4 migrated pages retain no-JS evidence, print, reflow and accessible collection navigation',
  'Optional Bridge lazy import failure preserves static reading without an unhandled error',
  'Research presentation compares saved measures with keyboard, URL history and exact claim recovery',
  'Research presentation retains figures, fold conditions and full reference without JavaScript and in print',
  'Research presentation opening and distributed figures reflow with accessible navigation',
  'Comprehension pilot preserves local claim context, determining fold inputs and the static Bridge mechanism',
  'S3 pilot decision briefs preserve gates and contextual keyboard history',
  'S3 pilot retains complete no-JS reference and direct anchors in light print',
  'S3 light pilot reflows with enlarged text and accessible controls',
  'S2 registry locate controls restore history and reveal directly linked evidence',
  'S2 contextual references remain complete without JavaScript and reflow across review widths',
  'S2 contextual evidence round trips retain exact anchors and keyboard history',
  'Walkthrough preserves timing, scenario state, history and the recorded verdict',
  'Walkthrough accessible controls, small-screen reading and invalid URL recovery',
  'Walkthrough retains exact source and research context without JavaScript',
  'Home → Atlas → claim → source reading journey @representative',
  'Representative automated accessibility, 320px reflow, reduced motion @representative',
  'Representative reading and tables with JavaScript disabled @representative',
  'Complete publication routes, synthetic boundaries and record gates',
  'Delivery discrepancy and publication scopes remain contextual without JavaScript',
  'Catalog filters persist across history and expose reset and no results',
  'Pagefind production index searches outcome evidence and empty results',
  'Chart enhancements retain HTML tables and reset the complete recorded set',
  'All case and secondary page templates pass automated accessibility',
  'Optional chart and search load failures preserve useful reading',
  'Keyboard skip link, mobile menu, 404 and print remain usable',
  'Research Atlas gives six independent entrances and engineering state survives history',
  'M1 Home and engineering remain accessible across the review viewports',
  'M1 static explanation and exact source remain usable without enhancement',
  'Price Bridge synchronizes bounded repair states, source and immutable historical gates',
  'M2 engineering traces preserve typed missingness, retained records and case-specific paths',
  'M2 Bridge and engineering support responsive source inspection and automated accessibility',
  'M2 complete arguments and source remain readable without JavaScript or module loading',
] as const;

export default class BrowserReporter implements Reporter {
  tests: Array<Record<string, unknown>> = [];
  engines: string[] = [];
  initialIdentity: string | null = null;
  onBegin(config: FullConfig) {
    this.engines = config.projects.map(p => p.name);
    try { this.initialIdentity = JSON.parse(readFileSync('receipts/output-audit.json', 'utf8')).artifactIdentity; } catch {}
  }
  onTestEnd(test: TestCase, result: TestResult) {
    this.tests.push({title: test.titlePath().join(' / '), journeyTitle: test.title, project: test.parent.project()?.name,
      status: result.status, durationMs: result.duration,
      error: result.error?.message, annotations: test.annotations});
  }
  onEnd(result: FullResult) {
    let artifactIdentity: string | null = null;
    try { artifactIdentity = JSON.parse(readFileSync('receipts/output-audit.json', 'utf8')).artifactIdentity; } catch {}
    const representative = this.tests.every(t => String(t.title).includes('@representative')) && this.tests.length === 9;
    const complete = ['chromium', 'firefox', 'webkit'].every(project => {
      const results = this.tests.filter(t => t.project === project);
      return results.length === EXPECTED_JOURNEYS.length && EXPECTED_JOURNEYS.every(title =>
        results.filter(t => t.journeyTitle === title && !['skipped', 'interrupted'].includes(String(t.status))).length === 1);
    });
    const unchanged = artifactIdentity === this.initialIdentity;
    const report = {schemaVersion: 1, checkedAt: new Date().toISOString(), status: unchanged ? result.status : 'output-changed-during-review',
      artifactIdentity, engines: [...new Set(this.tests.map(t => String(t.project)))],
      coverage: complete ? 'production journeys' : representative ? 'representative Home and Atlas only' : 'partial browser journeys',
      expectedJourneysPerEngine: EXPECTED_JOURNEYS.length,
      environment: 'Playwright browser engines on macOS; WebKit is not a real Safari/device check',
      diagnostics: 'Call/source traces retained on failure; explicit journey and failure screenshots retained; per-action DOM/screencast disabled after controlled trace-overhead comparison. Assertions and timeouts unchanged.',
      passed: this.tests.filter(t => t.status === 'passed').length, failed: this.tests.filter(t => !['passed', 'skipped'].includes(String(t.status))).length,
      skipped: this.tests.filter(t => t.status === 'skipped').length, tests: this.tests};
    mkdirSync('receipts', {recursive: true});
    writeFileSync(representative ? 'receipts/representative-browser-results.json' : 'receipts/browser-results.json', JSON.stringify(report, null, 2) + '\n');
  }
}
