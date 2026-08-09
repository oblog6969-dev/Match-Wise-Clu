// Builds MatchWise-preview.html — one self-contained file, works offline by double-click.
// Run: node build-single.js
const fs = require('fs');
const rd = f => fs.readFileSync(f, 'utf8');

// Strip ES module syntax. Anchored to column 0 so identifiers like
// `importBtn:` or `exportedAt:` inside objects are never touched.
const strip = s => s
  .replace(/^import\s[^\n]*\n/gm, '')   // whole-line imports only
  .replace(/^export\s+/gm, '');         // `export const` / `export function`

const bundle = [
  strip(rd('js/questions.js')),
  strip(rd('js/i18n.js')),
  strip(rd('js/cloud.js')),
  strip(rd('js/scoring.js')),
  strip(rd('js/report.js')),
  strip(rd('js/app.js')).replace(/if \("serviceWorker"[\s\S]*?\{\}\);/, ''),
].join('\n\n');

let html = rd('index.html')
  .replace('<link rel="stylesheet" href="style.css">', `<style>\n${rd('style.css')}\n</style>`)
  .replace('<link rel="manifest" href="manifest.json">', '')
  .replace('<script type="module" src="js/app.js"></script>', `<script>\n${bundle}\n</script>`);

fs.writeFileSync('MatchWise-preview.html', html);

// Sanity checks — fail loudly rather than shipping a broken file
const problems = [];
if (/^import\s/m.test(html)) problems.push('leftover import');
if (/^export\s/m.test(html)) problems.push('leftover export');
if (/src="js\/|href="style\.css/.test(html)) problems.push('external reference');
for (const key of ['importBtn:', 'levelLow:', 'sTitle:', 'previewBtn:',
                   'previewTitle:', 'create_profile', 'get_profile', 'SUPABASE_URL'])
  if (!html.includes(key)) problems.push('missing ' + key);
if (problems.length) { console.error('BUILD PROBLEMS:', problems); process.exit(1); }
console.log('built MatchWise-preview.html:', html.length, 'bytes — checks passed');
