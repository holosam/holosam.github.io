(function () {
  // Validation list is broad (includes inflections like "began", "runs").
  // Generation list is the uninflected root-word set — cleaner chains and
  // avoids embedding hidden plurals/past-tenses in the solution chain.
  const VALID = new Set(window.BLOSSOM_WORDS);
  const { toRC, isAdjacent, generateBoard, seedForDate, dateKey } =
    window.BlossomGen;

  // Defensive caps — keep the game from getting into absurd states.
  const MAX_WORD_LEN = 15; // longest a single selection can grow
  const BUST_DELTA = 6; // words over par before the game ends in a bust

  // ─── Today's board ─────────────────────────────────────────────────────────
  const TODAY = new Date();
  const TODAY_KEY = dateKey(TODAY);
  // Bump the version when the generator changes so stale state (referencing
  // cells that no longer exist on the new board) is automatically discarded.
  const STORAGE_KEY = "blossom-v2-" + TODAY_KEY;
  const BOARD = generateBoard(seedForDate(TODAY), window.BLOSSOM_GEN_WORDS);

  function loadState() {
    try {
      const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      // Validate `active` points at a real tile — otherwise the selection
      // anchor is broken and the player gets stuck (no clicks register).
      if (
        s &&
        Array.isArray(s.words) &&
        Array.isArray(s.used) &&
        BOARD.tiles.has(s.active)
      ) {
        return s;
      }
    } catch {}
    return {
      words: [], // [{word, cells: [idx,...]}]
      used: [BOARD.start],
      active: BOARD.start,
      done: false,
    };
  }
  let state = loadState();

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }

  // Cross-day records, not date-scoped. bestWords is the lowest word count
  // across any completed game; maxTiles is the most tiles ever covered.
  // Storage version bumped to v2 when the field shape changed.
  const RECORDS_KEY = "blossom-records-v2";
  function loadRecords() {
    try {
      const r = JSON.parse(localStorage.getItem(RECORDS_KEY) || "null");
      if (r && typeof r === "object")
        return { bestWords: null, maxTiles: 0, ...r };
    } catch {}
    return { bestWords: null, maxTiles: 0 };
  }
  let records = loadRecords();
  function saveRecords() {
    try {
      localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
    } catch {}
  }
  function updateRecords(tilesUsed) {
    let changed = false;
    if (tilesUsed > records.maxTiles) {
      records.maxTiles = tilesUsed;
      changed = true;
    }
    if (state.done && tilesUsed >= BOARD.totalTiles) {
      if (
        records.bestWords === null ||
        state.words.length < records.bestWords
      ) {
        records.bestWords = state.words.length;
        changed = true;
      }
    }
    if (changed) saveRecords();
  }
  // Empty string for an exactly-on-target finish — callsites should append
  // a separator only when the label is non-empty.
  function deltaLabel(d) {
    return d < 0 ? `−${-d}` : d > 0 ? `+${d}` : "";
  }

  // ─── DOM scaffolding ───────────────────────────────────────────────────────
  const root = document.getElementById("blossom-game");
  root.innerHTML = `
    <div class="bl-container">
      <div class="bl-header-row">
        <div class="bl-date">Blossom ${TODAY_KEY}</div>
        <div class="bl-header-actions">
          <button class="bl-help bl-icon-btn" id="bl-hint-btn" aria-label="Hint" title="Hint">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M9 18h6"/>
              <path d="M10 22h4"/>
              <path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2V18h6v-1.3c0-.8.4-1.5 1-2A7 7 0 0 0 12 2z"/>
            </svg>
          </button>
          <button class="bl-help bl-icon-btn" id="bl-share" aria-label="Share" title="Share">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M12 3v13"/>
              <path d="M6 9l6-6 6 6"/>
              <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>
            </svg>
          </button>
          <button class="bl-help bl-icon-btn" id="bl-help-btn" aria-label="How to play" title="How to play">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10"/>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="bl-words" id="bl-words"></div>
      <div class="bl-current" id="bl-current">&nbsp;</div>
      <div class="bl-grid-wrap">
        <div class="bl-grid-aspect" id="bl-grid-aspect">
          <svg id="bl-grid" class="bl-grid" xmlns="http://www.w3.org/2000/svg"></svg>
        </div>
      </div>
      <div class="bl-toast" id="bl-toast"></div>
      <div class="bl-buttons">
        <button class="bl-btn" id="bl-restart">Restart</button>
        <button class="bl-btn" id="bl-delete">Delete</button>
        <button class="bl-btn bl-btn--primary" id="bl-enter">Enter</button>
      </div>
      <div class="bl-modal" id="bl-modal" hidden>
        <div class="bl-modal-card">
          <button class="bl-modal-close" id="bl-modal-close" aria-label="Close">×</button>
          <h2>How to play</h2>
          <ol>
            <li>Start at the highlighted tile. Tap adjacent tiles to spell a word, then hit Enter. Each new word begins where the last one ended.</li>
            <li>You can reuse tiles at any time, either within a word or from previous words.</li>
            <li>Use every tile to win. For extra points, try to use ${BOARD.targetWords} (or fewer!) words.</li>
            <li>The Delete button undoes one letter. If you're stuck, tap 💡 for a hint.</li>
          </ol>
        </div>
      </div>
    </div>
  `;

  // ─── SVG hex grid ──────────────────────────────────────────────────────────
  const HEX_SIZE = 34; // tile radius; CSS scales for mobile
  const HEX_W = Math.sqrt(3) * HEX_SIZE;
  const HEX_H = 1.5 * HEX_SIZE;

  function cellXY(i) {
    const [r, c] = toRC(i);
    return { x: c * HEX_W + r * HEX_W * 0.5, y: r * HEX_H };
  }

  function hexPoints(cx, cy) {
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 6 + (Math.PI / 3) * i;
      pts.push(`${cx + HEX_SIZE * Math.cos(a)},${cy + HEX_SIZE * Math.sin(a)}`);
    }
    return pts.join(" ");
  }

  function buildGrid() {
    const svg = document.getElementById("bl-grid");
    const SVG_NS = "http://www.w3.org/2000/svg";

    // Compute bounding box of placed tiles
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const i of BOARD.tiles.keys()) {
      const { x, y } = cellXY(i);
      minX = Math.min(minX, x - HEX_SIZE);
      maxX = Math.max(maxX, x + HEX_SIZE);
      minY = Math.min(minY, y - HEX_SIZE);
      maxY = Math.max(maxY, y + HEX_SIZE);
    }
    const pad = 4;
    const vbX = minX - pad;
    const vbY = minY - pad;
    const vbW = maxX - minX + pad * 2;
    const vbH = maxY - minY + pad * 2;
    svg.setAttribute("viewBox", `${vbX} ${vbY} ${vbW} ${vbH}`);
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    // Hand the wrapper the aspect ratio so CSS can size the grid against
    // both viewport width AND viewport height (see games.css). Animation
    // transforms inside the SVG can overflow without changing the box,
    // because aspect-ratio fixes the box dimensions independently of
    // content.
    const aspect = document.getElementById("bl-grid-aspect");
    aspect.style.setProperty("--bl-aspect", `${vbW / vbH}`);

    // Render top-down so a lifted hex always paints over the row above it.
    // (SVG has no z-index; later siblings paint on top.)
    const sortedTiles = [...BOARD.tiles.entries()].sort(
      ([a], [b]) => toRC(a)[0] - toRC(b)[0],
    );
    for (const [i, letter] of sortedTiles) {
      const { x, y } = cellXY(i);

      const g = document.createElementNS(SVG_NS, "g");
      g.setAttribute("class", "bl-hex");
      g.setAttribute("data-i", i);

      const poly = document.createElementNS(SVG_NS, "polygon");
      poly.setAttribute("points", hexPoints(x, y));

      const text = document.createElementNS(SVG_NS, "text");
      text.setAttribute("x", x);
      text.setAttribute("y", y + 1);
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("dominant-baseline", "central");
      text.textContent = letter.toUpperCase();

      g.appendChild(poly);
      g.appendChild(text);
      svg.appendChild(g);
    }

    svg.addEventListener("click", (e) => {
      let t = e.target;
      if (!t.classList.contains("bl-hex")) t = t.closest(".bl-hex");
      if (!t) return;
      onTileClick(parseInt(t.getAttribute("data-i"), 10));
    });
  }

  // ─── Current selection ─────────────────────────────────────────────────────
  // selection[0] is always state.active (start of in-progress word).
  let selection = [state.active];

  function letterAt(i) {
    return BOARD.tiles.get(i);
  }

  function currentWord() {
    return selection.map(letterAt).join("");
  }

  function onTileClick(i) {
    if (state.done) return;
    if (!BOARD.tiles.has(i)) return;

    // Tapping the most-recently-selected tile = undo it (anchor stays put).
    if (i === selection[selection.length - 1] && selection.length > 1) {
      selection.pop();
      render();
      return;
    }

    if (selection.length >= MAX_WORD_LEN) return;

    // Any tile adjacent to the last selected can be added — including a tile
    // that's already in the current selection (letters can be reused within
    // a word, e.g. spelling LEAVE by walking L→E→A→V→E back over the first E).
    const last = selection[selection.length - 1];
    if (!isAdjacent(last, i)) return;

    selection.push(i);
    render();
  }

  // ─── Rendering ─────────────────────────────────────────────────────────────
  function render() {
    const usedSet = new Set(state.used);
    const selSet = new Set(selection);
    const lastSel = selection[selection.length - 1];
    const anchor = selection[0];

    document.querySelectorAll(".bl-hex").forEach((el) => {
      const i = parseInt(el.getAttribute("data-i"), 10);
      el.classList.remove(
        "bl-used",
        "bl-unused",
        "bl-sel",
        "bl-active",
        "bl-anchor",
        "bl-adj",
      );

      if (selSet.has(i)) {
        el.classList.add("bl-sel");
        if (i === lastSel && selection.length > 1)
          el.classList.add("bl-active");
        if (i === anchor) el.classList.add("bl-anchor");
      } else if (usedSet.has(i)) {
        el.classList.add("bl-used");
      } else {
        el.classList.add("bl-unused");
      }

      // Mark every tile adjacent to the last selected — including ones already
      // in selection — so the player can see what's reachable for re-use.
      if (!state.done && isAdjacent(lastSel, i)) {
        el.classList.add("bl-adj");
      }
    });

    // Current word display
    const cw = document.getElementById("bl-current");
    cw.textContent = currentWord() || " ";

    // Words history
    const wl = document.getElementById("bl-words");
    const used = new Set([BOARD.start]);
    state.words.forEach((w) => w.cells.forEach((c) => used.add(c)));
    const tilesUsed = used.size;
    // Status line — single row, with records folded inline:
    //   "Target: 7 words [(current: 3[, best: 5])] · 13/30 tiles [(best: 13)]"
    // Tile-best is only shown until the first completion; after that, the
    // word-count best lives in the words parens and the tile-best is implied.
    const wordCount = state.words.length;
    const wordsExtras = [
      wordCount > 0 ? `current: ${wordCount}` : "",
      records.bestWords !== null ? `best: ${records.bestWords}` : "",
    ]
      .filter(Boolean)
      .join(", ");
    const wordsPart =
      `Target: ${BOARD.targetWords} words` +
      (wordsExtras ? ` (${wordsExtras})` : "");
    const tilesPart =
      wordCount > 0
        ? `${tilesUsed}/${BOARD.totalTiles} tiles` +
          (records.bestWords === null && records.maxTiles > 0
            ? ` (best: ${records.maxTiles})`
            : "")
        : "";
    const statusTxt = [wordsPart, tilesPart].filter(Boolean).join(" · ");

    wl.innerHTML = `
      <div class="bl-par">${statusTxt}</div>
      <div class="bl-word-chain">
        ${state.words.map((w) => `<span class="bl-word-chip">${w.word.toUpperCase()}</span>`).join('<span class="bl-word-sep">›</span>')}
      </div>
    `;

    // Done banner — distinguish a win from a bust (too many words past target).
    if (state.done) {
      const label = deltaLabel(wordCount - BOARD.targetWords);
      const won = tilesUsed >= BOARD.totalTiles;
      cw.innerHTML = won
        ? `<span class="bl-done-banner">Complete in ${wordCount} words${label ? ` · ${label}` : ""}</span>`
        : `<span class="bl-done-banner">Busted at ${label} · ${tilesUsed}/${BOARD.totalTiles} tiles</span>`;
    }
  }

  // ─── Toast ─────────────────────────────────────────────────────────────────
  let toastTimer;
  function toast(msg, ms = 1600) {
    const el = document.getElementById("bl-toast");
    el.textContent = msg;
    el.classList.add("bl-toast--on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("bl-toast--on"), ms);
  }

  // ─── Submit ────────────────────────────────────────────────────────────────
  function submit() {
    if (state.done) return;
    if (selection.length < 3) {
      toast("Words must be at least 3 letters");
      return;
    }
    const word = currentWord();
    if (!VALID.has(word)) {
      toast(`"${word.toUpperCase()}" not in dictionary`);
      return;
    }

    const cells = selection.slice();
    const wasDone = state.done;
    state.words.push({ word, cells });
    cells.forEach((c) => {
      if (!state.used.includes(c)) state.used.push(c);
    });
    state.active = cells[cells.length - 1];
    selection = [state.active];

    // Done state: either tiles filled (win) or too many words past par (bust).
    const won = state.used.length >= BOARD.totalTiles;
    const busted = state.words.length >= BOARD.targetWords + BUST_DELTA;
    if (won || busted) state.done = true;
    updateRecords(state.used.length);
    save();
    render();
    bloomCells(cells);
    if (!wasDone && won) {
      // Stagger the cascade so the entered word finishes blooming first
      setTimeout(victoryCascade, cells.length * 55 + 200);
    }
  }

  // Flash a bloom animation across each cell of a just-entered word.
  function bloomCells(cells) {
    cells.forEach((c, i) => {
      const el = document.querySelector(`.bl-hex[data-i="${c}"]`);
      if (!el) return;
      setTimeout(() => {
        el.classList.add("bl-bloom");
        el.addEventListener(
          "animationend",
          () => el.classList.remove("bl-bloom"),
          { once: true },
        );
      }, i * 55);
    });
  }

  // Concentric ring bloom from the start tile — never traces a path, so it
  // can't accidentally reveal the generator's intended chain. All tiles in
  // the same ring fire simultaneously; rings fire 130ms apart.
  function victoryCascade() {
    const startP = cellXY(BOARD.start);
    const rings = new Map();
    for (const c of BOARD.tiles.keys()) {
      const p = cellXY(c);
      const d = Math.round(Math.hypot(p.x - startP.x, p.y - startP.y) / HEX_W);
      if (!rings.has(d)) rings.set(d, []);
      rings.get(d).push(c);
    }
    const dists = [...rings.keys()].sort((a, b) => a - b);
    dists.forEach((d, ringIdx) => {
      const delay = ringIdx * 130;
      for (const c of rings.get(d)) {
        const el = document.querySelector(`.bl-hex[data-i="${c}"]`);
        if (!el) continue;
        setTimeout(() => {
          el.classList.add("bl-victory");
          el.addEventListener(
            "animationend",
            () => el.classList.remove("bl-victory"),
            { once: true },
          );
        }, delay);
      }
    });
  }

  // Incremental delete:
  //   • If letters have been added past the anchor, drop the most recent one.
  //   • Otherwise, un-enter the most recently entered word and re-select
  //     all but its last letter, so the player can swap that final letter.
  function deleteLast() {
    if (state.done) return;
    if (selection.length > 1) {
      selection.pop();
      render();
      return;
    }
    if (state.words.length === 0) return;
    const last = state.words.pop();
    // Rebuild `used` from scratch — a cell from the popped word might still
    // be covered by an earlier word, so we can't just subtract.
    state.used = [BOARD.start];
    state.words.forEach((w) =>
      w.cells.forEach((c) => {
        if (!state.used.includes(c)) state.used.push(c);
      }),
    );
    state.active = last.cells[0];
    selection = last.cells.slice(0, -1);
    state.done = false;
    save();
    render();
  }

  // Reveal the next word in the intended chain by *chain position* — i.e. the
  // earliest chain word the player hasn't entered. Deliberately ignores the
  // current active letter: matching by letter would jump to whatever chain
  // word fits where the player happens to stand, which can be a word deep in
  // the chain they can't build toward because they skipped the connectors.
  function findHint() {
    const entered = new Set(state.words.map((w) => w.word));
    for (let i = 0; i < BOARD.chain.length; i++) {
      const w = BOARD.chain[i];
      if (!entered.has(w)) return { word: w, index: i };
    }
    return null;
  }

  function ordinal(n) {
    const v = n % 100;
    if (v >= 11 && v <= 13) return n + "th";
    switch (n % 10) {
      case 1:
        return n + "st";
      case 2:
        return n + "nd";
      case 3:
        return n + "rd";
      default:
        return n + "th";
    }
  }

  function showHint() {
    if (state.done) return;
    const h = findHint();
    if (!h) {
      toast("No hints available");
      return;
    }
    toast(
      `Hint: the ${ordinal(h.index + 1)} target word is ${h.word.toUpperCase()}`,
      3500,
    );
  }

  // Build the shareable score string. Reflects the *current* game state,
  // NOT the player's best for today — so if they restart, the previous
  // attempt is gone from the share. Always shows a target-slot bouquet:
  //   🌸 = a word entered  (counts up to target)
  //   ⚪ = a target slot still open  (mid-game or bust — replaced by 🏆 on a win)
  //   🏆 = beat target by this many words  (under-target win — the rare brag)
  //   🥀 = a word past target  (overshoot)
  // Non-winning states append the tile fraction so the receiver can tell
  // whether you actually finished the board.
  function shareText() {
    const tilesUsed = new Set([
      BOARD.start,
      ...state.words.flatMap((w) => w.cells),
    ]).size;
    const won = state.done && tilesUsed >= BOARD.totalTiles;
    const used = state.words.length;
    const target = BOARD.targetWords;
    const label = deltaLabel(used - target);
    const blooms = Math.min(used, target);
    const filler = Math.max(0, target - used);
    const wilts = Math.max(0, used - target);
    const fillerChar = won ? "🏆" : "⚪";
    const bouquet =
      "🌸".repeat(blooms) + fillerChar.repeat(filler) + "🥀".repeat(wilts);
    let line;
    if (won) {
      // Trophies, an exact match, and over-target wilts speak for themselves;
      // append the label only when there's actually something to label.
      line = label ? `${bouquet} ${label}` : bouquet;
    } else {
      line = `${bouquet} ${tilesUsed}/${BOARD.totalTiles} tiles`;
    }
    return `Blossom ${TODAY_KEY}\n${line}`;
  }

  function share() {
    navigator.clipboard
      .writeText(shareText())
      .then(() => toast("Copied to clipboard"))
      .catch(() => toast("Couldn't copy — try again"));
  }

  function restart() {
    state = {
      words: [],
      used: [BOARD.start],
      active: BOARD.start,
      done: false,
    };
    selection = [state.active];
    save();
    render();
  }

  // ─── Wire up ───────────────────────────────────────────────────────────────
  buildGrid();
  render();

  document.getElementById("bl-enter").addEventListener("click", submit);
  document.getElementById("bl-delete").addEventListener("click", deleteLast);
  document.getElementById("bl-restart").addEventListener("click", restart);
  document.getElementById("bl-share").addEventListener("click", share);
  document.getElementById("bl-hint-btn").addEventListener("click", showHint);

  const modal = document.getElementById("bl-modal");
  document
    .getElementById("bl-help-btn")
    .addEventListener("click", () => (modal.hidden = false));
  document
    .getElementById("bl-modal-close")
    .addEventListener("click", () => (modal.hidden = true));
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.hidden = true;
  });

  // TODAY_KEY and BOARD are captured at module load. If a tab is left open
  // across midnight, the player would see yesterday's board with whatever
  // in-memory selection they had — reload when the date rolls over.
  function refreshIfStale() {
    if (dateKey(new Date()) !== TODAY_KEY) location.reload();
  }
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) refreshIfStale();
  });
  window.addEventListener("pageshow", refreshIfStale);
})();
