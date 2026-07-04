#!/usr/bin/env node
// Add one or more words to Blossom's validation list and rebuild the served
// word list. The counterpart to blossom-remove-word.js — for a real word the
// game rejects:
//
//   node scripts/blossom-add-word.js <word> [word2 ...]
//
// Words go into the committed extra_words.txt, which merges into validation
// ONLY — they become valid plays but never daily-chain targets (adding to the
// gitignored scowl-60.txt would be lost on the next re-fetch). To make a word
// a generation candidate, edit the curated word_bank.txt by hand — that's a
// taste decision, not a quick fix, and any bank edit reshuffles all future
// daily boards. Words must be 3-12 letters (a-z).

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const WORD_BANK_PATH = path.join(ROOT, 'assets/blossom/word_bank.txt');
const EXTRA_PATH = path.join(ROOT, 'assets/blossom/extra_words.txt');
const BUILD_SCRIPT = path.join(__dirname, 'blossom-build-words.js');

const MIN_LEN = 3;
const MAX_LEN = 12; // matches the validation pool cap in blossom-build-words.js

const input = process.argv.slice(2).map(w => w.trim().toLowerCase()).filter(Boolean);
if (!input.length) {
  console.error('Usage: node scripts/blossom-add-word.js <word> [word2 ...]');
  process.exit(1);
}

const onlyLowerLetters = /^[a-z]+$/;
const targets = [];
for (const w of new Set(input)) {
  if (!onlyLowerLetters.test(w)) {
    console.warn(`  "${w}": skipped — letters a-z only`);
    continue;
  }
  if (w.length < MIN_LEN || w.length > MAX_LEN) {
    console.warn(`  "${w}": skipped — must be ${MIN_LEN}-${MAX_LEN} letters`);
    continue;
  }
  targets.push(w);
}
if (!targets.length) {
  console.log('Nothing valid to add — word list unchanged, skipping rebuild.');
  process.exit(0);
}

const readList = f =>
  fs.existsSync(f)
    ? fs.readFileSync(f, 'utf8').split('\n').map(l => l.trim()).filter(Boolean)
    : [];
const bank = new Set(readList(WORD_BANK_PATH));
const existing = new Set(readList(EXTRA_PATH));

const added = [];
for (const w of targets) {
  if (bank.has(w)) {
    console.log(`  "${w}": already in word_bank.txt (already valid)`);
    continue;
  }
  if (existing.has(w)) {
    console.log(`  "${w}": already in extra_words.txt`);
    continue;
  }
  existing.add(w);
  added.push(w);
}

if (!added.length) {
  console.log('Nothing new to add — word list unchanged, skipping rebuild.');
  process.exit(0);
}

// Keep the list C-sorted (byte order) to match word_bank.txt; everything here
// is lowercase a-z, so plain comparison matches.
const sorted = [...existing].sort();
fs.writeFileSync(EXTRA_PATH, sorted.join('\n') + '\n');
console.log(`Added to extra_words.txt: ${added.join(', ')}`);

console.log('Rebuilding assets/blossom/words.js …');
execFileSync('node', [BUILD_SCRIPT], { stdio: 'inherit' });
