#!/usr/bin/env node
// Pull one or more words out of Blossom's word banks and rebuild the served
// word list — an offensive term we missed, a proper noun that slipped through:
//
//   node scripts/blossom-remove-word.js <word> [word2 ...]
//   make blossom-remove-word word="foo bar"
//
// Deletes the word (case-insensitive, whole line) from both word_bank.txt and
// scowl-60.txt, then rebuilds words.js. We edit the *sources* rather than keep a
// blocklist, so no standing list of pulled slurs lives in the repo; a word must
// leave BOTH banks to leave validation, since the build merges them.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const WORD_BANK_PATH = path.join(ROOT, 'assets/blossom/word_bank.txt');
const SCOWL_PATH = path.join(ROOT, 'assets/blossom/scowl-60.txt');
const BUILD_SCRIPT = path.join(__dirname, 'blossom-build-words.js');

const words = process.argv.slice(2).map(w => w.trim().toLowerCase()).filter(Boolean);
if (!words.length) {
  console.error('Usage: node scripts/blossom-remove-word.js <word> [word2 ...]');
  process.exit(1);
}
const targets = new Set(words);

// Drop every line matching a target case-insensitively — this also strips a
// capitalized SCOWL variant (e.g. "March"/"march"), wanted when pulling a word.
function removeFrom(file, label) {
  if (!fs.existsSync(file)) {
    console.warn(`  ${label}: not found — skipped (it's gitignored / fetched on demand)`);
    return 0;
  }
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  let removed = 0;
  const kept = lines.filter(line => {
    if (targets.has(line.trim().toLowerCase())) {
      removed++;
      return false;
    }
    return true;
  });
  if (removed) fs.writeFileSync(file, kept.join('\n'));
  console.log(`  ${label}: removed ${removed} line(s)`);
  return removed;
}

console.log(`Removing from word banks: ${words.join(', ')}`);
const removed =
  removeFrom(WORD_BANK_PATH, 'word_bank.txt') +
  removeFrom(SCOWL_PATH, 'scowl-60.txt ');

if (removed === 0) {
  console.log('Nothing matched — word lists unchanged, skipping rebuild.');
  process.exit(0);
}

console.log('Rebuilding assets/blossom/words.js …');
execFileSync('node', [BUILD_SCRIPT], { stdio: 'inherit' });
