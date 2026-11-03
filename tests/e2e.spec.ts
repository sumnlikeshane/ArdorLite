import {test, expect, type Locator} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {readFileSync,writeFileSync} from 'node:fs';
import {searchRanking} from '../src/lib/search/query';
const publicPublication = JSON.parse(readFileSync('config/release.json', 'utf8')).mode === 'public';
const privateExpectations = publicPublication ? null : JSON.parse(readFileSync('tests/private-publication-expectations.json', 'utf8'));
async function expectSourceScope(panel: Locator) {
  if (publicPublication) {
    await expect(panel.locator('pre')).toHaveCount(0);
    await expect(panel.locator('[data-public-source-omitted]')).toBeVisible();
    await expect(panel.locator('[data-public-source-omitted]')).toContainText('not included in the public edition');
  } else await expect(panel.locator('pre')).toBeVisible();
}


test('S2 registry locate controls restore history and reveal directly linked evidence', async ({page}) => {
  await page.goto('/evidence/sources/?q=first&q=second&case=unknown&keep=reader');
  const form = page.locator('[data-evidence-locate]');
  const query = form.locator('[data-locate-query]');
  const investigation = form.locator('[data-locate-case]');
  const entries = page.locator('[data-evidence-entry]:visible');
  await expect(form).toBeVisible();
  await expect(query).toHaveValue('');
  await expect(investigation).toHaveValue('');
  await expect(entries).toHaveCount(218);
  expect(new URL(page.url()).searchParams.has('q')).toBe(false);
  expect(new URL(page.url()).searchParams.has('case')).toBe(false);
  expect(new URL(page.url()).searchParams.get('keep')).toBe('reader');

  await query.fill('src-3f6afd0415da');
  // Editing alone leaves the complete reference available until explicit submit.
  await expect(entries).toHaveCount(218);
  await form.locator('button[type="submit"]').click();
  await expect(entries).toHaveCount(1);
  await expect(page.locator('#src-3f6afd0415da')).toBeVisible();
  await investigation.selectOption('price-bridge');
  await form.locator('button[type="submit"]').click();
  await expect(entries).toHaveCount(1);
  await query.fill('no-such-evidence-identity');
  await form.locator('button[type="submit"]').click();
  await expect(entries).toHaveCount(0);
  await expect(form.locator('[data-locate-status]')).toContainText(/0|no /i);
  await page.goBack();
  await expect(query).toHaveValue('src-3f6afd0415da');
  await expect(investigation).toHaveValue('price-bridge');
  await expect(entries).toHaveCount(1);
  await page.goForward();
  await expect(query).toHaveValue('no-such-evidence-identity');
  await expect(entries).toHaveCount(0);
  await form.locator('[data-locate-reset]').click();
  await expect(query).toHaveValue('');
  await expect(entries).toHaveCount(218);
  await page.goBack();
  await expect(entries).toHaveCount(0);

  await page.goto('/evidence/sources/?q=no-such-evidence-identity&case=trend-quality&keep=reader#src-3f6afd0415da');
  await expect(query).toHaveValue('');
  await expect(investigation).toHaveValue('');
  await expect(page.locator('#src-3f6afd0415da')).toBeInViewport();
  expect(new URL(page.url()).hash).toBe('#src-3f6afd0415da');
  expect(new URL(page.url()).searchParams.has('q')).toBe(false);
  expect(new URL(page.url()).searchParams.get('keep')).toBe('reader');
  await page.reload();
  await expect(page.locator('#src-3f6afd0415da')).toBeInViewport();

  await page.goto('/evidence/claims/?q=absent&case=trend-quality#claim-bridge-fully-usable');
  await expect(query).toHaveValue('');
  await expect(investigation).toHaveValue('');
  const claim = page.locator('#claim-bridge-fully-usable');
  await expect(claim).toBeInViewport();
  await expect(claim).toContainText('Rows certified fully usable by both dimensions');
  await query.fill('Rows certified fully usable by both dimensions');
  await form.locator('button[type="submit"]').click();
  await expect(entries).toHaveCount(1);
  expect(new URL(page.url()).hash).toBe('');
  await investigation.selectOption('trend-quality');
  await form.locator('button[type="submit"]').click();
  await expect(entries).toHaveCount(0);
  await form.locator('[data-locate-reset]').click();
  await expect(entries).toHaveCount(204);
});

test('S2 contextual references remain complete without JavaScript and reflow across review widths', async ({browser, page, browserName}, testInfo) => {
  test.setTimeout(120_000);
  const context = await browser.newContext({javaScriptEnabled: false, viewport: {width: 320, height: 900}});
  const staticPage = await context.newPage();
  await staticPage.goto('/evidence/claims/?q=absent&case=trend-quality#claim-bridge-fully-usable');
  await expect(staticPage.locator('[data-evidence-entry]:visible')).toHaveCount(204);
  await expect(staticPage.locator('#claim-bridge-fully-usable')).toBeInViewport();
  const sourceHref = '/evidence/sources/#src-3f6afd0415da';
  await staticPage.locator(`#claim-bridge-fully-usable a[href="${sourceHref}"]`).focus();
  await staticPage.keyboard.press('Enter');
  await expect(staticPage).toHaveURL(sourceHref);
  const source = staticPage.locator('#src-3f6afd0415da');
  await expect(source).toBeInViewport();
  await expect(staticPage.locator('[data-evidence-entry]:visible')).toHaveCount(218);
  for (const disclosure of await source.locator('details').all()) {
    if (await disclosure.getAttribute('open') === null) {
      await disclosure.locator('summary').first().focus();
      await staticPage.keyboard.press('Enter');
    }
  }
  await source.locator('a[href="/research/cases/price-bridge/#figure-bridge-certification"]').focus();
  await staticPage.keyboard.press('Enter');
  await expect(staticPage.locator('#figure-bridge-certification')).toBeInViewport();
  await expect(staticPage.locator('#figure-bridge-certification table')).toBeVisible();
  await staticPage.goBack();
  await expect(staticPage).toHaveURL(sourceHref);
  await staticPage.goto('/evidence/sources/#src-29baf17e3cc9');
  const directory = staticPage.locator('#src-29baf17e3cc9');
  await expect(directory).toBeInViewport();
  await expect(directory).toContainText(/directory/i);
  await expect(directory).toContainText(/no .*hash|hash unavailable/i);
  await expect(directory.locator('a[href="/research/records/climax_continuation_short_v1/"]')).toHaveCount(1);

  await staticPage.goto('/evidence/sources/#src-50f61de1f3c8');
  const captureSource = staticPage.locator('#src-50f61de1f3c8');
  for (const disclosure of await captureSource.locator('details').all()) {
    if (await disclosure.getAttribute('open') === null) {
      await disclosure.locator('summary').first().focus();
      await staticPage.keyboard.press('Enter');
    }
  }
  const captureHref = '/research/cases/price-bridge/#bridge-numeric-check-capture';
  await captureSource.locator(`a[href="${captureHref}"]`).focus();
  await staticPage.keyboard.press('Enter');
  await expect(staticPage).toHaveURL(captureHref);
  // The inner fragment lets the browser natively expose the exact captured code without JS.
  const capturePanel = staticPage.locator('#bridge-numeric-check');
  const capture = staticPage.locator('#bridge-numeric-check-capture');
  await expect(capturePanel).toHaveAttribute('open', '');
  await expect(capture).toBeInViewport();
  await expectSourceScope(capture);
  if (!publicPublication) await expect(capture.locator('pre')).toContainText(privateExpectations.sourceFunction);
  await staticPage.reload();
  await expect(capturePanel).toHaveAttribute('open', '');
  await expectSourceScope(capture);
  await staticPage.goBack();
  await expect(staticPage).toHaveURL('/evidence/sources/#src-50f61de1f3c8');
  await staticPage.goForward();
  await expect(capturePanel).toHaveAttribute('open', '');
  await expectSourceScope(capture);
  await context.close();

  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.goto(sourceHref);
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({width, height: 900});
    await page.locator('#src-3f6afd0415da').scrollIntoViewIfNeeded();
    await expect(page.locator('#src-3f6afd0415da')).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    if (width === 320 || width === 1280) {
      const results = await new AxeBuilder({page}).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
      expect(results.violations, `Source index at ${width}: ${JSON.stringify(results.violations, null, 2)}`).toEqual([]);
    }
    if (browserName === 'chromium') await page.locator('#src-3f6afd0415da').screenshot({path: testInfo.outputPath(`s2-source-context-${width}.png`)});
  }
  await page.emulateMedia({media: 'print'});
  await page.locator('#src-3f6afd0415da').scrollIntoViewIfNeeded();
  await expect(page.locator('#src-3f6afd0415da')).toBeVisible();
  await expect(page.locator('#src-3f6afd0415da')).toContainText('Original unavailable');
  if (browserName === 'chromium') await page.locator('#src-3f6afd0415da').screenshot({path: testInfo.outputPath('s2-source-context-print.png')});
});

test('S2 contextual evidence round trips retain exact anchors and keyboard history', async ({page}) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const sourceHref = '/evidence/sources/#src-3f6afd0415da';
  const claimHref = '/research/cases/price-bridge/#claim-bridge-certification-01';
  const figureHref = '/research/cases/price-bridge/#figure-bridge-certification';
  const recordHref = '/research/records/trend_following_price_bridge_certification_v1_1/';
  const expectBridgeAnchor = async (hash: string) => {
    // Reading an evidence link preserves its exact URL; defaults remain internal until a control changes.
    await expect(page).toHaveURL(`/research/cases/price-bridge/${hash}`);
  };

  await page.goto(figureHref);
  const figure = page.locator('#figure-bridge-certification');
  await expect(figure.getByRole('table')).toBeVisible();
  await figure.locator(`a[href="${sourceHref}"]`).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(sourceHref);
  const source = page.locator('#src-3f6afd0415da');
  await expect(source).toBeInViewport();
  await expect(source.locator(`a[href="${claimHref}"]`)).toHaveCount(1);
  await expect(source.locator(`a[href="${figureHref}"]`)).toHaveCount(1);
  await expect(source.locator(`a[href="${recordHref}"]`)).toHaveCount(1);
  expect(await source.locator('a[href^="/downloads/reviewed/"]').count()).toBeGreaterThan(0);
  // Native disclosure activation is part of the keyboard journey; no script opens it for the test.
  for (const disclosure of await source.locator('details').all()) {
    if (await disclosure.getAttribute('open') === null) {
      await disclosure.locator('summary').first().focus();
      await page.keyboard.press('Enter');
    }
  }
  const sourceClaimLink=source.locator(`a[href="${claimHref}"]`);
  await sourceClaimLink.focus();
  // A delayed font/pageshow restoration must not steal the reader's link focus.
  await page.evaluate(async()=>{dispatchEvent(new Event('pageshow'));await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));});
  await expect(sourceClaimLink).toBeFocused();
  await page.keyboard.press('Enter');
  await expectBridgeAnchor('#claim-bridge-certification-01');
  const claim = page.locator('#claim-bridge-certification-01');
  await expect(claim).toBeInViewport();
  await expect(claim).toContainText('Technical bridge certified');
  await claim.locator(`a[href="${sourceHref}"]`).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(sourceHref);
  await page.goBack();
  await expectBridgeAnchor('#claim-bridge-certification-01');
  await page.goForward();
  await page.reload();
  await expect(source).toBeInViewport();
  for (const disclosure of await source.locator('details').all()) {
    if (await disclosure.getAttribute('open') === null) await disclosure.locator('summary').first().click();
  }
  await source.locator(`a[href="${recordHref}"]`).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(recordHref);
  await expect(page.locator('main')).toContainText('source-rights certification failed and no strategy performance was computed');
  await expect(page.locator('a[href="/research/records/trend_following_price_bridge_remediation_v1/"]')).not.toHaveCount(0);
  await page.goto('/methods/bridge/');
  const methodSourceHref = '/evidence/sources/#src-50f61de1f3c8';
  await page.locator(`main a[href="${methodSourceHref}"]`).first().focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(methodSourceHref);
  // The URL can commit before streamed disclosure markup finishes parsing.
  await page.waitForLoadState('domcontentloaded');
  const methodSource = page.locator('#src-50f61de1f3c8');
  for (const disclosure of await methodSource.locator('details').all()) {
    if (await disclosure.getAttribute('open') === null) await disclosure.locator('summary').first().click();
  }
  await methodSource.locator('a[href="/methods/bridge/"]').focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL('/methods/bridge/');
  await expect(page.locator('main')).toContainText('Synthetic teaching example');

  await page.goto('/research/records/ssf_translation_original_v1/');
  const caseContext = page.locator('section[aria-labelledby="case-context"]');
  await expect(caseContext.locator('a[href="/research/cases/atlas-ssf/"]').first()).toBeVisible();
  await expect(caseContext).toContainText('Related record');
  await expect(caseContext).toContainText('canonical corrected version of');
  await expect(caseContext).toContainText('This related record retains its own outcome and evidence scope');
  const incoming = page.locator('section[aria-labelledby="incoming-relations"]');
  await expect(incoming.locator('a[href="/research/records/atlas_clv_downside_continuation_v1/"]')).toHaveCount(1);
  await expect(incoming).toContainText('canonical corrected version of');
  await expect(page.locator('main')).toContainText('Values are not borrowed from a parent or adjacent version');
  await expect(page.locator('main a[href*="#claim-"]')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('Walkthrough preserves timing, scenario state, history and the recorded verdict', async ({page}) => {
  const errors: string[] = [];
  const external: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (new URL(request.url()).origin !== new URL(page.url() === 'about:blank' ? (process.env.ARDOR_E2E_BASE_URL ?? 'http://127.0.0.1:4322') : page.url()).origin) external.push(request.url()); });
  await page.goto('/research/walkthrough/');
  await expect(page.locator('[data-live-lab]')).toBeVisible();
  await expect(page.locator('[data-universe] tr')).toHaveCount(10);
  await expect(page.locator('[data-code]')).toContainText(publicPublication ? 'Original source excerpt omitted' : privateExpectations.walkthroughTiming);
  const signal = page.locator('[data-variables] > div').filter({hasText: 'mom_12_1'}).locator('dd');
  await expect(signal).toHaveText('+42.00%');
  await page.locator('[data-today]').fill('30');
  await expect(signal).toHaveText('+42.00%');
  await expect(page.locator('[data-today-output]')).toHaveText('30.00');
  await page.getByRole('button', {name: 'Next step', exact: true}).click();
  await expect(page.locator('[data-code]')).toContainText(publicPublication ? 'Original source excerpt omitted' : privateExpectations.walkthroughSignal);
  await page.locator('[data-scenario]').selectOption('reversal');
  await expect(signal).toHaveText('+42.00%');
  await page.locator('[data-scenario]').selectOption('banned');
  await expect(page.locator('[data-stock]')).toHaveValue('ASTER');
  await page.locator('[data-step="3"]').click();
  await expect(page.locator('[data-state-description]')).toContainText('both opening guards');
  await expect(page.locator('[data-basket-summary]')).toContainText('1 blocked');
  await page.locator('[data-scenario]').selectOption('missing-history');
  await expect(signal).toHaveText('Unavailable');
  await expect(page.locator('[data-basket-summary]')).toContainText('1 unavailable');
  await page.reload();
  await expect(page.locator('[data-scenario]')).toHaveValue('missing-history');
  await expect(signal).toHaveText('Unavailable');
  await page.goBack();
  await expect(page.locator('[data-scenario]')).toHaveValue('banned');
  await page.getByRole('button', {name: 'Reset walkthrough'}).click();
  await expect(page.locator('[data-scenario]')).toHaveValue('baseline');
  await expect(signal).toHaveText('+42.00%');
  await page.locator('[data-step="4"]').click();
  await expect(page.locator('[data-state-description]')).toContainText('failed Phase 1');
  await expect(page.locator('#figure-momentum-execution')).toContainText('2.46');
  await expect(page.locator('#figure-momentum-alpha')).toContainText('-6.1');
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});

test('Walkthrough accessible controls, small-screen reading and invalid URL recovery', async ({page}, testInfo) => {
  await page.goto('/research/walkthrough/?scenario=bad&stock=bad&step=99&today=NaN');
  await expect(page.locator('[data-scenario]')).toHaveValue('baseline');
  await expect(page.locator('[data-step="0"]')).toHaveAttribute('aria-current', 'step');
  for (const width of [1280, 320]) {
    await page.setViewportSize({width, height: 820});
    await page.emulateMedia({reducedMotion: 'reduce'});
    const results = await new AxeBuilder({page}).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.locator('.lab-workspace').screenshot({path: testInfo.outputPath(`walkthrough-${width}.png`)});
  }
  await page.locator('[data-step="1"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-code]')).toContainText(publicPublication ? 'Original source excerpt omitted' : privateExpectations.walkthroughSignalToken);
  await page.getByRole('button', {name: 'Inspect Aster', exact: true}).click();
  await expect(page.getByRole('button', {name: 'Inspect Aster', exact: true})).toBeFocused();
  await expect(page.locator('[data-stock]')).toHaveValue('ASTER');
});

test('Walkthrough retains exact source and research context without JavaScript', async ({browser}) => {
  const context = await browser.newContext({javaScriptEnabled: false, viewport: {width: 320, height: 800}});
  const page = await context.newPage();
  await page.goto('/research/walkthrough/');
  await expect(page.locator('[data-lab-controls]')).toBeHidden();
  await expect(page.locator('[data-live-lab]')).toBeHidden();
  await expect(page.locator('#walkthrough-step-0')).toContainText('252');
  await page.locator('.lab-source').nth(1).locator('summary').click();
  if (publicPublication) await expectSourceScope(page.locator('.lab-source').nth(1));
  else await expect(page.locator('.lab-source').nth(1).locator('pre')).toContainText(privateExpectations.walkthroughSignal);
  await expect(page.locator('#recorded-heading')).toBeVisible();
  await expect(page.locator('main')).toContainText('Phase 0 PASS → Phase 1 FAIL');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await context.close();
});

test('Home → Atlas → claim → source reading journey @representative', async ({page}) => {
  const external: string[] = [];
  page.on('request', request => { if (!new URL(request.url()).hostname.match(/^(127\.0\.0\.1|localhost)$/)) external.push(request.url()); });
  await page.goto('/');
  await expect(page.getByRole('heading', {level: 1})).toContainText('Follow a research idea');
  await expect(page.getByText('no strategy is certified or live.', {exact: false}).first()).toBeVisible();
  await page.getByRole('link', {name: /^Read Atlas & SSF/}).click();
  await expect(page).toHaveURL(/\/research\/cases\/atlas-ssf\//);
  await expect(page.locator('[data-claim-id]')).toHaveCount(34);
  await expect(page.locator('#figure-atlas-gates')).toBeVisible();
  await page.locator('#claims > details > summary').click();
  await expect(page.locator('#claim-atlas-gates-01')).toContainText('1,264');
  await page.locator('#claim-atlas-gates-01').getByRole('link', {name: /Claim registry/}).click();
  await expect(page).toHaveURL(/\/evidence\/claims\/#claim-atlas-gates-01/);
  await page.locator('#claim-atlas-gates-01').getByRole('link', {name: /^(Verify the source: )?src-/}).click();
  await expect(page).toHaveURL(/\/evidence\/sources\/#src-/);
  expect(external).toEqual([]);
});

test('Representative automated accessibility, 320px reflow, reduced motion @representative', async ({page}) => {
  for (const path of ['/', '/research/cases/atlas-ssf/']) {
    await page.goto(path);
    const results = await new AxeBuilder({page}).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
    await page.setViewportSize({width: 320, height: 760});
    await page.emulateMedia({reducedMotion: 'reduce'});
    await expect(page.getByRole('heading', {level: 1})).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  }
});

test('Representative reading and tables with JavaScript disabled @representative', async ({browser}) => {
  const context = await browser.newContext({javaScriptEnabled: false, viewport: {width: 375, height: 812}});
  const page = await context.newPage();
  await page.goto('/research/cases/atlas-ssf/');
  await expect(page.locator('[data-claim-id]')).toHaveCount(34);
  await expect(page.getByRole('table').first()).toBeVisible();
  await expect(page.getByRole('navigation', {name: 'Main navigation'})).toBeVisible();
  await context.close();
});

test('Complete publication routes, synthetic boundaries and record gates', async ({page}) => {
  const source = JSON.parse(readFileSync('reviewed/2026-10-11/content/research.json', 'utf8'));
  for (const id of ['momentum_xs_v2', 'trend_quality_immediate_entry_v1', 'trend_following_price_bridge_certification_v1_1']) {
    const record = source.records.find((r: {id: string}) => r.id === id);
    await page.goto(`/research/records/${id}/`);
    await expect(page.locator('main')).toContainText(record.final_outcome);
    await expect(page.locator('main')).toContainText(record.controlling_gates ?? 'Unavailable');
    await expect(page.locator('main')).toContainText(record.reproduction_level.replaceAll('_', ' '));
  }
  await page.goto('/methods/units/');
  await expect(page.locator('main')).toContainText('Synthetic teaching example');
  await expect(page.locator('main')).toContainText('not market evidence');
  await page.goto('/methods/bridge/');
  await expect(page.locator('pre[aria-label="Verified synthetic JSON output"]')).toContainText('"rounded_bridge": null');
  await expect(page.getByRole('link', {name: /Download bridge.py/})).toHaveAttribute('href', /\/downloads\/reviewed\/2026-10-11\/methods\/bridge.py$/);
  await page.goto('/methods/lagged-quality/');
  await expect(page.locator('main')).toContainText('training');
  await expect(page.locator('main')).toContainText('prior');
  await page.goto('/research/previews/');
  await expect(page.locator('main')).toContainText('Hybrid');
  await expect(page.locator('main')).toContainText('design');
  await page.setViewportSize({width: 320, height: 760});
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test('Delivery discrepancy and publication scopes remain contextual without JavaScript', async ({browser}, testInfo) => {
  const context = await browser.newContext({javaScriptEnabled: false, viewport: {width: 1280, height: 900}});
  const page = await context.newPage();
  const destination = '/research/cases/delivery-insider/#delivery-construction-discrepancy';
  await page.goto(destination);
  const note = page.locator('#delivery-construction-discrepancy');
  await expect(note).toBeInViewport();
  await expect(note).toContainText('does not subtract the trailing mean');
  await expect(note).toContainText('k most recent actionable disclosure dates');
  await expect(note).toContainText('Exact historical run-source binding remains unresolved');
  await expect(page.locator('#narrative')).toContainText('an absolute lift of at least 5 percentage points');
  await expect(page.locator('[data-claim-id]')).toHaveCount(28);
  await expect(page.locator('#claim-delivery-abs-floor')).toContainText('Primary absolute delivery lift floor');
  await expect(page.locator('#claim-delivery-abs-floor [data-editorial-note-reference]')).toContainText('ratio-level predicate');
  const source = note.getByRole('link', {name: 'src-10db98718e3c', exact: true});
  await source.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/evidence\/sources\/#src-10db98718e3c$/);
  await expect(page.locator('#src-10db98718e3c [data-editorial-note-reference]')).toBeVisible();
  await page.locator('#src-10db98718e3c [data-editorial-note-reference] a').click();
  await expect(note).toBeInViewport();
  await page.goBack();
  await expect(page).toHaveURL(/#src-10db98718e3c$/);
  await page.goForward();
  await page.reload();
  await expect(note).toBeInViewport();
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({width, height: 900});
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await note.screenshot({path: testInfo.outputPath(`delivery-note-${width}.png`)});
  }
  // Axe requires page scripting; the separate template journey audits these routes.
  await page.emulateMedia({media: 'print'});
  await expect(note).toBeVisible();
  await expect(note).toContainText('recorded KILLED decision and null predictive interaction are unchanged');
  await note.screenshot({path: testInfo.outputPath('delivery-note-print.png')});
  await page.emulateMedia({media: 'screen'});
  await page.goto('/evidence/claims/#claim-delivery-abs-floor');
  await expect(page.locator('#claim-delivery-abs-floor [data-editorial-note-reference]')).toBeVisible();
  for (const [route, text] of [
    ['/release/', 'Each case retains any unresolved historical-version discrepancy'],
    ['/publication/', 'Public embedding clearance for these excerpts remains unresolved'],
    ['/evidence/', publicPublication ? 'Metadata for five Momentum and 23 engineering/Bridge capture identities' : 'Five Momentum and 23 engineering/Bridge source excerpts'],
    ['/search/', 'Each result links to its research context and limitations'],
    ['/research/records/momentum_xs_v2/', 'Source references identify the material supporting this record'],
  ]) {
    await page.goto(route!);
    await expect(page.locator('main')).toContainText(text!);
  }
  await context.close();
});

test('Catalog filters persist across history and expose reset and no results', async ({page}) => {
  await page.goto('/research/catalog/');
  await expect(page.locator('[data-catalog-record]')).toHaveCount(114);
  const query = page.getByRole('searchbox');
  await query.fill('momentum');
  await page.getByRole('button', {name: /apply search/i}).click();
  await expect(page).toHaveURL(/q=momentum/);
  const visible = page.locator('[data-catalog-record]:visible');
  expect(await visible.count()).toBeGreaterThan(0);
  expect(await visible.count()).toBeLessThan(114);
  await query.fill('zzz-no-such-research-record');
  await page.getByRole('button', {name: /apply search/i}).click();
  await expect(visible).toHaveCount(0);
  await expect(page.getByText('No records match these filters.')).toBeVisible();
  await page.getByRole('button', {name: /reset|clear/i}).click();
  await expect(visible).toHaveCount(114);
  await page.goBack();
  await expect(query).not.toHaveValue('');
});

test('Pagefind production index searches outcome evidence and empty results', async ({page}) => {
  await page.goto('/search/');
  const query = page.getByRole('textbox', {name: 'Search', exact: true});
  await query.fill('Atlas');
  await expect(page.locator('main')).toContainText('Atlas');
  await expect(page.locator('main a[href*="/research/cases/atlas-ssf/"]').first()).toBeVisible();
  await query.fill('xyz-nonexistent-linguistic-result');
  await expect(page.getByText(/no results|no matching/i)).toBeVisible();
});

test('Chart enhancements retain HTML tables and reset the complete recorded set', async ({page}) => {
  const views = [['atlas-ssf', 'ssf-economics'], ['momentum-v2', 'momentum-execution'], ['swing-autopsy', 'swing-policies'], ['trend-quality', 'trend-folds']];
  for (const [slug, id] of views) {
    await page.goto(`/research/cases/${slug}/`);
    const figure = page.locator(`#figure-${id}`);
    if (id==='trend-folds') await figure.locator('.research-exact-table>summary').click();
    await expect(figure.locator('table[data-evidence-table]')).toBeVisible();
    const enhancement = figure.locator('[data-recorded-view]');
    await expect(enhancement).toBeVisible();
    const count = enhancement.locator('[data-selection-count]');
    const initial = await count.textContent();
    await enhancement.getByRole('button', {name: 'Show recorded-value view'}).click();
    await expect(enhancement.locator('[data-plot] svg')).toBeVisible();
    await enhancement.locator('[data-row-select]').selectOption('0');
    await expect(count).toHaveText(/^1 of \d+ recorded rows$/);
    const reset = figure.getByRole('button', {name: /reset/i});
    await reset.click();
    await expect(count).toHaveText(initial ?? '');
    await expect(enhancement.locator('[data-row-select]')).toHaveValue('all');
    await expect(figure.locator('table[data-evidence-table]')).toBeVisible();
  }
});

test('All case and secondary page templates pass automated accessibility', async ({page}) => {
  test.setTimeout(180_000); // Seventeen full-page axe scans; assertions unchanged.
  for (const path of ['/research/cases/momentum-v2/', '/research/cases/swing-autopsy/', '/research/cases/trend-quality/', '/research/cases/delivery-insider/', '/research/cases/price-bridge/', '/research/catalog/', '/research/records/momentum_xs_v2/', '/methods/units/', '/methods/bridge/', '/methods/lagged-quality/', '/research/previews/', '/evidence/claims/', '/evidence/sources/', '/about/', '/publication/', '/release/', '/search/']) {
    await page.goto(path);
    if (path === '/search/') await expect(page.getByRole('textbox', {name: 'Search', exact: true})).toBeVisible();
    const results = await new AxeBuilder({page}).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(results.violations, path + ': ' + JSON.stringify(results.violations, null, 2)).toEqual([]);
  }
});

test('Optional chart and search load failures preserve useful reading', async ({page}) => {
  await page.route('**/evidence/tables/ssf-economics.json', route => route.abort());
  await page.goto('/research/cases/atlas-ssf/');
  const figure = page.locator('#figure-ssf-economics');
  await figure.getByRole('button', {name: 'Show recorded-value view'}).click();
  await expect(figure.locator('[data-chart-state]')).toContainText('could not load');
  await expect(figure.getByRole('table')).toBeVisible();
  await page.route('**/pagefind/pagefind.js', route => route.abort());
  await page.goto('/search/');
  await expect(page.getByRole('status')).toContainText('could not load');
  await expect(page.getByRole('status').getByRole('link', {name: 'complete catalog'})).toBeVisible();
});

test('Keyboard skip link, mobile menu, 404 and print remain usable', async ({page, browserName}) => {
  await page.goto('/');
  // macOS WebKit's default link navigation uses Option+Tab; Tab visits form controls.
  await page.keyboard.press(browserName === 'webkit' ? 'Alt+Tab' : 'Tab');
  await expect(page.getByRole('link', {name: 'Skip to content'})).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#main$/);
  await page.setViewportSize({width: 375, height: 812});
  const menu = page.locator('.menu-toggle');
  await menu.click();
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  await page.getByRole('navigation', {name: 'Main navigation'}).getByRole('link', {name: 'Research', exact: true}).focus();
  await page.keyboard.press('Escape');
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await page.goto('/404.html');
  await expect(page.getByRole('heading', {level: 1})).toHaveText('This path has no record.');
  await page.emulateMedia({media: 'print'});
  await expect(page.getByRole('heading', {level: 1})).toBeVisible();
});

test('Research Atlas gives six independent entrances and engineering state survives history', async ({page}) => {
  const errors: string[] = [];
  const external: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => {
    if (new URL(request.url()).origin !== new URL(page.url() === 'about:blank' ? (process.env.ARDOR_E2E_BASE_URL ?? 'http://127.0.0.1:4322') : page.url()).origin) external.push(request.url());
  });
  const slugs = ['atlas-ssf', 'momentum-v2', 'swing-autopsy', 'trend-quality', 'delivery-insider', 'price-bridge'];
  for (const slug of slugs) {
    await page.goto('/');
    await expect(page.locator('[data-research-map] [data-case-entry]')).toHaveCount(6);
    const entrance = page.locator(`[data-case-entry][href="/research/cases/${slug}/"]`);
    await entrance.focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(new RegExp(`/research/cases/${slug}/$`));
    await expect(page.getByRole('heading', {level: 1})).toBeVisible();
  }

  await page.goto('/engineering/?eng.gate=complete-profile&eng.cutoff=2026-06-04');
  await expect(page.locator('[data-cutoff]')).toHaveValue('2026-06-04');
  await expect(page.locator('[data-gate-preset]')).toHaveValue('complete-profile');
  await expect(page.locator('[data-engineering-status]')).not.toContainText(/invalid/i);
  await page.goto('/engineering/?eng.cutoff=bad&eng.gate=GO');
  await expect(page.locator('[data-engineering-controls]').first()).toBeVisible();
  await expect(page.locator('[data-cutoff]')).toHaveValue('2026-06-02');
  await expect(page.locator('[data-gate-preset]')).toHaveValue('legacy-empty');
  await expect(page.locator('[data-observation-selected]')).toContainText('₹100.00');
  await expect(page.locator('[data-gate-verdict]')).toHaveText('GO');
  await expect(page.locator('[data-certification-capable]')).toHaveText('false');
  await expect(page.locator('#engineering-gate-legacy')).toHaveAttribute('data-source-active', 'true');
  await page.locator('[data-cutoff]').selectOption('latest');
  await expect(page.locator('[data-observation-selected]')).toContainText('₹102.00');
  await expect(page.locator('[data-observation-support]')).toContainText('Unknown');
  await page.locator('[data-gate-preset]').selectOption('missing-profile');
  await expect(page.locator('[data-gate-verdict]')).toHaveText('NO-GO');
  await expect(page.locator('[data-gate-missing]')).toContainText('certification_profile');
  await expect(page.locator('#engineering-gate-legacy')).toHaveAttribute('data-source-active', 'false');
  await expect(page.locator('#engineering-gate-certify')).toHaveAttribute('data-source-active', 'true');
  await page.reload();
  await expect(page.locator('[data-cutoff]')).toHaveValue('latest');
  await expect(page.locator('[data-gate-preset]')).toHaveValue('missing-profile');
  await page.goBack();
  await expect(page.locator('[data-gate-preset]')).toHaveValue('legacy-empty');
  await expect(page.locator('[data-cutoff]')).toHaveValue('latest');
  await page.goForward();
  await expect(page.locator('[data-gate-preset]')).toHaveValue('missing-profile');

  const source = page.locator('[data-source-panel]').first();
  const summary = source.locator('summary');
  await summary.focus();
  await page.keyboard.press('Enter');
  await expect(source).toHaveAttribute('open', '');
  await expect(summary).toBeFocused();
  await expectSourceScope(source);
  await expect(page.locator('[data-gate-preset]')).toHaveValue('missing-profile');
  await expect(page.locator('[data-observation-selected]')).toContainText('₹102.00');
  await page.getByRole('button', {name: 'Reset engineering example'}).click();
  await expect(page.locator('[data-cutoff]')).toHaveValue('2026-06-02');
  await expect(page.locator('[data-gate-preset]')).toHaveValue('legacy-empty');
  await expect(page.locator('[data-engineering-status]')).toContainText(/reset/i);
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', {
    configurable: true, value: {writeText: () => Promise.reject(new Error('Clipboard denied by test'))},
  }));
  await page.getByRole('button', {name: 'Copy example link'}).click();
  await expect(page.locator('[data-engineering-status]')).toContainText('address bar');
  await expect(page.locator('[data-observation-selected]')).toContainText('₹100.00');
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});

test('M1 Home and engineering remain accessible across the review viewports', async ({page, browserName}, testInfo) => {
  test.setTimeout(90_000);
  await page.emulateMedia({reducedMotion: 'reduce'});
  for (const path of ['/', '/engineering/']) {
    await page.goto(path);
    for (const width of [320, 390, 1280, 1440]) {
      await page.setViewportSize({width, height: 900});
      await expect(page.getByRole('heading', {level: 1})).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      if (width === 320 || width === 1280) {
        const results = await new AxeBuilder({page}).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
        expect(results.violations, path + ': ' + JSON.stringify(results.violations, null, 2)).toEqual([]);
      }
      if (browserName === 'chromium') {
        await page.screenshot({path: testInfo.outputPath(`m1-${path === '/' ? 'home' : 'engineering'}-${width}.png`), fullPage: true});
      }
    }
  }
});

test('M1 static explanation and exact source remain usable without enhancement', async ({browser, page}) => {
  const context = await browser.newContext({javaScriptEnabled: false, viewport: {width: 320, height: 850}});
  const staticPage = await context.newPage();
  await staticPage.goto('/');
  await expect(staticPage.locator('[data-research-map] [data-case-entry]')).toHaveCount(6);
  await expect(staticPage.locator('main')).toContainText('no strategy is certified or live.');
  await staticPage.goto('/engineering/');
  await expect(staticPage.locator('[data-engineering-controls]').first()).toBeHidden();
  await expect(staticPage.locator('[data-observation-selected]')).toContainText('₹100.00');
  await expect(staticPage.locator('[data-gate-verdict]')).toHaveText('GO');
  await expect(staticPage.locator('[data-certification-capable]')).toHaveText('false');
  await expect(staticPage.locator('main')).toContainText('as_of=None');
  const source = staticPage.locator('[data-source-panel]').first();
  await source.locator('summary').click();
  await expectSourceScope(source);
  expect(await staticPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await context.close();

  await page.route('**/*.js', route => route.abort());
  await page.goto('/engineering/');
  await expect(page.locator('[data-engineering-controls]').first()).toBeHidden();
  await expect(page.locator('[data-observation-selected]')).toContainText('₹100.00');
  await expect(page.locator('[data-certification-capable]')).toHaveText('false');
});

test('Price Bridge synchronizes bounded repair states, source and immutable historical gates', async ({page}) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  const external: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (new URL(request.url()).origin !== new URL(page.url() === 'about:blank' ? (process.env.ARDOR_E2E_BASE_URL ?? 'http://127.0.0.1:4322') : page.url()).origin) external.push(request.url()); });
  await page.goto('/research/cases/price-bridge/?br.preset=bad&br.preset=positive&br.operation=bad&br.unknown=bad&keep=reader#bridge');
  const bridge = page.locator('[data-bridge]');
  const preset = bridge.locator('[data-bridge-preset]');
  const operation = bridge.locator('[data-bridge-operation]');
  const value = (name: string) => bridge.locator(`[data-bridge-value="${name}"]`);
  const historical = bridge.locator('[data-bridge-historical]').first();
  await expect(preset).toHaveValue('positive');
  await expect(operation).toHaveValue('overview');
  await expect(bridge.locator('[data-bridge-status]')).toContainText(/invalid|normalized|recovered/i);
  expect(new URL(page.url()).searchParams.has('br.unknown')).toBe(false);
  expect(new URL(page.url()).searchParams.get('keep')).toBe('reader');
  await expect(value('ratio')).toHaveText('1.02');
  for (const [key, expected] of [['mapped-open', '100.98'], ['mapped-high', '105.06'], ['mapped-low', '99.96'], ['mapped-close', '102']]) {
    await expect(value(key!)).toHaveText(expected!);
  }
  await expect(value('rights')).toContainText(/unknown/i);
  await expect(value('ready')).toContainText(/false|blocked/i);
  const fixedHistory = await historical.textContent();
  await expect(historical.locator('[data-bridge-historical-technical]')).toContainText('true');
  await expect(historical.locator('[data-bridge-historical-rights]')).toContainText('false');
  await expect(historical.locator('[data-bridge-historical-usable]')).toContainText('0');
  await operation.selectOption('qa');
  await expect(bridge.locator('[data-source-active="true"]').first()).toHaveAttribute('data-source-active', 'true');
  await operation.selectOption('repair');
  const repairSource = await bridge.locator('[data-bridge-source-preview]').textContent();
  const repairIdentity = await bridge.locator('[data-bridge-source-label]').textContent();
  if (publicPublication) await expect(bridge.locator('[data-bridge-source-preview]')).toBeEmpty();
  else await expect(bridge.locator('[data-bridge-source-preview]')).not.toBeEmpty();
  await operation.selectOption('rights');
  const rightsSource = await bridge.locator('[data-bridge-source-preview]').textContent();
  const rightsIdentity = await bridge.locator('[data-bridge-source-label]').textContent();
  if (publicPublication) expect(rightsSource).toEqual(repairSource);
  else expect(rightsSource).not.toEqual(repairSource);
  expect(rightsIdentity).not.toEqual(repairIdentity);
  await page.goBack();
  await expect(operation).toHaveValue('repair');
  await expect(bridge.locator('[data-bridge-source-preview]')).toHaveText(repairSource ?? '');
  await expect(bridge.locator('[data-bridge-source-label]')).toHaveText(repairIdentity ?? '');
  await page.goForward();
  await expect(operation).toHaveValue('rights');
  await expect(bridge.locator('[data-bridge-source-preview]')).toHaveText(rightsSource ?? '');
  await expect(bridge.locator('[data-bridge-source-label]')).toHaveText(rightsIdentity ?? '');

  await preset.selectOption('rounded-zero');
  await expect(operation).toHaveValue('overview');
  await expect(value('stored-close')).toHaveText('0.000000');
  await expect(value('ratio')).toContainText('Unavailable');
  await expect(value('explicit-repair')).toContainText('1.02');
  await preset.selectOption('penny-ticks');
  await operation.selectOption('repair');
  await expect(bridge.locator('[data-bridge-explanation]')).toContainText(/unconfirmed|₹1|eligible/i);
  await preset.selectOption('confirmed-low-split');
  await operation.selectOption('repair');
  await expect(bridge.locator('[data-bridge-explanation]')).toContainText(/confirmed/i);
  for (const selected of ['zero-close', 'negative-close', 'nonfinite-close', 'missing-total', 'inverted-ohlc', 'missing-raw', 'missing-factor', 'missing-ca-input', 'missing-session', 'wrong-identity', 'ambiguous-lineage', 'known-late']) {
    await preset.selectOption(selected);
    await expect(value('technical')).toContainText('false');
    await expect(value('reason')).not.toHaveText('');
    await expect(historical).toHaveText(fixedHistory ?? '');
  }
  await preset.selectOption('ca-discontinuity');
  const actionReason = await value('reason').textContent();
  await expect(value('technical')).toContainText('false');
  await preset.selectOption('dividend-discontinuity');
  await expect(value('technical')).toContainText('false');
  expect(await value('reason').textContent()).not.toEqual(actionReason);
  await preset.selectOption('rights-denied');
  await expect(value('technical')).toContainText('true');
  await expect(value('rights')).toContainText(/denied/i);
  await expect(value('ready')).toContainText(/false|blocked/i);
  await operation.selectOption('rights');
  await page.reload();
  await expect(preset).toHaveValue('rights-denied');
  await expect(operation).toHaveValue('rights');
  await page.goBack();
  await expect(operation).toHaveValue('overview');
  await page.goForward();
  await expect(operation).toHaveValue('rights');
  const source = bridge.locator('[data-source-panel]').first();
  await source.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(source).toHaveAttribute('open', '');
  await expect(source.locator('summary')).toBeFocused();
  await expect(preset).toHaveValue('rights-denied');
  await bridge.locator('[data-bridge-reset]').click();
  await expect(preset).toHaveValue('positive');
  await expect(operation).toHaveValue('overview');
  await expect(historical).toHaveText(fixedHistory ?? '');
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {writeText: () => Promise.reject(new Error('Clipboard denied by test'))} }));
  await bridge.locator('[data-bridge-share]').click();
  await expect(bridge.locator('[data-bridge-status]')).toContainText('address bar');
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});

test('M2 engineering traces preserve typed missingness, retained records and case-specific paths', async ({page}) => {
  await page.goto('/engineering/?eng.registration=bad&eng.comparison=bad&eng.comparison=exact-null&eng.ledger=bad&eng.case=bad&eng.station=bad&eng.unknown=bad');
  const registration = page.locator('[data-registration-preset]');
  const comparison = page.locator('[data-comparison-preset]');
  const ledger = page.locator('[data-ledger-preset]');
  const casePreset = page.locator('[data-case-preset]');
  await expect(registration).toBeVisible();
  await expect(registration).toHaveValue('new-name');
  await expect(comparison).toHaveValue('numeric-ge');
  await expect(ledger).toHaveValue('intact');
  expect(new URL(page.url()).searchParams.has('eng.unknown')).toBe(false);
  await expect(page.locator('[data-registration-outcome]')).toContainText('Accepted');
  await expect(page.locator('[data-registration-count]')).toContainText('2');
  await registration.selectOption('existing-name');
  await expect(page.locator('[data-registration-outcome]')).toContainText('duplicate');
  await expect(page.locator('[data-registration-count]')).toContainText('1');
  await registration.selectOption('invalid-schema');
  await expect(page.locator('[data-registration-outcome]')).toContainText('incomplete threshold schema');

  await page.locator('[data-engineering-station="comparison"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-engineering-station="comparison"]')).toHaveAttribute('aria-current', 'location');
  await expect(page.locator('[data-comparison-verdict]')).toHaveText('PASS');
  await comparison.selectOption('numeric-le');
  await expect(page.locator('[data-comparison-verdict]')).toHaveText('FAIL');
  await expect(page.locator('[data-comparison-failed]')).toHaveText('drawdown_ceiling');
  await comparison.selectOption('missing-numeric');
  await expect(page.locator('[data-comparison-verdict]')).toHaveText('FAIL');
  await expect(page.locator('[data-comparison-actual]')).toContainText('Unavailable');
  await expect(page.locator('[data-comparison-metric]')).toHaveText('quality_score');
  await expect(page.locator('[data-comparison-failed]')).toHaveText('quality_floor');
  await expect(page.locator('#engineering-comparison-finite')).toHaveAttribute('data-source-active', 'true');
  await comparison.selectOption('nonfinite-numeric');
  await expect(page.locator('[data-comparison-verdict]')).toHaveText('FAIL');
  await expect(page.locator('[data-comparison-actual]')).toContainText('Infinity');
  await comparison.selectOption('unknown-comparator');
  await expect(page.locator('[data-comparison-verdict]')).toHaveText('FAIL');
  await expect(page.locator('[data-comparison-metric]')).toContainText('Unavailable');
  await expect(page.locator('[data-comparison-failed]')).toHaveText('quality_bar');
  for (const preset of ['exact-null', 'exact-absent']) {
    await comparison.selectOption(preset);
    await expect(page.locator('[data-comparison-verdict]')).toHaveText('PASS');
    await expect(page.locator('#engineering-comparison-null')).toHaveAttribute('data-source-active', 'true');
    await expect(page.locator('[data-comparison-explanation]')).toContainText(/null|None/i);
  }
  await expect(page.locator('[data-comparison-actual]')).toContainText('Unavailable');
  await comparison.selectOption('legacy-min');
  await expect(page.locator('[data-comparison-verdict]')).toHaveText('PASS');
  await expect(page.locator('[data-comparison-explanation]')).toContainText('_min');

  await expect(page.locator('[data-ledger-ok]')).toHaveText('true');
  await expect(page.locator('[data-trial-outcome]')).toContainText('created=false');
  await ledger.selectOption('unsealed-append');
  await expect(page.locator('[data-ledger-ok]')).toHaveText('false');
  await expect(page.locator('[data-ledger-reason]')).toContainText(/un-sealed|unsealed/i);
  await expect(page.locator('[data-ledger-prefix]')).toContainText('match sealed prefix');
  await ledger.selectOption('changed-history');
  await expect(page.locator('[data-ledger-reason]')).toContainText('TAMPER');
  await expect(page.locator('[data-ledger-prefix]')).toContainText('disagree');
  for (const slug of ['atlas-ssf', 'momentum-v2', 'swing-autopsy', 'trend-quality', 'delivery-insider', 'price-bridge']) {
    await casePreset.selectOption(slug);
    await expect(page.locator(`[data-case-path="${slug}"]`)).toHaveClass(/is-selected/);
    await expect(page.locator('[data-case-path]:visible')).toHaveCount(6);
  }
  await comparison.selectOption('exact-absent');
  await page.reload();
  await expect(comparison).toHaveValue('exact-absent');
  await expect(ledger).toHaveValue('changed-history');
  await page.goBack();
  await expect(comparison).toHaveValue('legacy-min');
  await page.goForward();
  await expect(comparison).toHaveValue('exact-absent');
  await page.locator('[data-engineering-reset]').click();
  await expect(registration).toHaveValue('new-name');
  await expect(comparison).toHaveValue('numeric-ge');
  await expect(ledger).toHaveValue('intact');
  await expect(casePreset).toHaveValue('price-bridge');
  await expect(page.locator('[data-engineering-status]')).toContainText(/reset/i);
});

test('M2 Bridge and engineering support responsive source inspection and automated accessibility', async ({page, browserName}, testInfo) => {
  test.setTimeout(120_000);
  await page.emulateMedia({reducedMotion: 'reduce'});
  for (const [path, name] of [['/research/cases/price-bridge/', 'bridge'], ['/engineering/', 'engineering']]) {
    await page.goto(path!);
    for (const width of [320, 390, 1280, 1440]) {
      await page.setViewportSize({width, height: 900});
      const scope = page.locator(name === 'bridge' ? '[data-bridge]' : '#comparison');
      const source = scope.locator('[data-source-panel]').first();
      if (!(await source.getAttribute('open') === '')) await source.locator('summary').click();
      await expectSourceScope(source);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      if (width === 320 || width === 1280) {
        const results = await new AxeBuilder({page}).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
        expect(results.violations, `${path} at ${width}: ${JSON.stringify(results.violations, null, 2)}`).toEqual([]);
      }
      if (browserName === 'chromium') {
        await page.screenshot({path: testInfo.outputPath(`m2-${name}-${width}.png`), fullPage: true});
        await page.locator(name === 'bridge' ? '#bridge-instrument' : '#comparison').screenshot({path: testInfo.outputPath(`m2-${name}-source-${width}.png`)});
      }
    }
  }
});

test('M2 complete arguments and source remain readable without JavaScript or module loading', async ({browser, page}) => {
  const context = await browser.newContext({javaScriptEnabled: false, viewport: {width: 320, height: 850}});
  const staticPage = await context.newPage();
  await staticPage.goto('/research/cases/price-bridge/');
  const bridge = staticPage.locator('[data-bridge]');
  await expect(bridge.locator('[data-bridge-preset]')).toBeHidden();
  await expect(bridge).toContainText('4,721,129');
  await expect(bridge).toContainText('718,685');
  await expect(bridge).toContainText('row_level_exception_receipt.csv');
  for (const id of ['bridge-observations', 'bridge-repair', 'bridge-vintage', 'bridge-linkage', 'bridge-qa', 'bridge-rights', 'bridge-decision']) {
    await expect(bridge.locator(`#${id}`).getByRole('heading', {level: 2})).toBeVisible();
  }
  await expect(bridge.locator('[data-bridge-value="ratio"]')).toHaveText('1.02');
  const inputs = bridge.locator('.bridge-input-details');
  await inputs.locator('summary').click();
  await expect(bridge.locator('[data-bridge-value="mapped-high"]')).toBeVisible();
  await expect(bridge.locator('[data-bridge-value="mapped-high"]')).toHaveText('105.06');
  const bridgeSource = bridge.locator('[data-source-panel]').first();
  await bridgeSource.locator('summary').click();
  await expectSourceScope(bridgeSource);
  expect(await staticPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await staticPage.goto('/engineering/');
  await expect(staticPage.locator('[data-engineering-controls]').first()).toBeHidden();
  for (const id of ['question', 'comparison', 'record', 'cases']) {
    const section = staticPage.locator(`#${id}`);
    await expect(section.getByRole('heading', {level: 2})).toBeVisible();
    await expect(section).toContainText(/operation|source|implementation/i);
    const source = section.locator('[data-source-panel]').first();
    if (await source.count()) {
      await source.locator('summary').click();
      await expectSourceScope(source);
    }
  }
  await expect(staticPage.locator('#comparison')).toContainText('metrics.get()');
  await expect(staticPage.locator('#comparison')).toContainText(/null/i);
  await expect(staticPage.locator('#record')).toContainText(/unsealed/i);
  await expect(staticPage.locator('#cases [data-case-path]')).toHaveCount(6);
  expect(await staticPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await context.close();

  await page.route('**/*.js', route => route.abort());
  await page.goto('/research/cases/price-bridge/');
  await expect(page.locator('[data-bridge-preset]')).toBeHidden();
  await expect(page.locator('#bridge-historical')).toContainText('4,721,129');
  await page.goto('/engineering/');
  await expect(page.locator('[data-engineering-controls]').first()).toBeHidden();
  await expect(page.locator('#comparison')).toContainText('metrics.get()');
  await expect(page.locator('#record')).toContainText(/unsealed/i);
});

test('S3 pilot decision briefs preserve gates and contextual keyboard history', async ({page}) => {
  for (const [slug,claim,source,count] of [
    ['trend-quality','trend-selection-05','src-6d49d801b740',71],
    ['price-bridge','bridge-certification-02-source-boolean','src-3f6afd0415da',16],
  ] as const) {
    await page.goto(`/research/cases/${slug}/`);
    const brief=page.locator('#decision-brief');
    await expect(brief).toContainText(slug==='trend-quality'?'kill-quality-family':'source-data-repair-required');
    await expect(brief).toContainText(slug==='trend-quality'?'partial fold':'Fully usable rows remained zero');
    await expect(page.locator('.claim-entry')).toHaveCount(count);
    await expect(page.locator('#claims details[data-pilot-disclosure]')).not.toHaveAttribute('open');
    const link=brief.locator(`a[href$="#claim-${claim}"]`).first();
    await link.focus(); await page.keyboard.press('Enter');
    const entry=page.locator(`#claim-${claim}`);
    await expect(entry).toBeVisible(); await expect(entry).toBeFocused();
    await expect(page.locator('#claims details[data-pilot-disclosure]')).toHaveAttribute('open','');
    await page.reload(); await expect(entry).toBeVisible(); await expect(entry).toBeFocused();
    await entry.locator(`a[href="/evidence/sources/#${source}"]`).click();
    await expect(page.locator(`#${source}`)).toBeVisible();
    await expect(page.locator(`#${source}`)).toContainText(/original|excluded|unavailable/i);
    await page.goBack(); await expect(entry).toBeVisible();
    await page.goto(`/research/cases/${slug}/#decision-brief`);
    await page.locator('.pilot-paths a[href="#investigation"]').click();
    await page.goBack(); await expect(page.locator('#decision-brief')).toBeFocused();
    await page.goForward(); await expect(page.locator('#investigation')).toBeFocused();
    const disclosure=page.locator('.evidence-figure details:has(.figure-context)').first();
    await disclosure.locator('summary').focus(); await page.keyboard.press('Enter');
    await expect(disclosure).toHaveAttribute('open','');
    await expect(disclosure.locator('.figure-context')).toBeVisible();
  }
  await page.goto('/research/cases/price-bridge/');
  expect(await page.locator('#bridge-experience').evaluate(el=>el.compareDocumentPosition(document.querySelector('#related-records')!) & Node.DOCUMENT_POSITION_PRECEDING)).toBeTruthy();
  await page.locator('.pilot-paths a[href="#bridge-experience"]').click();
  await expect(page.locator('#bridge-experience')).toBeFocused();
  await expect(page.locator('[data-bridge-preset] option')).toHaveCount(20);
});

test('S3 pilot retains complete no-JS reference and direct anchors in light print', async ({browser,page,browserName},testInfo) => {
  const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:900}});
  const p=await context.newPage();
  for (const [slug,id,count] of [['trend-quality','trend-folds-05-complete',71],['price-bridge','bridge-fully-usable',16]] as const) {
    await p.goto(`/research/cases/${slug}/#claim-${id}`);
    await expect(p.locator(`#claim-${id}`)).toBeVisible();
    await expect(p.locator('#claims .claim-entry')).toHaveCount(count);
    await expect(p.locator('#narrative details')).toHaveAttribute('open','');
    await expect(p.locator('#narrative')).toContainText(slug==='trend-quality'?'Daily trend NAV/returns were not persisted':'earlier complete receipt was unavailable');
    await p.emulateMedia({media:'print'});
    await expect(p.locator('#claims .claim-entry').last()).toBeVisible();
    await expect(p.locator('body')).toHaveCSS('background-color','rgb(255, 255, 255)');
    await p.emulateMedia({media:'screen'});
  }
  await context.close();
  await page.goto('/research/cases/price-bridge/');
  // Use the existing exact capture destination rather than an invented source identity.
  const capture=page.locator('[data-source-panel]').first();
  const id=await capture.getAttribute('id');
  await page.goto(`/research/cases/price-bridge/#${id}-capture`);
  await expect(capture).toHaveAttribute('open','');
  await expectSourceScope(capture);
  if(browserName==='chromium') {
    await page.goto('/research/cases/trend-quality/');
    await page.pdf({path:testInfo.outputPath('s3-trend-light-print.pdf'),format:'A4',printBackground:true});
    await page.goto('/research/cases/price-bridge/');
    await page.pdf({path:testInfo.outputPath('s3-bridge-light-print.pdf'),format:'A4',printBackground:true});
  }
});

test('S3 light pilot reflows with enlarged text and accessible controls', async ({page,browserName},testInfo) => {
  test.setTimeout(180_000);
  await page.emulateMedia({reducedMotion:'reduce'});
  for (const slug of ['trend-quality','price-bridge']) {
    await page.goto(`/research/cases/${slug}/`);
    for (const width of [320,390,768,1280,1440]) {
      await page.setViewportSize({width,height:1000});
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${slug} ${width}`).toBe(true);
      await expect(page.locator('#decision-brief')).toBeVisible();
      if(browserName==='chromium') await page.screenshot({path:testInfo.outputPath(`s3-${slug}-${width}.png`)});
    }
    await page.setViewportSize({width:1280,height:1000});
    // Text-only stress: double each computed font size, without scaling boxes or viewport.
    await page.evaluate(()=>{
      const values=[...document.querySelectorAll<HTMLElement>('body *')].map(el=>[el,parseFloat(getComputedStyle(el).fontSize)*2] as const);
      values.forEach(([el,size])=>el.style.fontSize=`${size}px`);
    });
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${slug} 200% computed text`).toBe(true);
    if(browserName==='chromium') await page.screenshot({path:testInfo.outputPath(`s3-${slug}-text-200.png`)});
    await page.reload();
    await page.setViewportSize({width:320,height:1000});
    const results=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
    expect(results.violations,JSON.stringify(results.violations,null,2)).toEqual([]);
    await expect(page.locator('html')).toHaveCSS('color-scheme','light');
  }
});

test('Comprehension pilot preserves local claim context, determining fold inputs and the static Bridge mechanism', async ({page,browser,browserName},testInfo) => {
  test.setTimeout(180_000); // Multiple contexts and large standalone evidence destinations in Firefox.
  await page.goto('/evidence/claims/#claim-trend-controls-03-sharpe');
  const claim=page.locator('#claim-trend-controls-03-sharpe');
  await expect(claim).toBeVisible();
  await expect(claim.locator('h3')).toContainText('Sharpe ratio:');
  await expect(claim.locator('h3')).not.toContainText('CAGR');
  await expect(claim).toContainText('smoothness of the preceding price path');
  await expect(claim).toContainText('not eligible substitutes');
  await expect(claim).toContainText(publicPublication ? 'reused development history' : privateExpectations.claimPeriod);
  if (!publicPublication) await expect(claim).toContainText(privateExpectations.claimValue);
  if (browserName==='chromium') {
    writeFileSync(testInfo.outputPath('direct-claim-reader.txt'),await claim.innerText());
    await claim.screenshot({path:testInfo.outputPath('direct-claim.png')});
  }
  await expect(claim.getByRole('link',{name:'Understand the investigation'})).toHaveAttribute('href','/research/cases/trend-quality/#information');
  await page.goto('/research/cases/trend-quality/#trend-fold-decision-context');
  const folds=page.locator('#trend-fold-decision-context');
  await expect(folds).toBeVisible();
  if (publicPublication) {
    await expect(folds).toContainText('omitted from the public edition');
    await expect(folds.locator('[data-fold-context="wf2"]')).toContainText('overall decision: false');
    await expect(folds.locator('[data-fold-context="wf4"]')).toContainText('overall decision: true');
    await expect(folds.locator('[data-fold-context="wf5_partial"]')).toContainText('descriptive only');
    await expect(folds.locator('[data-supplement-key]')).toHaveCount(0);
  } else {
  await expect(folds).toContainText('fold context supplement supplies');
  const privateSupplement = JSON.parse(readFileSync('reviewed-supplements/2026-10-31/trend-fold-context-v1.json', 'utf8'));
  const privateRate = Number(privateSupplement.rows.find((row: {period:{id:string}})=>row.period.id==='wf2').rates.candidateNetCagr);
  await expect(folds.locator('[data-fold-context="wf2"]')).toContainText((privateRate*100).toFixed(4)+'%');
  await expect(folds.locator('[data-fold-context="wf2"]')).toContainText(privateExpectations.firstCondition);
  await expect(folds.locator('[data-fold-context="wf4"]')).toContainText(privateExpectations.secondCondition);
  await expect(folds).toContainText(privateExpectations.firstPeriodStart);
  await expect(folds).toContainText('All three are required');
  await expect(folds.locator('dl>div').nth(1)).not.toContainText('true (passed)');
  await expect(folds.locator('dl>div').nth(1)).toContainText('false (failed)');
  await expect(folds.locator('dl>div').nth(3)).toContainText('true (passed)');
  await expect(folds.locator('dl>div').nth(4)).toContainText('descriptive only');
  if (browserName==='chromium') {
    writeFileSync(testInfo.outputPath('direct-fold-reader.txt'),await folds.innerText());
    await folds.locator('[data-fold-context="wf2"]').screenshot({path:testInfo.outputPath('trend-wf2.png')});
    await folds.locator('[data-fold-context="wf4"]').screenshot({path:testInfo.outputPath('trend-wf4.png')});
  }
  const precision=folds.locator('[data-fold-context="wf2"] details');
  await precision.locator('summary').focus(); await page.keyboard.press('Enter');
  await expect(precision).toHaveAttribute('open','');
  await expect(precision.getByRole('link',{name:'Recorded walk-forward CSV'})).toHaveAttribute('href','/evidence/sources/#src-2adacd9e9309');
  }
  await expect(page.locator('#figure-trend-folds figcaption')).not.toContainText('Select recorded');
  const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:900}});
  const p=await context.newPage();
  await p.goto('/research/cases/price-bridge/#repair');
  const repair=p.locator('#repair');
  await expect(repair).toContainText('A share split increases the number of shares');
  await expect(repair.locator('[data-bridge-static-example]')).toContainText('Synthetic teaching example');
  await expect(repair.locator('[data-bridge-static-example]')).toContainText('Two stored zeros');
  if (browserName==='chromium') {
    writeFileSync(testInfo.outputPath('bridge-reader.txt'),(await Promise.all(['#repair','#knowledge','#permission'].map(selector=>p.locator(selector).innerText()))).join('\n\n'));
    await repair.locator('[data-bridge-static-example]').screenshot({path:testInfo.outputPath('bridge-static-example.png')});
  }
  await p.goto('/research/cases/trend-quality/#claim-trend-controls-03-sharpe');
  await expect(p.locator('#claim-trend-controls-03-sharpe [data-publication-context]')).toBeVisible();
  await p.emulateMedia({media:'print'});
  await expect(p.locator('#trend-fold-decision-context')).toBeVisible();
  await context.close();
  await page.goto('/research/cases/price-bridge/');
  await expect(page.locator('[data-bridge-controls]').first()).toBeVisible();
  await expect(page).toHaveURL(/\/research\/cases\/price-bridge\/$/);
  await page.locator('[data-bridge-preset]').selectOption('rounded-zero');
  await expect(page.locator('[data-bridge-preset]')).toHaveValue('rounded-zero');
  await page.goBack();
  await expect(page).toHaveURL(/\/research\/cases\/price-bridge\/$/);
  await expect(page.locator('[data-bridge-preset]')).toHaveValue('positive');
});

test('Research presentation compares saved measures with keyboard, URL history and exact claim recovery', async ({page}) => {
  test.setTimeout(180_000); // Retains all keyboard/history/claim/fold assertions across three engines.
  await page.goto('/research/cases/trend-quality/?keep=reader#figure-trend-controls');
  const controls=page.locator('[data-research-comparison="trend-controls"]');
  const raw=controls.locator('[data-comparison-panel="growth"]');
  const capped=controls.locator('[data-comparison-panel="risk-cap"]');
  await expect(raw).toBeVisible(); await expect(capped).toBeHidden();
  await controls.getByRole('radio',{name:'Recorded growth',exact:true}).focus();
  await page.keyboard.press('ArrowRight');
  await expect(controls.getByRole('radio',{name:'At EMA risk',exact:true})).toBeChecked();
  await expect(capped).toBeVisible(); await expect(raw).toBeHidden();
  await expect(capped).toContainText('4.031%');
  await expect(capped).toContainText('never scaled up');
  expect(new URL(page.url()).searchParams.get('rp-trend-controls')).toBe('risk-cap');
  expect(new URL(page.url()).searchParams.get('keep')).toBe('reader');
  await page.reload(); await expect(capped).toBeVisible();
  await controls.getByRole('button',{name:'Reset comparison'}).click();
  await expect(raw).toBeVisible();
  await page.goBack(); await expect(capped).toBeVisible();
  await capped.locator('a[href$="#claim-trend-controls-03-vol-matched-cagr-to-EMA20-50-UNFILTERED"]').click();
  await expect(page.locator('#claim-trend-controls-03-vol-matched-cagr-to-EMA20-50-UNFILTERED')).toBeVisible();
  await page.goBack(); await expect(capped).toBeVisible();
  await page.goto('/research/cases/trend-quality/?rp-trend-controls=unknown#figure-trend-controls');
  await expect(raw).toBeVisible();
  await page.goto('/research/cases/trend-quality/#figure-trend-selection');
  await expect(page.locator('.comparison-threshold')).toContainText('≤ 0.05');
  await expect(page.locator('[data-research-comparison="trend-selection"] tbody tr')).toHaveCount(5);
  await page.goto('/research/cases/trend-quality/#figure-trend-folds');
  const matrix=page.locator('.gate-matrix');
  await expect(matrix).toContainText('Excluded · partial');
  await matrix.getByRole('link',{name:'wf2 ↗',exact:true}).focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#fold-wf2')).toBeFocused();
  await expect(page.locator('#fold-wf2')).toBeVisible();
  await expect(page.locator('#fold-wf2')).toContainText(publicPublication ? 'underlying return inputs are not included' : privateExpectations.comparisonCondition);
  await page.reload(); await expect(page.locator('#fold-wf2')).toBeVisible();
});

test('Research presentation retains figures, fold conditions and full reference without JavaScript and in print', async ({browser,page,browserName},testInfo) => {
  const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
  const p=await context.newPage();
  await p.goto('/research/cases/trend-quality/#figure-trend-controls');
  await expect(p.locator('[data-comparison-panel="growth"]')).toBeVisible();
  await expect(p.locator('[data-comparison-panel="risk-cap"]')).toBeVisible();
  await expect(p.locator('[data-comparison-controls]')).toBeHidden();
  for(const id of ['trend-controls','trend-selection','trend-folds']) {
    await expect(p.locator(`#figure-${id} table[data-evidence-table]`)).toBeVisible();
    await expect(p.locator(`#figure-${id} img`)).toBeVisible();
  }
  await p.goto('/research/cases/trend-quality/#fold-wf5_partial');
  await expect(p.locator('#fold-wf5_partial')).toContainText('descriptive only');
  await expect(p.locator('#claims .claim-entry')).toHaveCount(71);
  await expect(p.locator('#claims .claim-entry').last()).toBeVisible();
  await p.emulateMedia({media:'print'});
  await expect(p.locator('#trend-fold-decision-context')).toBeVisible();
  await expect(p.locator('body')).toHaveCSS('background-color','rgb(255, 255, 255)');
  await context.close();
  await page.goto('/research/cases/trend-quality/');
  if(browserName==='chromium') {
    await page.pdf({path:testInfo.outputPath('research-case04-print.pdf'),format:'A4',printBackground:true});
    writeFileSync(testInfo.outputPath('research-reader-visible.txt'),await page.locator('.research-reading-body').innerText());
    writeFileSync(testInfo.outputPath('research-opening-reader-visible.txt'),await page.locator('.research-opening').innerText());
  }
});

test('Research presentation opening and distributed figures reflow with accessible navigation', async ({page,browserName},testInfo) => {
  test.setTimeout(300_000); // Five viewports × opening/four chapters plus axe; slow Firefox trace capture remains enabled.
  await page.emulateMedia({reducedMotion:'reduce'});
  for(const width of [320,390,768,1280,1440]) {
    await page.setViewportSize({width,height:900});
    await page.goto('/research/cases/trend-quality/');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`opening ${width}`).toBe(true);
    await expect(page.getByRole('heading',{level:1})).toContainText('smoother price path');
    if(width<=800) {
      await expect(page.locator('.research-mobile-answer')).toBeInViewport();
      await expect(page.getByRole('navigation',{name:'Explore this research'})).toBeInViewport();
    } else await expect(page.locator('.research-opening-decision')).toBeInViewport();
    if(browserName==='chromium') await page.screenshot({path:testInfo.outputPath(`research-opening-${width}.png`)});
    for(const [id,name] of [['information','method'],['figure-trend-controls','controls'],['figure-trend-selection','selection'],['figure-trend-folds','folds']]) {
      await page.goto(`/research/cases/trend-quality/#${id}`);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${id} ${width}`).toBe(true);
      if(browserName==='chromium' && [390,1440].includes(width)) await page.screenshot({path:testInfo.outputPath(`research-${name}-${width}.png`)});
    }
  }
  await page.setViewportSize({width:1280,height:900});
  await page.goto('/research/cases/trend-quality/#comparison');
  await expect(page.locator('[data-research-navigation] a[href="#comparison"]')).toHaveAttribute('aria-current','location');
  await page.setViewportSize({width:390,height:900});
  const results=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
  expect(results.violations,JSON.stringify(results.violations,null,2)).toEqual([]);
  if(browserName==='chromium') writeFileSync(testInfo.outputPath('research-axe.json'),JSON.stringify(results,null,2));
});

test('Optional Bridge lazy import failure preserves static reading without an unhandled error', async ({page}) => {
  const errors:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/_astro/bridge.*.js',route=>route.abort());
  await page.goto('/research/cases/price-bridge/');
  await expect(page.locator('[data-bridge-load-status]')).toContainText('complete static explanation');
  await expect(page.locator('[data-bridge-controls]').first()).toBeHidden();
  await expect(page.locator('#bridge-historical')).toContainText('4,721,129');
  await expect(page.locator('#bridge-historical')).toContainText('source-rights=false');
  expect(errors).toEqual([]);
});

test('S4 six investigations connect reading chapters, exact figures and complete references', async ({page,browserName},testInfo)=>{
 test.setTimeout(180_000);
 const cases=JSON.parse(readFileSync('src/content/cases.json','utf8'));
 const entries=Array.isArray(cases)?cases:cases.cases;
 await page.goto('/research/');
 for(const c of entries) await expect(page.locator(`main a[href="/research/cases/${c.slug}/"]`).first()).toBeVisible();
 await expect(page.locator('main a[href^="/research/previews/#"]')).toHaveCount(4);
 for(const id of ['atlas-ssf','momentum-v2','swing-autopsy','delivery-insider']) {
  await page.goto(`/research/cases/${id}/`);
  await expect(page.locator('#investigation')).toBeVisible();
  await expect(page.locator('#decision-brief')).toBeVisible();
  await expect(page.locator('[data-figure-id]')).toHaveCount(3);
  const c=entries.find((c:{id:string})=>c.id===id);
  await expect(page.locator('[data-claim-id]')).toHaveCount(c.claimIds.length);
  await expect(page.locator('#claims details[data-pilot-disclosure]')).not.toHaveAttribute('open');
  const claim=c.claimIds[0];
  await page.goto(`/research/cases/${id}/#claim-${claim}`);
  await expect(page.locator(`#claim-${claim}`)).toBeInViewport();
  await expect(page.locator(`#claim-${claim} [data-publication-context]`)).toBeVisible();
  await page.reload();
  await expect(page.locator(`#claim-${claim}`)).toBeInViewport();
  if(browserName==='chromium') {
   await page.goto(`/research/cases/${id}/`);
   await page.screenshot({path:testInfo.outputPath(`s4-${id}-desktop.png`)});
   await page.locator('#investigation').screenshot({path:testInfo.outputPath(`s4-${id}-reader.png`)});
   await page.goto(`/evidence/claims/#claim-${claim}`);
   writeFileSync(testInfo.outputPath(`s4-${id}-claim-reader.txt`),await page.locator(`#claim-${claim}`).innerText());
   await page.goto(`/research/cases/${id}/`);
   writeFileSync(testInfo.outputPath(`s4-${id}-reader.txt`),await page.locator('[data-research-experience]').innerText());
  }
 }
 await page.goto('/research/cases/swing-autopsy/#correction');
 await expect(page.locator('#correction')).toContainText('per-winning-trade tax stress series');
 await expect(page.locator('#correction')).toContainText('null');
 await page.goto('/research/cases/delivery-insider/#events');
 await expect(page.locator('#events')).toContainText('Exact June run-source binding is unresolved');
 await page.locator('#events a[href="#delivery-construction-discrepancy"]').click();
 await expect(page.locator('#delivery-construction-discrepancy')).toBeInViewport();
});

test('S4 catalog common and advanced controls preserve exact state and return to results',async({page})=>{
 await page.goto('/research/catalog/?keep=reader');
 const form=page.locator('#catalog-filters');
 await expect(page.locator('#catalog-advanced')).not.toHaveAttribute('open');
 await form.locator('[name="investigation"]').selectOption('momentum-v2');
 const count=await page.locator('[data-catalog-record]:visible').count();
 expect(count).toBeGreaterThan(0);expect(count).toBeLessThan(114);
 await form.locator('[name="view"]').selectOption('table');
 const original=page.url();
 await page.locator('#catalog-table [data-catalog-link]:visible').first().click();
 await expect(page.locator('[data-return-catalog]')).toHaveAttribute('href',/investigation=momentum-v2/);
 await page.reload();
 await page.locator('[data-return-catalog]').click();
 await expect(page).toHaveURL(original);
 await expect(form.locator('[name="view"]')).toHaveValue('table');
 await expect(page.locator('#catalog-table tr[data-compact-record]:visible')).toHaveCount(count);
 await page.goto('/research/catalog/?original_status=__unavailable&instrument=__unavailable&view=table');
 await expect(page.locator('#catalog-advanced')).toHaveAttribute('open','');
 await expect(form.locator('[name="original_status"]')).toHaveValue('__unavailable');
 await expect(form.locator('[name="instrument"]')).toHaveValue('__unavailable');
 await form.getByRole('button',{name:'Clear all'}).click();
 await expect(page.locator('[data-catalog-record]:visible')).toHaveCount(114);
 await page.goBack();
 await expect(form.locator('[name="original_status"]')).toHaveValue('__unavailable');
 await page.goto('/research/catalog/?investigation=invalid&family=invalid&view=invalid');
 await expect(form.locator('[name="investigation"]')).toHaveValue('');
 await expect(form.locator('[name="view"]')).toHaveValue('list');
 await expect(page.locator('[data-catalog-record]:visible')).toHaveCount(114);
});

test('S4 migrated pages retain no-JS evidence, print, reflow and accessible collection navigation',async({browser,page,browserName},testInfo)=>{
 test.setTimeout(300_000);
 const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:320,height:850}});
 const p=await context.newPage();
 for(const [id,count] of [['atlas-ssf',34],['momentum-v2',13],['swing-autopsy',42],['delivery-insider',28]] as const) {
  await p.goto(`/research/cases/${id}/#claims`);
  await expect(p.locator('[data-claim-id]')).toHaveCount(count);
  await expect(p.locator('#claims > details[data-pilot-disclosure]')).toHaveAttribute('open','');
  await expect(p.locator('#narrative details')).toHaveAttribute('open','');
  await expect(p.locator('[data-figure-id] table')).toHaveCount(3);
  expect(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 }
 await context.close();
 for(const id of ['atlas-ssf','momentum-v2','swing-autopsy','delivery-insider']) {
  await page.goto(`/research/cases/${id}/`);
  for(const width of [320,390,768,1280,1440]) {
   await page.setViewportSize({width,height:900});
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${id} at ${width}`).toBe(true);
   if(browserName==='chromium'&&width===390)await page.screenshot({path:testInfo.outputPath(`s4-${id}-mobile.png`)});
  }
  await page.addStyleTag({content:'html{font-size:200% !important}'});
  await page.setViewportSize({width:320,height:900});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${id} doubled text`).toBe(true);
  await page.reload();
  await page.emulateMedia({media:'print'});
  // Media emulation does not emit the browser print lifecycle events.
  await page.evaluate(()=>dispatchEvent(new Event('beforeprint')));
  await expect(page.locator('#claims > details[data-pilot-disclosure]')).toHaveAttribute('open','');
  await expect(page.locator('#narrative details')).toHaveAttribute('open','');
  await page.evaluate(()=>dispatchEvent(new Event('afterprint')));
  await expect(page.locator('#claims > details[data-pilot-disclosure]')).not.toHaveAttribute('open');
  if(browserName==='chromium')await page.pdf({path:testInfo.outputPath(`s4-${id}-print.pdf`),format:'A4',printBackground:true});
  await page.emulateMedia({media:'screen'});
  const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
  expect(axe.violations,JSON.stringify(axe.violations)).toEqual([]);
 }
 for(const route of ['/','/research/','/research/catalog/','/research/previews/','/methods/']) {
  await page.goto(route);
  await page.setViewportSize({width:768,height:900});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
  expect(axe.violations,JSON.stringify(axe.violations)).toEqual([]);
  if(browserName==='chromium') {
   await page.setViewportSize({width:390,height:900});
   await page.screenshot({path:testInfo.outputPath('s4-collection-'+(route.replaceAll('/','-')||'home')+'.png')});
  }
 }
});


test('S5 judged search tasks and exact canonical destinations retain evidence context', async ({page}) => {
  test.setTimeout(180_000);
  const tasks=JSON.parse(readFileSync('docs/search/JUDGED_QUERIES.json','utf8')).tasks as Array<{query:string;expectedDestination:string|null;maximumRank:number}>;
  await page.goto('/search/');
  await expect(page.locator('[data-search-ready]')).toBeVisible();
  const observations=await page.evaluate(async ({tasks,ranking})=>{
    const bundle='/pagefind/pagefind.js';const pf=await import(/* @vite-ignore */ bundle);await pf.options({ranking});const known=await pf.filters();const rows=[];
    for(const task of tasks){const id=Object.keys(known.identity??{}).find(id=>id.toLowerCase()===task.query.toLowerCase());const literal=/^[\w-]+$/.test(task.query)&&/[_\d-]/.test(task.query);const response=await pf.search(id?null:literal?`"${task.query}"`:task.query,id?{filters:{identity:id}}:{});const data=await Promise.all(response.results.slice(0,10).map((r:{data:()=>Promise<{url:string;meta:Record<string,string>}>})=>r.data()));rows.push({query:task.query,total:response.results.length,urls:data.map(d=>d.url),entities:data.map(d=>d.meta.entity)});}return rows;
  },{tasks,ranking:searchRanking});
  for(const [i,row] of observations.entries()){const task=tasks[i];expect(new Set(row.entities).size,task.query).toBe(row.entities.length);if(task.expectedDestination===null)expect(row.total).toBe(0);else expect(row.urls.slice(0,task.maximumRank),task.query).toContain(task.expectedDestination);}
  const q=page.getByRole('textbox',{name:'Search',exact:true});
  for(const [id,url,target] of [['trend-folds-01','/research/cases/trend-quality/#claim-trend-folds-01','#claim-trend-folds-01'],['src-3f6afd0415da','/evidence/sources/#src-3f6afd0415da','#src-3f6afd0415da'],['sweep_reclaim','/research/records/sweep_reclaim/','h1']]){
    await q.fill(id);const first=page.locator('#search-results>li').first();await expect(first.locator('h2 a')).toHaveAttribute('href',url);await expect(first).toContainText(/Archived research evidence|Observed 2026-10-11/);if(id==='trend-folds-01')await expect(first).toContainText('Reproduction: archived result');
    await first.locator('h2 a').focus();await page.keyboard.press('Enter');await expect(page).toHaveURL(url);await expect(page.locator(target)).toBeVisible();await expect(page.locator(target)).toBeInViewport();await page.reload();await expect(page.locator(target)).toBeVisible();await page.goBack();await expect(q).toHaveValue(id);
  }
});

test('S5 search URL filters reload history invalid state and empty recovery remain usable', async ({page}) => {
  await page.goto('/search/?q=Atlas&type=Claim&keep=reader');
  const q=page.getByRole('textbox',{name:'Search',exact:true}),kind=page.getByLabel('Content type',{exact:true});
  await expect(kind).toHaveValue('Claim');await expect(page.locator('#search-results>li').first()).toContainText('Claim');
  await page.getByLabel('Search', {exact:true}).fill('src-3f6afd0415da');
  await expect(page.getByRole('status')).toContainText('No matching results');
  await kind.selectOption('');await expect(page.locator('#search-results>li').first().locator('h2 a')).toHaveAttribute('href','/evidence/sources/#src-3f6afd0415da');
  await page.reload();await expect(q).toHaveValue('src-3f6afd0415da');await expect(kind).toHaveValue('');
  await page.goBack();await expect(kind).toHaveValue('Claim');await expect(page.getByRole('status')).toContainText('No matching results');
  await page.goForward();await expect(kind).toHaveValue('');await expect(page.locator('#search-results>li').first()).toBeVisible();
  await page.getByRole('button',{name:'Clear search and filters'}).click();await expect(q).toHaveValue('');await expect(q).toBeFocused();expect(new URL(page.url()).searchParams.get('keep')).toBe('reader');
  await page.goto('/search/?q=Atlas&q=Swing&type=invalid&role=invalid&keep=reader');await expect(q).toHaveValue('Atlas');await expect(page.getByRole('status')).toContainText('recovered');expect(new URL(page.url()).searchParams.getAll('q')).toEqual(['Atlas']);expect(new URL(page.url()).searchParams.has('type')).toBe(false);
  await q.fill('xyz-nonexistent-linguistic-result');await expect(page.getByRole('status')).toContainText('No matching results');await expect(page.locator('#search-recovery')).toBeVisible();await expect(q).toHaveValue('xyz-nonexistent-linguistic-result');
});

test('S5 search populated facets keyboard loading failure and pagination recover', async ({page}) => {
  test.setTimeout(90_000);
  await page.route('**/pagefind/pagefind.js',async route=>{await new Promise(r=>setTimeout(r,400));await route.continue();});
  await page.goto('/search/');await expect(page.getByRole('status')).toContainText('Loading');
  await expect(page.locator('[data-search-ready]')).toBeVisible();
  await page.getByLabel('Content type',{exact:true}).selectOption('File source');await expect(page.getByRole('status')).toContainText('201 matching results');
  for(const select of await page.locator('#search-form select').all()){const values=await select.locator('option').allTextContents();expect(values.filter(v=>v.endsWith('(0)'))).toEqual([]);}
  await page.getByRole('button',{name:/Show more results/}).focus();await page.keyboard.press('Enter');await expect(page.getByRole('status')).toContainText('Showing 20 of 201');await expect(page.locator('#search-results>li').nth(10).locator('h2 a')).toBeFocused();
  // Restore unfiltered query and prove fast input cannot render an obsolete response.
  await page.getByRole('button',{name:'Clear search and filters'}).click();const q=page.getByRole('textbox',{name:'Search',exact:true});await q.fill('Atlas');await q.fill('src-3f6afd0415da');await expect(page.locator('#search-results>li').first().locator('h2 a')).toHaveAttribute('href','/evidence/sources/#src-3f6afd0415da');
  await page.route('**/pagefind/fragment/*',route=>route.abort());await page.goto('/search/?q=trend-folds-01');await expect(page.getByRole('status')).toContainText('could not load');await expect(page.locator('#search-recovery')).toBeVisible();await page.unroute('**/pagefind/fragment/*');await page.locator('#search-retry').click();await expect(page.locator('#search-results>li').first().locator('h2 a')).toHaveAttribute('href','/research/cases/trend-quality/#claim-trend-folds-01');
});

test('S5 search reflows with accessible controls and keeps no-JS print browse recovery', async ({page,browser,browserName},testInfo) => {
  test.setTimeout(180_000);
  await page.goto('/search/?q=src-3f6afd0415da');await expect(page.locator('#search-results>li').first()).toBeVisible();
  for(const width of [320,390,768,1280,1440]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await page.screenshot({path:testInfo.outputPath(`s5-search-${width}.png`),fullPage:true});}
  await page.setViewportSize({width:768,height:900});await page.addStyleTag({content:'html{font-size:200%!important}'});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  const axe=await new AxeBuilder({page}).analyze();expect(axe.violations).toEqual([]);
  await page.emulateMedia({media:'print'});await expect(page.locator('#search-results>li').first()).toContainText('Original file excluded');await page.screenshot({path:testInfo.outputPath('s5-search-print.png'),fullPage:true});if(browserName==='chromium')await page.pdf({path:testInfo.outputPath('s5-search-print.pdf'),format:'A4',printBackground:true});
  const context=await browser.newContext({javaScriptEnabled:false});const nojs=await context.newPage();await nojs.goto(new URL('/search/',page.url()).href);await expect(nojs.getByText(/Full-text search requires JavaScript/)).toBeVisible();await expect(nojs.locator('main a[href="/evidence/sources/"]')).toBeVisible();await expect(nojs.locator('[data-search-ready]')).toHaveCount(0);await nojs.screenshot({path:testInfo.outputPath('s5-search-no-js.png'),fullPage:true});await context.close();
});

test('Sticky masthead keeps navigation and evidence anchors visible', async ({page}) => {
  await page.setViewportSize({width:1280,height:900});
  await page.goto('/research/cases/trend-quality/');
  const header=page.locator('.site-header');
  await expect(page.locator('.header-note')).toHaveCount(0);
  await page.evaluate(()=>scrollTo(0,1000));
  await expect.poll(async()=>Math.abs((await header.boundingBox())!.y)).toBeLessThan(1);
  await expect(header.getByRole('link',{name:'Research',exact:true})).toHaveAttribute('aria-current','page');
  const chapter=page.locator('.research-chapter[id]').nth(1);
  const id=await chapter.getAttribute('id');
  await page.locator(`.research-navigation a[href="#${id}"]`).click();
  await expect.poll(async()=>((await chapter.boundingBox())!.y-(await header.boundingBox())!.height)).toBeGreaterThanOrEqual(0);
  const contents=await page.locator('.research-navigation').boundingBox();
  expect(contents!.y).toBeGreaterThanOrEqual((await header.boundingBox())!.height);
  for(const route of ['/evidence/claims/#claim-atlas-gates-01','/evidence/sources/#src-3f6afd0415da']) {
    await page.goto(route);
    const target=page.locator(route.split('#')[1].startsWith('claim')?'#claim-atlas-gates-01':'#src-3f6afd0415da');
    await expect.poll(async()=>((await target.boundingBox())!.y-(await header.boundingBox())!.height)).toBeGreaterThanOrEqual(0);
  }
  const skip=page.getByRole('link',{name:'Skip to content'});
  await skip.focus();await expect(skip).toBeVisible();
  expect(await skip.evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+10,r.y+10))})).toBe(true);
  await page.setViewportSize({width:1280,height:400});
  await expect(header).toHaveCSS('position','static');
  await page.emulateMedia({media:'print'});await expect(header).toBeHidden();
});

test('Responsive masthead menu preserves keyboard and no-JS navigation', async ({page,browser}) => {
  for(const width of [320,768,960]) {
    await page.setViewportSize({width,height:844});await page.goto('/');
    const menu=page.locator('.menu-toggle'),nav=page.locator('#main-nav');
    await expect(menu).toBeVisible();await expect(nav).toBeHidden();
    await page.evaluate(()=>scrollTo(0,700));
    expect(Math.abs((await page.locator('.site-header').boundingBox())!.y)).toBeLessThan(1);
    await menu.click();await expect(nav).toBeVisible();await expect(menu).toHaveAttribute('aria-expanded','true');
    const links=nav.getByRole('link');await expect(links).toHaveCount(6);
    for(const link of await links.all())expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await links.first().focus();await page.keyboard.press('Escape');
    await expect(menu).toBeFocused();await expect(nav).toBeHidden();
    await menu.click();await page.locator('main h1').click();await expect(nav).toBeHidden();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  }
  await page.setViewportSize({width:390,height:844});await page.goto('/');
  await page.locator('.menu-toggle').click();await page.locator('#main-nav').getByRole('link',{name:'Search',exact:true}).click();
  await expect(page).toHaveURL(/\/search\//);await expect(page.locator('#search-form input[name="q"]')).toBeVisible();
  const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:320,height:760}});
  const plain=await context.newPage();await plain.goto('/');
  await expect(plain.locator('#main-nav')).toBeVisible();await expect(plain.locator('.menu-toggle')).toBeHidden();
  await expect(plain.locator('.site-header')).toHaveCSS('position','static');
  expect(await plain.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await plain.locator('#main-nav').getByRole('link',{name:'Research',exact:true}).click();await expect(plain).toHaveURL(/\/research\//);
  await context.close();
});


test('Source availability promises match supplied material across reading and search', async ({browser, page}) => {
  test.setTimeout(120_000);
  const context = await browser.newContext({javaScriptEnabled: false});
  const staticPage = await context.newPage();
  try {
    for (const route of ['/research/', '/research/cases/momentum-v2/', '/research/walkthrough/', '/engineering/', '/research/cases/price-bridge/', '/evidence/', '/release/', '/publication/']) {
      await staticPage.goto(route);
      const main = staticPage.locator('main');
      if (publicPublication) {
        await expect(main).toContainText(/omit|absent/i);
        // Detect affirmative promises that would send the reader to absent bodies.
        await expect(main).not.toContainText(/beside exact Python excerpts|uses synthetic prices, five exact source excerpts|Python excerpts and recorded evidence are available below|exact captures and additional active ranges remain|Highlighted lines explain its source mechanism|manifest and excerpt hashes are checked during the local build/);
      }
      const panels = staticPage.locator('[data-source-panel]');
      for (const panel of await panels.all()) {
        await expect(panel.locator('summary')).toContainText(publicPublication ? 'Inspect source metadata' : 'Inspect original source');
        await panel.locator('summary').click();
        await expectSourceScope(panel);
        if (publicPublication) {
          await expect(panel).toContainText('not reverified');
          await expect(panel).not.toContainText('Exact captured Python');
        }
      }
    }
    await staticPage.goto('/evidence/sources/#src-2adacd9e9309');
    const source = staticPage.locator('#src-2adacd9e9309');
    await expect(source).toContainText(publicPublication ? 'return inputs and dates are omitted' : 'makes those selected premises inspectable');
    if (publicPublication) await expect(source).not.toContainText('makes those selected premises inspectable');
    await staticPage.goto('/research/walkthrough/#source-provenance');
    for (const panel of await staticPage.locator('[data-walkthrough-source]').all()) {
      await panel.locator('summary').click();
      await expectSourceScope(panel);
    }
    await page.goto('/research/cases/price-bridge/#bridge-experience');
    await expect(page.locator('[data-bridge-controls]')).toBeVisible();
    await page.locator('[data-bridge-operation]').selectOption('qa');
    const link = page.locator('[data-bridge-source-links] a').first();
    await expect(link).toContainText(publicPublication ? 'Source metadata' : 'Exact');
    await link.focus();
    await page.keyboard.press('Enter');
    const panel = page.locator('[data-source-panel][open]').first();
    await expectSourceScope(panel);
    if (publicPublication) await expect(page.locator('[data-bridge-source-summary]')).toContainText('omitted');
    await page.goBack();
    await expect(page.locator('[data-bridge-operation]')).toHaveValue('qa');
    await page.goto('/search/?q=Momentum');
    await expect(page.locator('[data-search-ready]')).toBeAttached();
    const metadata = await page.evaluate(async () => {
      const bundle = '/pagefind/pagefind.js';
      const pf = await import(/* @vite-ignore */ bundle);
      const results = await pf.search('Momentum');
      const data = await Promise.all(results.results.map((r: {data: () => Promise<{url: string; meta: Record<string, string>}>}) => r.data()));
      return data.find(r => r.url === '/research/walkthrough/')?.meta;
    });
    expect(metadata).toBeTruthy();
    expect(metadata.date).toContain(publicPublication ? 'original text omitted and not reverified' : 'selected current-source captures');
  } finally { await context.close(); }
});
