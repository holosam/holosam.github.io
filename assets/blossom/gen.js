// Shared board generator: works in both browser (sets window.BlossomGen)
// and Node (exports via module.exports), so the daily board logic is
// reusable by the CLI solver in scripts/blossom-solve.js.
(function (root) {
  function mulberry32(seed) {
    return function () {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = seed;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function dateKey(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
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
  const toRC = (i) => [Math.floor(i / GRID), i % GRID];

  function neighbors(i) {
    const [r, c] = toRC(i);
    return [
      [r, c - 1],
      [r, c + 1],
      [r - 1, c],
      [r - 1, c + 1],
      [r + 1, c - 1],
      [r + 1, c],
    ]
      .filter(([rr, cc]) => rr >= 0 && rr < GRID && cc >= 0 && cc < GRID)
      .map(([rr, cc]) => idx(rr, cc));
  }

  function isAdjacent(a, b) {
    return neighbors(a).includes(b);
  }

  // Manhattan-style distance on this offset hex grid, used as a placement
  // tiebreaker to keep the blossom hugging the center.
  // https://stackoverflow.com/questions/5084801
  function hexDistance(a, b) {
    const [ar, ac] = toRC(a);
    const [br, bc] = toRC(b);
    const dr = br - ar;
    const dc = bc - ac;
    return (dr < 0 && dc < 0) || (dr >= 0 && dc >= 0)
      ? Math.abs(dr + dc)
      : Math.max(Math.abs(dr), Math.abs(dc));
  }

  // Order `items` by weighted sampling without replacement: higher-weight
  // items tend toward the front, but it stays random per the rng. Used so the
  // builder can try its preferred word first and fall back through the rest in
  // a sensible order if placement dead-ends.
  function weightedShuffle(items, weights, rng) {
    const pool = items.map((it, i) => ({ it, w: weights[i] }));
    let total = pool.reduce((s, x) => s + x.w, 0);
    const out = [];
    while (pool.length) {
      let r = rng() * total;
      let k = 0;
      for (; k < pool.length - 1; k++) {
        r -= pool[k].w;
        if (r <= 0) break;
      }
      out.push(pool[k].it);
      total -= pool[k].w;
      pool.splice(k, 1);
    }
    return out;
  }

  function generateBoard(seed, genPool, options) {
    const opts = options || {};
    const targetTiles = opts.targetTiles || 21;
    const minTiles = opts.minTiles || 15;
    const maxWords = opts.maxWords || 8;
    // Mild bias toward word lengths not yet used in this board. Each prior use
    // of a length multiplies that length's weight by (1+alpha)^-count, so the
    // first 5-letter word nudges later picks toward other lengths — enough to
    // sway the mix, not enough to override the overlap weighting. Tunable.
    const lengthAlpha = opts.lengthAlpha != null ? opts.lengthAlpha : 0.6;
    // Intrinsic per-length preference, applied on top of lengthAlpha. Lengths
    // absent from the map default to 1. The short (3) and long (8) extremes are
    // damped so they sprinkle in for variety without dominating the mix.
    const lengthWeight = opts.lengthWeight || { 3: 0.4, 8: 0.4 };
    // Localized-overlap weighting. When picking the next word, we reward letters
    // that can reuse a tile already sitting near the junction (the last placed
    // cell) — and reward the word's *earliest* letters most, since those are the
    // ones the greedy placer can actually fold back onto an existing tile. This
    // counters the old whole-board overlap signal, which saturated late in
    // generation and let the final words wrap the rim on fresh tiles.
    const localRadius = opts.localRadius != null ? opts.localRadius : 2;
    const overlapDecay = opts.overlapDecay != null ? opts.overlapDecay : 0.8;
    const targetLetters = targetTiles * 1.5;
    // Runaway guard: cap total word-placement attempts across all backtracking
    // before giving up and reseeding. Normal generation never approaches this.
    let budget = opts.budget || 20000;

    const genByFirst = {};
    for (const w of genPool) (genByFirst[w[0]] ||= []).push(w);

    // Per-letter correction factors: up-weight candidates ending on letters
    // that are common chain-starters in the pool, down-weight those ending on
    // letters that are rare starters. Applied to the next-word weight so the
    // Markov chain's stationary distribution tracks the pool's first-letter
    // distribution instead of its last-letter distribution.
    const poolFirstCount = {};
    const poolLastCount = {};
    for (const w of genPool) {
      poolFirstCount[w[0]] = (poolFirstCount[w[0]] || 0) + 1;
      poolLastCount[w[w.length - 1]] = (poolLastCount[w[w.length - 1]] || 0) + 1;
    }
    const corrFactor = {};
    for (const l in poolLastCount) {
      corrFactor[l] =
        ((poolFirstCount[l] || 0) + 1e-9) / (poolLastCount[l] + 1e-9);
    }

    // The rng is threaded continuously through every decision below — seed
    // word, each subsequent word, and every tile placement all draw from this
    // one stream. That's why two different dates never produce the same board
    // even when they happen to pick the same first word: the streams diverge
    // on the very next draw. The board is byte-identical only for an identical
    // seed (i.e. the same date). Keep it that way — never key a decision off
    // word identity via a lookup; always pull from this rng.
    const rng = mulberry32(seed);
    const start = idx(Math.floor(GRID / 2), Math.floor(GRID / 2));

    function shuffle(arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }

    // Place `letter` adjacent to prevCell (or at center if prevCell is null).
    // Reuse an adjacent tile already holding it; otherwise take the empty
    // neighbor most surrounded by filled tiles, breaking ties toward the
    // center to keep the blossom compact. Returns the cell, or null if boxed
    // in (no empty neighbor) — the caller's signal to backtrack.
    function placeLetter(tiles, letter, prevCell) {
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
      let bestDist = Infinity;
      for (const n of nbrs) {
        if (tiles.has(n)) continue;
        const filledNeighbors = neighbors(n).filter((x) => tiles.has(x)).length;
        const dist = hexDistance(n, start);
        if (
          filledNeighbors > bestScore ||
          (filledNeighbors === bestScore && dist < bestDist)
        ) {
          bestScore = filledNeighbors;
          bestDist = dist;
          best = n;
        }
      }
      if (best < 0) return null;
      tiles.set(best, letter);
      return best;
    }

    // Mutable build state, reset per seed-word attempt below.
    let tiles, seq, chain, used, lengthCounts, allLetters;

    // Lay `word` onto the board. The first letter is the shared tile (already
    // placed by the previous word, or the center for the first word), so
    // letters are placed from index 1. Returns the cells newly added (for
    // rollback) and whether placement succeeded.
    function placeWord(word, isFirst) {
      const added = [];
      let prev;
      if (isFirst) {
        const c = placeLetter(tiles, word[0], null);
        added.push(c);
        seq.push({ wordIdx: chain.length, letterIdx: 0, cellIdx: c });
        prev = c;
      } else {
        prev = seq[seq.length - 1].cellIdx;
      }
      for (let li = 1; li < word.length; li++) {
        const before = tiles.size;
        const c = placeLetter(tiles, word[li], prev);
        if (c === null) return { ok: false, added };
        if (tiles.size > before) added.push(c);
        seq.push({ wordIdx: chain.length, letterIdx: li, cellIdx: c });
        prev = c;
      }
      return { ok: true, added };
    }

    // Recursively append words to the chain, backtracking on dead-ends.
    // Returns true once a placed chain meets the size/word targets.
    function extend() {
      if (allLetters.length >= targetLetters || chain.length >= maxWords) {
        return tiles.size >= minTiles;
      }
      const last = chain[chain.length - 1].slice(-1);
      const candidates = (genByFirst[last] || []).filter((w) => !used.has(w));
      if (!candidates.length) return tiles.size >= minTiles;

      // Simulate the greedy placer's path from the junction, assuming no tile
      // reuse occurs (i.e. each step lands on a fresh empty cell). placeLetter
      // always picks the empty neighbour with the most filled neighbours, ties
      // broken by proximity to center — we run that same deterministic rule to
      // predict where the placer would be at each word position li. The letters
      // on actual board tiles adjacent to predictedPath[li-1] are then exactly
      // the set the placer CAN reuse at step li.
      //
      // This replaces the old hex-distance localSet approach, which credited
      // letters on tiles the placer couldn't actually reach at that position,
      // causing larger localRadius values to counterintuitively reduce overlap.
      const junction = seq[seq.length - 1].cellIdx;
      const predictedPath = [junction];
      const predOccupied = new Set(tiles.keys());
      for (let li = 1; li <= localRadius; li++) {
        const prev = predictedPath[li - 1];
        let best = -1, bestFilled = -1, bestDist = Infinity;
        for (const n of neighbors(prev)) {
          if (predOccupied.has(n)) continue;
          const filled = neighbors(n).filter(x => predOccupied.has(x)).length;
          const dist = hexDistance(n, start);
          if (filled > bestFilled || (filled === bestFilled && dist < bestDist)) {
            bestFilled = filled; bestDist = dist; best = n;
          }
        }
        if (best < 0) break;
        predictedPath.push(best);
        predOccupied.add(best);
      }
      // localReachable[li-1] = letters on board tiles adjacent to the predicted
      // cell at step li-1, i.e. the letters reusable by the placer at position li.
      const localReachable = [];
      for (let li = 1; li < predictedPath.length; li++) {
        const reachable = new Set();
        for (const n of neighbors(predictedPath[li - 1])) {
          if (tiles.has(n)) reachable.add(tiles.get(n));
        }
        localReachable.push(reachable);
      }
      const weights = candidates.map((w) => {
        let local = 0;
        for (let li = 1; li < w.length; li++) {
          const reachable = localReachable[li - 1];
          if (reachable && reachable.has(w[li])) local += Math.pow(overlapDecay, li - 1);
        }
        const lengthBonus = Math.pow(
          1 + lengthAlpha,
          -(lengthCounts[w.length] || 0),
        );
        const lw = lengthWeight[w.length] != null ? lengthWeight[w.length] : 1;
        return (local * local + 0.5) * lengthBonus * lw * (corrFactor[w[w.length - 1]] || 1);
      });
      const ordered = weightedShuffle(candidates, weights, rng);

      for (const w of ordered) {
        if (budget <= 0) return false;
        budget--;
        const seqLen = seq.length;
        const res = placeWord(w, false);
        if (res.ok) {
          chain.push(w);
          used.add(w);
          allLetters += w;
          lengthCounts[w.length] = (lengthCounts[w.length] || 0) + 1;
          if (extend()) return true;
          lengthCounts[w.length]--;
          allLetters = allLetters.slice(0, -w.length);
          used.delete(w);
          chain.pop();
        }
        for (const c of res.added) tiles.delete(c);
        seq.length = seqLen;
      }
      return false;
    }

    // Try seed words in a random order, backtracking through the search until
    // one yields a complete board. (A whole-board restart is now rare — most
    // dead-ends are recovered by trying the next word, not the next seed.)
    for (const seedWord of shuffle(genPool)) {
      if (budget <= 0) break;
      tiles = new Map();
      seq = [];
      chain = [];
      used = new Set();
      lengthCounts = {};
      allLetters = "";

      const res = placeWord(seedWord, true);
      if (!res.ok) continue;
      chain.push(seedWord);
      used.add(seedWord);
      allLetters = seedWord;
      lengthCounts[seedWord.length] = 1;

      if (extend()) {
        return {
          chain: chain.slice(),
          tiles: new Map(tiles),
          seq: seq.slice(),
          start,
          targetWords: chain.length, // ideal # of words to complete
          totalTiles: tiles.size, // # of tiles on the board
        };
      }
    }

    // Exhausted the pool (or the attempt budget) without a board — reseed.
    return generateBoard((seed + 1) >>> 0, genPool, options);
  }

  const api = {
    mulberry32,
    seedForDate,
    dateKey,
    GRID,
    idx,
    toRC,
    neighbors,
    isAdjacent,
    hexDistance,
    generateBoard,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.BlossomGen = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
