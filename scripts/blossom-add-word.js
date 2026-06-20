#!/usr/bin/env node
// Add one or more words to Blossom's word bank and rebuild the served word list.
// The counterpart to blossom-remove-word.js — for a real word the game rejects:
//
//   node scripts/blossom-add-word.js <word> [word2 ...]
//   make blossom-add-word word="yeet zonk"
//
// Words go into the committed word_bank.txt (not the gitignored, re-fetched
// scowl-60.txt). The build merges the gen pool into the validation set, so a bank
// word becomes BOTH a valid play AND a possible daily target — not the place for
// validate-only words. Words must be 3-8 letters (a-z).

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const WORD_BANK_PATH = path.join(ROOT, 'assets/blossom/word_bank.txt');
const BUILD_SCRIPT = path.join(__dirname, 'blossom-build-words.js');

const MIN_LEN = 3;
const MAX_LEN = 8; // GEN_MAX_LEN in blossom-build-words.js

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

const existing = new Set(
  fs.readFileSync(WORD_BANK_PATH, 'utf8').split('\n').map(l => l.trim()).filter(Boolean)
);

const added = [];
for (const w of targets) {
  if (existing.has(w)) {
    console.log(`  "${w}": already in the bank`);
    continue;
  }
  existing.add(w);
  added.push(w);
}

if (!added.length) {
  console.log('Nothing new to add — word list unchanged, skipping rebuild.');
  process.exit(0);
}

// Keep the bank C-sorted (byte order) to match how it ships; everything here is
// lowercase a-z, so plain comparison matches the existing `sort -c`.
const sorted = [...existing].sort();
fs.writeFileSync(WORD_BANK_PATH, sorted.join('\n') + '\n');
console.log(`Added to word_bank.txt: ${added.join(', ')}`);

console.log('Rebuilding assets/blossom/words.js …');
execFileSync('node', [BUILD_SCRIPT], { stdio: 'inherit' });
