#!/usr/bin/env node
// Print today's Blossom board + the generator's intended word chain.
// Uses the same generator as the browser so output matches the live game.
//
// Usage:
//   node scripts/blossom-solve.js              # today
//   node scripts/blossom-solve.js 2026-12-25   # specific date
const fs = require('fs');
const path = require('path');

// The words file uses `window.X = ...` in the browser; stub it for Node.
global.window = {};
eval(fs.readFileSync(path.join(__dirname, '../static/js/blossom-words.js'), 'utf8'));

const Gen = require('../static/js/blossom-gen.js');

const arg = process.argv[2];
const date = arg
  ? new Date(arg + 'T00:00:00')
  : new Date();
if (isNaN(date)) {
  console.error(`Bad date: ${arg}. Use YYYY-MM-DD.`);
  process.exit(1);
}

const board = Gen.generateBoard(Gen.seedForDate(date), window.BLOSSOM_GEN_WORDS);

console.log(`Blossom ${Gen.dateKey(date)}`);
console.log(`  par:    ${board.par} words`);
console.log(`  target: ${board.target} tiles`);
console.log(`  chain:  ${board.chain.join(' → ').toUpperCase()}`);
console.log();

// ASCII grid (rows offset by half-cell each to mimic the hex offset)
let minR = Infinity, minC = Infinity, maxR = -Infinity, maxC = -Infinity;
for (const i of board.tiles.keys()) {
  const [r, c] = Gen.toRC(i);
  if (r < minR) minR = r;
  if (r > maxR) maxR = r;
  if (c < minC) minC = c;
  if (c > maxC) maxC = c;
}
const startRC = Gen.toRC(board.start);
for (let r = minR; r <= maxR; r++) {
  let line = ' '.repeat((r - minR) * 2);
  for (let c = minC; c <= maxC; c++) {
    const i = Gen.idx(r, c);
    const l = board.tiles.get(i);
    if (!l) {
      line += '·   ';
    } else if (r === startRC[0] && c === startRC[1]) {
      line += `[${l.toUpperCase()}]`;
    } else {
      line += ` ${l.toUpperCase()}  `;
    }
  }
  console.log(line.replace(/\s+$/, ''));
}
console.log();
console.log('[X] = starting tile');
