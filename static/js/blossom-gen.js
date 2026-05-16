// Shared board generator: works in both browser (sets window.BlossomGen)
// and Node (exports via module.exports), so the daily board logic is
// reusable by the CLI solver in scripts/blossom-solve.js.
(function (root) {
  function mulberry32(seed) {
    return function () {
      seed = (seed + 0x6D2B79F5) | 0;
      let t = seed;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function dateKey(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function seedForDate(d) {
    const epoch = new Date(2026, 0, 1);
    const local = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const day = Math.floor((local - epoch) / 86400000);
    let h = (day + 0x9e3779b9) >>> 0;
    h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    h ^= h >>> 16;
    return h >>> 0;
  }

  // Offset coords on a notional 12x12 grid. Adjacency: same row ±1, row±1
  // with a col shift that keeps pointy-top hexes aligned.
  const GRID = 12;
  const idx = (r, c) => r * GRID + c;
  const toRC = i => [Math.floor(i / GRID), i % GRID];

  function neighbors(i) {
    const [r, c] = toRC(i);
    return [
      [r, c - 1], [r, c + 1],
      [r - 1, c], [r - 1, c + 1],
      [r + 1, c - 1], [r + 1, c],
    ]
      .filter(([rr, cc]) => rr >= 0 && rr < GRID && cc >= 0 && cc < GRID)
      .map(([rr, cc]) => idx(rr, cc));
  }

  function isAdjacent(a, b) {
    return neighbors(a).includes(b);
  }

  function pickChain(rng, genPool, genByFirst, targetTiles) {
    const seed = genPool[Math.floor(rng() * genPool.length)];
    const chain = [seed];
    const used = new Set([seed]);
    let allLetters = seed;

    while (allLetters.length < targetTiles * 1.5 && chain.length < 8) {
      const last = chain[chain.length - 1].slice(-1);
      const candidates = (genByFirst[last] || []).filter(w => !used.has(w));
      if (!candidates.length) break;

      const prevSet = new Set(allLetters);
      const scored = candidates.map(w => {
        const overlap = [...new Set(w)].filter(l => prevSet.has(l)).length;
        return { w, weight: overlap * overlap + 0.5 };
      });
      const total = scored.reduce((s, x) => s + x.weight, 0);
      let r = rng() * total;
      let chosen = scored[0].w;
      for (const s of scored) {
        r -= s.weight;
        if (r <= 0) { chosen = s.w; break; }
      }
      chain.push(chosen);
      used.add(chosen);
      allLetters += chosen;
    }
    return chain;
  }

  function placeChain(chain, rng) {
    const tiles = new Map();
    const start = idx(Math.floor(GRID / 2), Math.floor(GRID / 2));
    const seq = [];

    function shuffle(arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }

    function placeLetter(letter, prevCell) {
      if (prevCell === null) {
        tiles.set(start, letter);
        return start;
      }
      const nbrs = shuffle(neighbors(prevCell));
      for (const n of nbrs) {
        if (tiles.get(n) === letter) return n;
      }
      let best = -1;
      let bestScore = -1;
      for (const n of nbrs) {
        if (tiles.has(n)) continue;
        const filled = neighbors(n).filter(x => tiles.has(x)).length;
        if (filled > bestScore) { bestScore = filled; best = n; }
      }
      if (best < 0) return null;
      tiles.set(best, letter);
      return best;
    }

    for (let wi = 0; wi < chain.length; wi++) {
      const word = chain[wi];
      // The first letter of every word is already placed — either by this
      // block (for wi=0) or by the previous word's final letter. So we
      // always start the per-letter loop at index 1.
      if (wi === 0) {
        const c = placeLetter(word[0], null);
        seq.push({ wordIdx: 0, letterIdx: 0, cellIdx: c });
      }
      let prev = seq[seq.length - 1].cellIdx;
      for (let li = 1; li < word.length; li++) {
        const c = placeLetter(word[li], prev);
        if (c === null) return null;
        seq.push({ wordIdx: wi, letterIdx: li, cellIdx: c });
        prev = c;
      }
    }
    return { tiles, seq, start };
  }

  function generateBoard(seed, genPool, options) {
    const opts = options || {};
    const targetTiles = opts.targetTiles || 22;
    const minTiles = opts.minTiles || 14;
    const genByFirst = {};
    for (const w of genPool) (genByFirst[w[0]] ||= []).push(w);

    const rng = mulberry32(seed);
    for (let attempt = 0; attempt < 30; attempt++) {
      const chain = pickChain(rng, genPool, genByFirst, targetTiles);
      const placed = placeChain(chain, rng);
      if (!placed || placed.tiles.size < minTiles) continue;
      return {
        chain,
        tiles: placed.tiles,
        seq: placed.seq,
        start: placed.start,
        targetWords: chain.length,        // ideal # of words to complete
        totalTiles: placed.tiles.size,    // # of tiles on the board
      };
    }
    return generateBoard((seed + 1) >>> 0, genPool, options);
  }

  const api = {
    mulberry32, seedForDate, dateKey,
    GRID, idx, toRC, neighbors, isAdjacent,
    generateBoard,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.BlossomGen = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
