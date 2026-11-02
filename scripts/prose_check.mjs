/** Advisory Vale view of editable prose. Never execute/import authored content. */
import { createRequire } from 'node:module';
import { readFileSync, readdirSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { resolve, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import ts from 'typescript';

const root = fileURLToPath(new URL('../', import.meta.url));
// Reuse Astro's locked compiler; no floating/global parser dependency.
const requireAstro = createRequire(import.meta.resolve('astro/package.json'));
const { parse } = await import(requireAstro.resolve('@astrojs/compiler-rs'));
const hash = value => createHash('sha256').update(value).digest('hex');
const walkFiles = path => readdirSync(path, { withFileTypes: true }).flatMap(entry => entry.isDirectory()
  ? walkFiles(resolve(path, entry.name)) : [resolve(path, entry.name)]);

export function extractAstro(source) {
  const result = parse(source);
  if (result.diagnostics?.some(d => d.severity === 'error')) throw new Error('Astro prose parse failed');
  const texts = [];
  const add = (text, offset) => {
    const value = text.replace(/\s+/g, ' ').trim();
    if (value && /\p{L}/u.test(value)) texts.push({ text: value, line: source.slice(0, offset ?? 0).split('\n').length });
  };
  const walk = (node, ancestors = []) => {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'AstroScript' || node.type === 'AstroStyle' || node.type?.startsWith('TS')
      || node.type === 'ImportDeclaration' || node.type === 'ThrowStatement') return;
    if (node.type === 'JSXElement') {
      const tag = node.openingElement?.name?.name;
      if (['script', 'style', 'code', 'pre'].includes(tag)) return;
    }
    if (node.type === 'JSXAttribute') {
      if (!['alt', 'title', 'aria-label', 'placeholder', 'summary', 'note'].includes(node.name?.name)) return;
    }
    if (node.type === 'JSXText') add(node.value, node.start);
    if (node.type === 'TemplateElement' && node.value?.cooked) add(node.value.cooked, node.start);
    // Include authored conditional/frontmatter strings. Skip IDs/paths/tokens
    // without words; expressions derived from frozen evidence are not rewritten.
    if (node.type === 'Literal' && typeof node.value === 'string' && /\p{L}.*\s+.*\p{L}/u.test(node.value)) add(node.value, node.start);
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach(child => walk(child, [...ancestors, node.type]));
      else if (value && typeof value === 'object') walk(value, [...ancestors, node.type]);
    }
  };
  walk(result.ast);
  return texts;
}

export function extractStructured(source, extension) {
  const texts = [];
  const add = (text, line) => {
    if (/\p{L}.*\s+.*\p{L}/u.test(text)) texts.push({ text: text.replace(/\s+/g, ' ').trim(), line });
  };
  if (extension === 'json') {
    const walk = value => {
      if (typeof value === 'string') add(value, null);
      else if (Array.isArray(value)) value.forEach(walk);
      else if (value && typeof value === 'object') Object.values(value).forEach(walk);
    };
    walk(JSON.parse(source));
  } else {
    const ast = ts.createSourceFile('prose.ts', source, ts.ScriptTarget.Latest, true);
    if (ast.parseDiagnostics.length) throw new Error('TypeScript prose parse failed');
    const walk = node => {
      if (ts.isImportDeclaration(node) || ts.isTypeNode(node) || ts.isThrowStatement(node)) return;
      if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || [ts.SyntaxKind.TemplateHead,ts.SyntaxKind.TemplateMiddle,ts.SyntaxKind.TemplateTail].includes(node.kind)) add(node.text, ast.getLineAndCharacterOfPosition(node.getStart()).line + 1);
      ts.forEachChild(node, walk);
    };
    walk(ast);
  }
  return texts;
}

function main() {
  const output = resolve(root, 'generated/prose');
  rmSync(output, { recursive: true, force: true }); mkdirSync(output, { recursive: true });
  const selected = [
    ...walkFiles(resolve(root, 'src/pages')).filter(p => p.endsWith('.astro')),
    ...walkFiles(resolve(root, 'src/components')).filter(p => p.endsWith('.astro')),
    ...walkFiles(resolve(root, 'src/content')).filter(p => /\.(ts|json|md)$/.test(p)
      && !p.includes('/source-excerpts/') && !p.endsWith('/walkthrough-source.json')),
    // This adapter also authors the shared variant description from evidence.
    resolve(root, 'src/lib/publication/supplement.ts'),
    resolve(root, 'src/lib/research/presentation.ts'),
    resolve(root, 'src/lib/search/documents.ts'),
    resolve(root, 'src/scripts/search.ts'),
  ];
  const manifest = [];
  for (const path of selected.sort()) {
    const source = readFileSync(path, 'utf8'), rel = relative(root, path), ext = path.split('.').at(-1);
    const texts = ext === 'astro' ? extractAstro(source) : ext === 'md' ? [{ text: source, line: 1 }] : extractStructured(source, ext);
    const target = rel.replaceAll('/', '__') + '.txt';
    const body = texts.map(item => item.text).join('\n\n') + '\n';
    writeFileSync(resolve(output, target), body);
    manifest.push({ source: rel, sourceSha256: hash(source), output: target, outputSha256: hash(body), segments: texts });
  }
  writeFileSync(resolve(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  const lock = JSON.parse(readFileSync(resolve(root, 'config/vale/dependencies.json'), 'utf8'));
  const binary = process.env.ARDOR_VALE_BIN || resolve(root, '.cache/tools/vale-3.25.1/vale');
  if (!existsSync(binary)) throw new Error('Pinned Vale missing. See docs/EDITORIAL_WORKFLOW.md; extraction is available in generated/prose.');
  if (!process.env.ARDOR_VALE_BIN && hash(readFileSync(binary)) !== lock.cli.binarySha256) throw new Error('Pinned Vale binary hash mismatch');
  const version = spawnSync(binary, ['--version'], { encoding: 'utf8' });
  if (version.status !== 0 || version.stdout.trim() !== `vale version ${lock.cli.version}`) throw new Error('Unexpected Vale version');
  const run = spawnSync(binary, ['--no-global', '--config=.vale.ini', '--output=JSON', 'generated/prose'], { cwd: root, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
  if (run.error || run.status !== 0) throw new Error(`Vale could not complete advisory check: ${run.error || run.stderr || run.stdout}`);
  const alerts = JSON.parse(run.stdout), byRule = {}, bySeverity = {};
  for (const fileAlerts of Object.values(alerts)) for (const alert of fileAlerts) {
    byRule[alert.Check] = (byRule[alert.Check] ?? 0) + 1;
    bySeverity[alert.Severity] = (bySeverity[alert.Severity] ?? 0) + 1;
  }
  const receipt = { schemaVersion: 1, planId: 'AL-COMP-001', mode: 'advisory', status: 'completed_with_findings',
    checkedAt: new Date().toISOString(), date: new Date().toISOString().slice(0, 10), cliVersion: lock.cli.version, sourceFiles: manifest.length,
    segments: manifest.reduce((n, file) => n + file.segments.length, 0), dependencyDigest: hash(JSON.stringify(manifest.map(({ source, sourceSha256 }) => ({ source, sourceSha256 })))),
    rulesDigest: hash(walkFiles(resolve(root, 'config/vale/styles')).sort().map(p => `${relative(root, p)}:${hash(readFileSync(p))}`).join('\n') + readFileSync(resolve(root, '.vale.ini'))),
    bySeverity, byRule, alerts, exclusions: ['frozen reviewed snapshot', 'embedded source captures', 'walkthrough source manifest', 'generated/dist/vendored prose', 'code/pre/script/style', 'dynamic strings supplied by canonical evidence'],
    limitations: ['Segments preserve words but not full rendered order or dynamic interpolation.', 'Terms and readability prompts cannot establish missing definitions.', 'No claim of human comprehension or semantic acceptance.'] };
  const receiptPath = resolve(root, 'receipts/prose-advisory.json');
  mkdirSync(dirname(receiptPath), { recursive: true }); writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + '\n');
  console.log(JSON.stringify({ ...receipt, alerts: undefined }, null, 2));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
