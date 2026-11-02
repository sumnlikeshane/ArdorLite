/** Reproducible local Chromium lab observations; this does not measure field INP. */
import { chromium } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import os from 'node:os';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');
const origin = process.env.PERFORMANCE_ORIGIN ?? 'http://127.0.0.1:4321';
const conditions = {
  browser: 'Playwright Chromium headless',
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true,
  cpuThrottlingRate: 4,
  network: { offline: false, latencyMs: 150, downloadBytesPerSecond: 200_000, uploadBytesPerSecond: 93_750, connectionType: 'cellular3g' },
  cacheDisabled: true, freshBrowserContextPerRun: true, runsPerPage: 3,
  navigationWaitUntil: 'load', settlingTimeMs: 3000,
  javascriptGzip: 'gzip level9 over actual requested local JavaScript files; inline scripts reported separately; not HTTP transfer compression',
  metricScope: 'LCP and CLS observed during initial load plus 3000ms settling, before interaction; Event Timing/menu wall latency observed separately',
  origin, host: { platform: os.platform(), architecture: os.arch(), cpuModel: os.cpus()[0]?.model, cpuCount: os.cpus().length },
};
const sha = buffer => createHash('sha256').update(buffer).digest('hex');
const json = async path => JSON.parse(await readFile(resolve(root, path), 'utf8'));
const fileBytes = async path => {
  const bytes = await readFile(resolve(dist, path.replace(/^\//, '')));
  return { path: '/' + path.replace(/^\//, ''), bytes: bytes.length, gzipBytes: gzipSync(bytes, { level: 9 }).length, sha256: sha(bytes) };
};
const sum = (files, key) => files.reduce((total, file) => total + file[key], 0);
const localJs = urls => [...new Set(urls.map(url => new URL(url)).filter(url => url.origin === origin && url.pathname.endsWith('.js')).map(url => url.pathname))].sort();
const sizes = async paths => Promise.all(paths.map(fileBytes));

async function verifyArtifact(output) {
  for (const file of output.files) {
    const bytes = await readFile(resolve(dist, file.path));
    if (sha(bytes) !== file.sha256 || bytes.length !== file.sizeBytes) throw new Error(`Dist changed after audit: ${file.path}`);
  }
}

// Report the build entry's static and dynamic imports as well as actual network requests.
async function bundleGraph(route) {
  const html = await readFile(resolve(dist, route.replace(/^\//, ''), 'index.html'), 'utf8');
  const entries = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*>/g)].map(match => match[1]);
  const inline = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)].filter(match => !/\bsrc=/.test(match[1])).map(match => match[2]);
  const initial = new Set(); const dynamicRoots = new Set();
  const walk = async (path, destination, collectDynamic) => {
    if (!path.startsWith('/') || !path.endsWith('.js') || destination.has(path)) return;
    destination.add(path);
    const source = await readFile(resolve(dist, path.slice(1)), 'utf8');
    const imports = [...source.matchAll(/(?:import|export)\s*(?:[^'"`;]*?\bfrom\s*)?['"]([^'"]+)['"]/g)].map(match => match[1]);
    for (const item of imports) if (item.startsWith('.')) await walk(posix.resolve(posix.dirname(path), item), destination, collectDynamic);
    if (collectDynamic) for (const match of source.matchAll(/import\(\s*(['"`])([^'"`]+)\1\s*\)/g)) {
      if (match[2].startsWith('.') && !match[2].includes('${')) dynamicRoots.add(posix.resolve(posix.dirname(path), match[2]));
    }
  };
  for (const entry of entries) await walk(entry, initial, true);
  const deferred = new Set();
  for (const path of dynamicRoots) await walk(path, deferred, false);
  for (const path of initial) deferred.delete(path);
  const initialFiles = await sizes([...initial].sort()); const deferredFiles = await sizes([...deferred].sort());
  const inlineBytes = Buffer.from(inline.join('\n'));
  return { entryScriptUrls: entries, initialStaticImports: initialFiles, initialStaticGzipBytes: sum(initialFiles, 'gzipBytes'),
    deferredDynamicImports: deferredFiles, deferredDynamicGzipBytes: sum(deferredFiles, 'gzipBytes'),
    inlineJavaScriptBytes: inlineBytes.length, inlineJavaScriptGzipBytes: gzipSync(inlineBytes, { level: 9 }).length };
}

async function measure(browser, route, run) {
  const context = await browser.newContext({ viewport: conditions.viewport, deviceScaleFactor: 1, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const client = await context.newCDPSession(page);
  await client.send('Network.enable');
  await client.send('Network.setCacheDisabled', { cacheDisabled: true });
  await client.send('Network.emulateNetworkConditions', { offline: false, latency: conditions.network.latencyMs,
    downloadThroughput: conditions.network.downloadBytesPerSecond, uploadThroughput: conditions.network.uploadBytesPerSecond, connectionType: conditions.network.connectionType });
  await client.send('Emulation.setCPUThrottlingRate', { rate: conditions.cpuThrottlingRate });
  const requests = [];
  page.on('requestfinished', request => requests.push(request.url()));
  await page.addInitScript(() => {
    window.__ardorLab = { lcp: null, cls: 0, events: [], unsupported: [], shifts: [], fontEvents: [], shiftSession: { start: 0, last: 0, value: 0 } };
    document.fonts.addEventListener('loadingdone', () => window.__ardorLab.fontEvents.push({ event: 'loadingdone', milliseconds: performance.now() }));
    const observe = (type, callback, options = {}) => {
      try { new PerformanceObserver(list => list.getEntries().forEach(callback)).observe({ type, buffered: true, ...options }); }
      catch { window.__ardorLab.unsupported.push(type); }
    };
    observe('largest-contentful-paint', entry => { window.__ardorLab.lcp = { milliseconds: entry.startTime, size: entry.size, element: entry.element?.tagName ?? null, url: entry.url ?? '' }; });
    observe('layout-shift', entry => {
      if (entry.hadRecentInput) return;
      window.__ardorLab.shifts.push({ milliseconds: entry.startTime, value: entry.value,
        sources: entry.sources.map(source => ({ node: { tag: source.node?.tagName ?? source.node?.parentElement?.tagName ?? null,
          id: source.node?.id ?? source.node?.parentElement?.id ?? '', className: source.node?.className ?? source.node?.parentElement?.className ?? '' },
          previousRect: source.previousRect.toJSON(), currentRect: source.currentRect.toJSON() })) });
      const session = window.__ardorLab.shiftSession;
      if (session.last > 0 && entry.startTime - session.last < 1000 && entry.startTime - session.start < 5000) session.value += entry.value;
      else { session.start = entry.startTime; session.value = entry.value; }
      session.last = entry.startTime;
      window.__ardorLab.cls = Math.max(window.__ardorLab.cls, session.value);
    });
    observe('event', entry => { if (entry.interactionId) window.__ardorLab.events.push({ name: entry.name, interactionId: entry.interactionId, durationMs: entry.duration, inputDelayMs: entry.processingStart - entry.startTime, processingMs: entry.processingEnd - entry.processingStart }); }, { durationThreshold: 16 });
  });
  const wallStart = performance.now();
  await page.goto(origin + route, { waitUntil: 'load', timeout: 120_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(conditions.settlingTimeMs);
  const initial = await page.evaluate(() => ({ ...window.__ardorLab, navigation: performance.getEntriesByType('navigation')[0]?.toJSON(),
    resourceTimings: performance.getEntriesByType('resource').map(entry => ({ path: new URL(entry.name).pathname,
      initiatorType: entry.initiatorType, startTimeMs: entry.startTime, responseEndMs: entry.responseEnd, durationMs: entry.duration })) }));
  const initialLoadWallTimeMs = performance.now() - wallStart;
  const initialFiles = await sizes(localJs(requests));
  const menu = page.getByRole('button', { name: 'Open menu', exact: true });
  const interactionStart = performance.now();
  await menu.click();
  await page.getByRole('button', { name: 'Close menu', exact: true }).waitFor();
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const menuWallLatencyMs = performance.now() - interactionStart;
  await page.getByRole('button', { name: 'Close menu', exact: true }).click();
  let teachingInteraction = null;
  const teachingAction = route === '/research/cases/price-bridge/'
    ? { selector: '[data-bridge-preset]', value: 'penny-ticks', action: 'Select the fictional penny-tick preset' }
    : route === '/engineering/'
      ? { selector: '[data-comparison-preset]', value: 'missing-numeric', action: 'Select the missing numeric comparison trace' }
      : null;
  if (teachingAction) {
    const start = performance.now();
    await page.locator(teachingAction.selector).selectOption(teachingAction.value);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    teachingInteraction = { action: teachingAction.action, wallLatencyMs: performance.now() - start, fieldInp: null };
  }
  let plot = null;
  let researchInteraction = null;
  if (route === '/research/cases/trend-quality/') {
    const controls = page.locator('[data-research-comparison="trend-controls"]');
    await controls.scrollIntoViewIfNeeded();
    await page.evaluate(() => {
      window.__researchPaintSamples = [];
      document.addEventListener('change', event => {
        if (!event.target?.matches?.('[data-comparison-input]')) return;
        const start = performance.now();
        requestAnimationFrame(() => requestAnimationFrame(() => window.__researchPaintSamples.push(performance.now() - start)));
      }, {capture:true});
    });
    for (let change=0; change<20; change++) {
      await controls.locator(`input[value="${change%2===0?'risk-cap':'growth'}"]`).check();
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    }
    const samples = await page.evaluate(() => window.__researchPaintSamples);
    const ordered = [...samples].sort((a,b)=>a-b);
    researchInteraction = { action:'Alternate the saved raw-growth/EMA-risk field 20 times', sampleCount:samples.length,
      eventToTwoFramesMs:samples, p95EventToTwoFramesMs:ordered[Math.ceil(ordered.length*.95)-1] ?? null,
      scope:'Captured native change event to two animation frames; includes layout/paint scheduling under the recorded CPU profile. Not field INP.' };
  }
  if (route === '/research/cases/atlas-ssf/') {
    const block = page.locator('[data-recorded-view="ssf-economics"]');
    const button = block.getByRole('button', { name: 'Show recorded-value view', exact: true });
    await button.scrollIntoViewIfNeeded();
    const before = new Set(localJs(requests)); const start = performance.now();
    await button.click();
    await block.locator('[data-plot] svg').waitFor({ timeout: 120_000 });
    const plotFiles = await sizes(localJs(requests).filter(path => !before.has(path)));
    plot = { requestedAfterExplicitButton: true, latencyToSvgMs: performance.now() - start, javascript: plotFiles, gzipBytes: sum(plotFiles, 'gzipBytes') };
  }
  await page.waitForTimeout(300);
  const events = await page.evaluate(() => window.__ardorLab.events);
  const result = { route, run, initialLcp: initial.lcp, initialCls: initial.cls, unsupportedObservers: initial.unsupported,
    initialLoadWallTimeMs, runWallTimeMs: performance.now() - wallStart, navigation: initial.navigation,
    initialLayoutShifts: initial.shifts, initialFontEvents: initial.fontEvents, resourceTimings: initial.resourceTimings,
    initialJavaScript: initialFiles, initialJavaScriptGzipBytes: sum(initialFiles, 'gzipBytes'),
    initialPagefindLoaded: initialFiles.some(file => file.path.startsWith('/pagefind/')),
    initialPlotLoaded: initialFiles.some(file => plotBundlePaths.has(file.path)),
    interactionObservation: { action: 'Open mobile menu, wait two animation frames, then close', menuWallLatencyMs, eventTimingEntries: events, fieldInp: null },
    optionalPlot: plot, teachingInteraction, researchInteraction };
  await context.close();
  return result;
}

const output = await json('receipts/output-audit.json');
const build = await json('receipts/clean-build.json');
if (build.status !== 'passed' || build.artifactIdentity !== output.artifactIdentity) throw new Error('A passed final integrated build matching output audit is required before performance measurement.');
await verifyArtifact(output);
const routes = process.argv.length>2 ? process.argv.slice(2) : ['/', '/research/cases/atlas-ssf/', '/engineering/', '/research/cases/price-bridge/'];
if(routes.some(route=>!/^\/(?:[a-z0-9-]+\/)*$/.test(route))) throw new Error('Supply local publication route paths only.');
const bundleGraphs = Object.fromEntries(await Promise.all(routes.map(async route => [route, await bundleGraph(route)])));
// The Atlas reading route dynamically imports only its explicitly requested Plot view.
// A Bridge teaching module is also deferred, but is not Plot.
const atlasGraph = bundleGraphs['/research/cases/atlas-ssf/'] ?? await bundleGraph('/research/cases/atlas-ssf/');
const plotBundlePaths = new Set(atlasGraph.deferredDynamicImports.map(file => file.path));
const searchJavaScriptInventory = await sizes(output.files.filter(file => file.path.startsWith('pagefind/') && file.path.endsWith('.js')).map(file => file.path));
const browser = await chromium.launch();
const runs = [];
try {
  conditions.browserVersion = browser.version();
  for (const route of routes) for (let run = 1; run <= 3; run++) {
    const result = await measure(browser, route, run); runs.push(result);
    console.log(`${route} run ${run}: LCP ${result.initialLcp?.milliseconds?.toFixed(0) ?? 'unavailable'}ms; CLS ${result.initialCls.toFixed(4)}; initial JS gzip ${result.initialJavaScriptGzipBytes} bytes`);
  }
} finally { await browser.close(); }
await verifyArtifact(output);
const median = values => {
  const finite = values.filter(Number.isFinite).sort((a, b) => a - b);
  return finite.length ? finite[Math.floor(finite.length / 2)] : null;
};
const pages = Object.fromEntries(routes.map(route => {
  const sample = runs.filter(run => run.route === route);
  return [route, { medianLcpMs: median(sample.map(run => run.initialLcp?.milliseconds ?? Infinity)), maximumCls: Math.max(...sample.map(run => run.initialCls)),
    maximumInitialJavaScriptGzipBytes: Math.max(...sample.map(run => run.initialJavaScriptGzipBytes)),
    medianMenuWallLatencyMs: median(sample.map(run => run.interactionObservation.menuWallLatencyMs)),
    medianTeachingWallLatencyMs: median(sample.map(run => run.teachingInteraction?.wallLatencyMs)),
    labLcpTargetMet: sample.every(run => run.initialLcp && run.initialLcp.milliseconds <= 2500),
    labClsTargetMet: sample.every(run => run.initialCls <= 0.1),
    initialJavaScriptBudgetMet: sample.every(run => run.initialJavaScriptGzipBytes + bundleGraphs[route].inlineJavaScriptGzipBytes < 50_000),
    experienceJavaScriptBudgetMet: !['/engineering/', '/research/cases/price-bridge/'].includes(route) || sample.every(run => run.initialJavaScriptGzipBytes + bundleGraphs[route].inlineJavaScriptGzipBytes < 30_000),
    plotAbsentUntilExplicitInteraction: sample.every(run => !run.initialPlotLoaded),
    pagefindAbsentFromInitialReadingPage: sample.every(run => !run.initialPagefindLoaded) }];
}));
const goalsMet = Object.values(pages).every(page => page.labLcpTargetMet && page.labClsTargetMet && page.initialJavaScriptBudgetMet && page.experienceJavaScriptBudgetMet && page.pagefindAbsentFromInitialReadingPage && page.plotAbsentUntilExplicitInteraction);
const receipt = { schemaVersion: 1, measuredAt: new Date().toISOString(), artifactIdentity: output.artifactIdentity,
  status: goalsMet ? 'passed' : 'completed_with_findings', measurementStatus: 'completed', goalsMet, conditions, pages, bundleGraphs, runs,
  searchJavaScript: { files: searchJavaScriptInventory, totalGzipBytes: sum(searchJavaScriptInventory, 'gzipBytes'),
    scope: 'Inventory of Pagefind JavaScript available to Search; this is an upper bound over all search JS, not the actual initial Search transfer. None is requested by the measured reading routes.' },
  limits: [
    'Local Chromium lab observations on the recorded host. CPU and network emulation do not establish real-device or field behavior.',
    'Three initial-load observations per route are descriptive; they do not estimate a field 75th percentile.',
    'Event Timing entries and menu action wall latency are observational interaction measurements, not field INP. Wall latency includes Playwright and frame scheduling overhead.',
    'Initial CLS is observed only through the documented settling window. Scroll-driven and later-session stability require separate interaction review.',
    'Plot is identified by the Atlas recorded-view dynamic-import graph. Deferred case teaching modules are distinct and can load on their own reading page.',
    'Gzip byte counts are offline file compression estimates, not measured HTTP transfer sizes. Inline script gzip is reported separately.',
    'Status is passed only if the documented per-page lab targets and reading-page JavaScript/loading checks all pass; completed_with_findings retains measured failures honestly.',
  ] };
await writeFile(resolve(root, process.env.ARDOR_PERFORMANCE_RECEIPT ?? 'receipts/performance.json'), JSON.stringify(receipt, null, 2) + '\n');
console.log(`Performance observations written for ${output.artifactIdentity}; all lab targets met: ${goalsMet}.`);
