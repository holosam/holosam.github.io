#!/usr/bin/env node
// Simulate many future Blossom boards and summarize their shape, so we can
// eyeball whether the generator is striking the right balance (word-count
// spread, length mix, board size). Uses the live generator, so output matches
// what players will actually see.
//
// Usage:
//   node scripts/blossom-sim.js                 # next 365 days from today
//   node scripts/blossom-sim.js 90              # next 90 days
//   node scripts/blossom-sim.js 365 --show 5    # also print 5 sample boards
//   node scripts/blossom-sim.js 365 --alpha 0.3 # override lengthAlpha to test
const fs = require('fs');
const path = require('path');

global.window = {};
eval(fs.readFileSync(path.join(__dirname, '../assets/js/blossom-words.js'), 'utf8'));
const Gen = require('../assets/js/blossom-gen.js');
const WORDS = window.BLOSSOM_GEN_WORDS;

const args = process.argv.slice(2);
const days = parseInt(args.find(a => /^\d+$/.test(a)) || '365', 10);
const showIdx = args.indexOf('--show');
const show = showIdx >= 0 ? parseInt(args[showIdx + 1], 10) : 0;
// Optional generator overrides, so we can A/B difficulty/overlap tuning without
// editing blossom-gen.js. Any omitted flag falls back to the generator default.
const flag = (name, parse) => {
  const i = args.indexOf(name);
  return i >= 0 ? parse(args[i + 1]) : undefined;
};
const opts = {};
const setIf = (k, v) => { if (v !== undefined && !Number.isNaN(v)) opts[k] = v; };
setIf('lengthAlpha', flag('--alpha', parseFloat));
setIf('targetTiles', flag('--tiles', s => parseInt(s, 10)));
setIf('localRadius', flag('--radius', s => parseInt(s, 10)));
setIf('overlapDecay', flag('--decay', parseFloat));

function bar(n, max, width = 40) {
  return '█'.repeat(Math.round((n / max) * width));
}

function histogram(title, counts) {
  const keys = Object.keys(counts).map(Number).sort((a, b) => a - b);
  const max = Math.max(...keys.map(k => counts[k]));
  console.log(`\n${title}`);
  for (const k of keys) {
    const n = counts[k];
    const pct = ((n / total) * 100).toFixed(1).padStart(5);
    console.log(`  ${String(k).padStart(2)} │ ${bar(n, max)} ${n} (${pct}%)`);
  }
}

const today = new Date();
const wordCounts = {};   // chain length -> # boards
const tileCounts = {};   // tile count -> # boards
const lengthCounts = {}; // word length -> # words (across all boards)
const reuseCounts = {};  // extra tile reuses (beyond chain joints) -> # boards
let total = 0;
let totalTiles = 0;
let totalWords = 0;
let totalLetters = 0;     // sum of all word lengths, across all boards
let totalReuse = 0;       // extra tile reuses, across all boards
let boardsWithDouble = 0;
const distinctLengths = {}; // # distinct word-lengths in a board -> # boards
const samples = [];

for (let i = 0; i < days; i++) {
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
  const b = Gen.generateBoard(Gen.seedForDate(d), WORDS, opts);
  total++;
  wordCounts[b.targetWords] = (wordCounts[b.targetWords] || 0) + 1;
  tileCounts[b.totalTiles] = (tileCounts[b.totalTiles] || 0) + 1;
  totalTiles += b.totalTiles;
  totalWords += b.chain.length;
  let hasDouble = false;
  const seen = new Set();
  let letters = 0;
  for (const w of b.chain) {
    lengthCounts[w.length] = (lengthCounts[w.length] || 0) + 1;
    seen.add(w.length);
    letters += w.length;
    if (/(.)\1/.test(w)) hasDouble = true;
  }
  // Tiles a word reused mid-chain beyond the mandatory shared joint between
  // consecutive words. This is the overlap the weighting is trying to grow:
  // higher = a more interleaved, compact blossom; ~0 = words wrapping the
  // outside on fresh tiles.
  const joints = b.chain.length - 1;
  const extraReuse = letters - joints - b.totalTiles;
  reuseCounts[extraReuse] = (reuseCounts[extraReuse] || 0) + 1;
  totalLetters += letters;
  totalReuse += extraReuse;
  if (hasDouble) boardsWithDouble++;
  distinctLengths[seen.size] = (distinctLengths[seen.size] || 0) + 1;
  if (i < show) samples.push({ key: Gen.dateKey(d), b });
}

console.log(`Blossom simulation — ${total} boards (lengthAlpha=${opts.lengthAlpha ?? 'default'})`);
console.log(`  avg tiles: ${(totalTiles / total).toFixed(1)}`);
console.log(`  avg words: ${(totalWords / total).toFixed(2)}`);
console.log(`  avg letters/tile: ${(totalLetters / totalTiles).toFixed(2)} (higher = more overlap)`);
console.log(`  avg extra reuse/board: ${(totalReuse / total).toFixed(2)} (tiles reused beyond chain joints)`);
console.log(`  boards with a double-letter word: ${boardsWithDouble} (${(boardsWithDouble / total * 100).toFixed(1)}%)`);

histogram('Words per board (par):', wordCounts);
histogram('Tiles per board:', tileCounts);
histogram('Extra tile reuse per board (overlap):', reuseCounts);
histogram('Word-length distribution (all words):', lengthCounts);
histogram('Distinct word-lengths per board (variety):', distinctLengths);

for (const { key, b } of samples) {
  console.log(`\n── ${key} · par ${b.targetWords} · ${b.totalTiles} tiles`);
  console.log(`   ${b.chain.join(' → ').toUpperCase()}`);
}
