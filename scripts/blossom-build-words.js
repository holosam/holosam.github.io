#!/usr/bin/env node
// Regenerate assets/blossom/words.js from the SCOWL ESDB common-words list
// and assets/blossom/word_bank.txt. Run with:
//   node scripts/blossom-build-words.js
// First-time setup (fetching the SCOWL input) is documented below.
//
// ─── Validation list (BLOSSOM_WORDS) ───────────────────────────────────────
// Currently sourced from SCOWL/ESDB size-60 American English. SCOWL is the
// well-known frequency-tiered word list maintained by Kevin Atkinson; size
// 60 hits the sweet spot of "common English including inflections, without
// the obscure tail."
//
// Trade-offs if we ever want to revisit:
//
//   List           ~size   Includes inflections?   Notes
//   ───────────────────────────────────────────────────────────────────────
//   SCOWL size 50  ~75k    yes                     Tighter; may reject some
//                                                  real words (e.g. less
//                                                  common but valid plurals).
//   SCOWL size 60  ~110k   yes                     Current. STRANGERS in,
//                                                  EAN/NEVUS/GAST out.
//   SCOWL size 70  ~160k   yes                     Looser; a few weirder
//                                                  archaisms creep back.
//   enable1.txt    ~173k   yes                     Scrabble-derived; lets in
//                                                  QI/ZA/EW-class words.
//   dwyl/english-  ~370k   patchy                  Raw aggregate. What we
//   words                                          had before; too permissive.
//
// To switch sizes: change `max_size=60` in the curl URL below. The rest of
// the pipeline is size-agnostic.
//
// ─── Generation list (BLOSSOM_GEN_WORDS) ───────────────────────────────────
// The curated root-word bank, capped at 8 letters to keep daily chains
// approachable. Longer words (9-10) still validate (so a player can play
// CONSENSUS if they spot it), they just won't appear as targets.
//
// ─── First-time setup: fetching the SCOWL input ────────────────────────────
// assets/blossom/word_bank.txt is committed; assets/blossom/scowl-60.txt is
// gitignored and fetched on demand — rarely, only when bumping the SCOWL size.
// This bootstrap used to be `make blossom-words-fetch`; it's just:
//
//   mkdir -p assets/blossom
//   curl -sL "http://app.aspell.net/create?max_size=60&spelling=US&max_variant=0&diacritic=both&special=hacker&special=roman-numerals&download=wordlist&encoding=utf-8&format=inline" \
//     -o assets/blossom/scowl-60.txt
//
// (The same command is printed by the missing-file error below.)

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SCOWL_PATH = path.join(ROOT, 'assets/blossom/scowl-60.txt');
const WORD_BANK_PATH = path.join(ROOT, 'assets/blossom/word_bank.txt');
const OUT_PATH = path.join(ROOT, 'assets/blossom/words.js');

const MIN_LEN = 3;
const MAX_LEN = 12;
const GEN_MAX_LEN = 8;

if (!fs.existsSync(SCOWL_PATH)) {
  console.error(`Missing ${SCOWL_PATH}.`);
  console.error('Download it with:');
  console.error('  curl -sL "http://app.aspell.net/create?max_size=60&spelling=US&max_variant=0&diacritic=both&special=hacker&special=roman-numerals&download=wordlist&encoding=utf-8&format=inline" -o assets/blossom/scowl-60.txt');
  process.exit(1);
}

// Slurs and strong profanity are curated directly out of the source lists
// (word_bank.txt, and the local scowl-60.txt), so there's no standing blocklist
// of those words living in the repo. The only list-based filtering here is the
// algorithmic proper-noun drop below; offensive words are simply absent from the
// inputs. If you ever re-fetch SCOWL, re-apply that curation to the new file.
const raw = fs.readFileSync(SCOWL_PATH, 'utf8').split('\n');
const valid = new Set();
const onlyLowerLetters = /^[a-z]+$/;

let started = false; // SCOWL prepends a license header, then a `---` separator.
for (const line of raw) {
  const trimmed = line.trim();
  if (!started) {
    if (trimmed === '---') started = true;
    continue;
  }
  // Proper nouns are capitalized in the source (Paris, Obama, Aachen). Skip
  // them BEFORE lowercasing — that's the only signal distinguishing them. Words
  // that are also common nouns keep their separate lowercase entry (China/china,
  // March/march), so this drops only the proper-noun-only spellings.
  if (/^[A-Z]/.test(trimmed)) continue;
  const w = trimmed.toLowerCase();
  if (!onlyLowerLetters.test(w)) continue;
  if (w.length < MIN_LEN || w.length > MAX_LEN) continue;
  valid.add(w);
}

const gen = fs.readFileSync(WORD_BANK_PATH, 'utf8')
  .split('\n')
  .map(s => s.trim().toLowerCase())
  .filter(w => onlyLowerLetters.test(w))
  .filter(w => w.length >= MIN_LEN && w.length <= GEN_MAX_LEN);

const genSet = new Set(gen);
for (const w of genSet) valid.add(w);

const validSorted = [...valid].sort();
const genSorted = [...genSet].sort();

const out = `// Word lists for Blossom. GENERATED — do not edit by hand.
// Regenerate with: node scripts/blossom-build-words.js
//   BLOSSOM_WORDS     = validation pool (SCOWL ESDB size 60, US English,
//                       lengths ${MIN_LEN}-${MAX_LEN}, plus all generation words).
//   BLOSSOM_GEN_WORDS = chain-generation pool (curated word_bank.txt,
//                       capped at ${GEN_MAX_LEN} letters).
// See scripts/blossom-build-words.js for source, license, and trade-offs.
window.BLOSSOM_WORDS = ${JSON.stringify(validSorted)};
window.BLOSSOM_GEN_WORDS = ${JSON.stringify(genSorted)};
`;

fs.writeFileSync(OUT_PATH, out);

console.log(`Wrote ${OUT_PATH}`);
console.log(`  validation: ${validSorted.length} words`);
console.log(`  generation: ${genSorted.length} words`);
const byLen = {};
for (const w of validSorted) byLen[w.length] = (byLen[w.length] || 0) + 1;
console.log('  validation length distribution:');
for (const k of Object.keys(byLen).sort((a, b) => a - b)) console.log(`    ${k}: ${byLen[k]}`);
