(function () {
  const VALID = new Set(window.BLOSSOM_WORDS);
  const { toRC, isAdjacent, generateBoard, seedForDate, dateKey } =
    window.BlossomGen;

  // Defensive caps — keep the game from getting into absurd states.
  const MAX_WORD_LEN = 12; // longest word in the dictionary
  const WORD_CAP_OVER_TARGET = 25;

  const TODAY = new Date();
  const TODAY_KEY = dateKey(TODAY);
  // Bump the version when the generator changes so stale state (referencing
  // cells that no longer exist on the new board) is automatically discarded.
  const STORAGE_KEY = "blossom-v2-" + TODAY_KEY;
  const BOARD = generateBoard(seedForDate(TODAY), window.BLOSSOM_GEN_WORDS);
  // The daily hint: a longest word in the chain. It never changes, so it's
  // effectively one hint per day.
  const LONGEST_WORD = BOARD.chain.reduce(
    (a, b) => (b.length > a.length ? b : a),
    "",
  );

  // Hide today's solution from a casual console peek (not a real lock — the
  // source still ships and can be re-run).
  try {
    delete window.BlossomGen;
    delete window.BLOSSOM_WORDS;
    delete window.BLOSSOM_GEN_WORDS;
  } catch {}

  // Sweep stale per-day state keys so storage doesn't grow a key per day forever.
  function pruneOldDays() {
    try {
      // Iterate backwards — removeItem reindexes the remaining keys.
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.startsWith("blossom-v2-") && k !== STORAGE_KEY) {
          localStorage.removeItem(k);
        }
      }
    } catch {}
  }
  pruneOldDays();

  function freshState() {
    return {
      words: [], // [{word, cells: [idx,...]}]
      used: [BOARD.start],
      active: BOARD.start,
      done: false,
      // Today's bests, scoped to this board: fewest words to a win, most tiles
      // covered. Survive a Restart (to measure a redo) but reset each new board.
      bestWords: null,
      maxTiles: 0,
    };
  }

  // Rebuild and verify a saved state against TODAY's board. The word list is
  // the source of truth; `used`/`active`/`done` are recomputed, not trusted.
  // Any inconsistency (stale board, hand-edited or spoofed save) starts fresh.
  function validateState(s) {
    if (!s || !Array.isArray(s.words)) return null;
    const used = [BOARD.start];
    let anchor = BOARD.start; // where the next word must begin
    for (const w of s.words) {
      if (!w || typeof w.word !== "string" || !Array.isArray(w.cells))
        return null;
      const cells = w.cells;
      if (cells.length < 3 || cells.length > MAX_WORD_LEN) return null;
      // Each word continues the chain from the previous word's last tile.
      if (cells[0] !== anchor) return null;
      for (let k = 0; k < cells.length; k++) {
        if (!BOARD.tiles.has(cells[k])) return null;
        if (k > 0 && !isAdjacent(cells[k - 1], cells[k])) return null;
      }
      if (cells.map(letterAt).join("") !== w.word) return null;
      if (!VALID.has(w.word)) return null;
      cells.forEach((c) => {
        if (!used.includes(c)) used.push(c);
      });
      anchor = cells[cells.length - 1];
    }
    // Carry today's bests through the reload, lightly sanity-checked.
    const bestWords =
      typeof s.bestWords === "number" && s.bestWords > 0 ? s.bestWords : null;
    const maxTiles =
      typeof s.maxTiles === "number" && s.maxTiles > 0
        ? Math.min(s.maxTiles, BOARD.totalTiles)
        : 0;
    return {
      words: s.words,
      used,
      active: anchor,
      done: used.length >= BOARD.totalTiles,
      bestWords,
      maxTiles,
    };
  }

  function loadState() {
    try {
      const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      const valid = validateState(s);
      if (valid) return valid;
    } catch {}
    return freshState();
  }
  let state = loadState();

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }

  // Cross-day records, not date-scoped. Only the win streak lives here now —
  // the word/tile bests are per-board and live in the daily `state`.
  const RECORDS_KEY = "blossom-records-v2";
  function loadRecords() {
    const defaults = {
      streak: 0,
      lastWinKey: null,
    };
    try {
      const r = JSON.parse(localStorage.getItem(RECORDS_KEY) || "null");
      if (r && typeof r === "object") return { ...defaults, ...r };
    } catch {}
    return { ...defaults };
  }
  // The date key for the day before `key` (YYYY-MM-DD), for streak continuity.
  function prevDateKey(key) {
    const [y, m, d] = key.split("-").map(Number);
    return dateKey(new Date(y, m - 1, d - 1));
  }
  let records = loadRecords();
  function saveRecords() {
    try {
      localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
    } catch {}
  }
  function updateRecords(tilesUsed) {
    // Today's bests live in `state`; the caller's save() persists them.
    if (tilesUsed > state.maxTiles) state.maxTiles = tilesUsed;
    if (state.done && tilesUsed >= BOARD.totalTiles) {
      if (state.bestWords === null || state.words.length < state.bestWords) {
        state.bestWords = state.words.length;
      }
      // Win streak: extend if yesterday was also a win, else start fresh.
      // Guard on lastWinKey so re-winning the same day can't double-count.
      if (records.lastWinKey !== TODAY_KEY) {
        records.streak =
          records.lastWinKey === prevDateKey(TODAY_KEY)
            ? records.streak + 1
            : 1;
        records.lastWinKey = TODAY_KEY;
        saveRecords();
      }
    }
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
      <div class="bl-current" id="bl-current" aria-live="polite" aria-atomic="true">&nbsp;</div>
      <div class="bl-grid-wrap">
        <div class="bl-grid-aspect" id="bl-grid-aspect">
          <svg id="bl-grid" class="bl-grid" xmlns="http://www.w3.org/2000/svg"></svg>
        </div>
      </div>
      <div class="bl-toast" id="bl-toast" role="status" aria-live="polite" aria-atomic="true"></div>
      <div class="bl-buttons">
        <button class="bl-btn" id="bl-delete">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M20 5H9l-6 7 6 7h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z"/>
            <line x1="18" y1="9.5" x2="12.5" y2="14.5"/>
            <line x1="12.5" y1="9.5" x2="18" y2="14.5"/>
          </svg>
          Delete
        </button>
        <button class="bl-btn" id="bl-restart">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="1 4 1 10 7 10"/>
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
          </svg>
          Restart
        </button>
        <button class="bl-btn bl-btn--primary" id="bl-enter">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="9 10 4 15 9 20"/>
            <path d="M20 4v7a4 4 0 0 1-4 4H4"/>
          </svg>
          Enter
        </button>
      </div>
      <div class="bl-modal" id="bl-modal" hidden>
        <div class="bl-modal-card" role="dialog" aria-modal="true" aria-labelledby="bl-modal-title">
          <button class="bl-modal-close" id="bl-modal-close" aria-label="Close">×</button>
          <h2 id="bl-modal-title">How to play</h2>
          <ol>
            <li>Start at the highlighted tile. Tap adjacent tiles to spell a word, then hit Enter. Each new word begins where the last one ended.</li>
            <li>Previously used tiles can be reused both within a word and across words.</li>
            <li>Keep linking words until every tile is used. Try to use as few words as possible.</li>
            <li>The Delete button undoes one letter. If you're stuck, tap 💡 for a hint.</li>
          </ol>
          <p class="bl-modal-foot">The board resets at midnight, so come back tomorrow to play a new one!</p>
          <p class="bl-modal-foot"><a href="/posts/blossom/">Read the story behind Blossom</a>.</p>
        </div>
      </div>
      <div class="bl-modal" id="bl-confirm" hidden>
        <div class="bl-modal-card" role="dialog" aria-modal="true" aria-labelledby="bl-confirm-title">
          <p id="bl-confirm-title">Are you sure you want to restart?</p>
          <label class="bl-confirm-check">
            <input type="checkbox" id="bl-confirm-skip" />
            Don't ask again
          </label>
          <div class="bl-confirm-actions">
            <button class="bl-btn" id="bl-confirm-cancel">Cancel</button>
            <button class="bl-btn bl-btn--primary" id="bl-confirm-ok">Restart</button>
          </div>
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
    // Give the wrapper the aspect ratio so CSS can size the grid against both
    // viewport width and height; aspect-ratio fixes the box, so animation
    // transforms can overflow without resizing it (see games.css).
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
      // Each tile is an operable button for assistive tech. tabindex starts at
      // -1; render() promotes the current entry tile to 0 (roving tabindex) so
      // Tab enters the grid at one stop, not 21.
      g.setAttribute("role", "button");
      g.setAttribute("tabindex", "-1");

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
      // Per-element listeners rather than one delegated handler on the SVG:
      // reading the focused tile back off document.activeElement is unreliable
      // for SVG nodes across browsers, so bind directly and close over `i`.
      g.addEventListener("click", () => onTileClick(i));
      g.addEventListener("keydown", (e) => onTileKey(e, i));
      svg.appendChild(g);
    }
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

    // Any tile adjacent to the last selected can be added — including one
    // already in the selection, since letters can be reused within a word
    // (e.g. LEAVE walks back over the first E).
    const last = selection[selection.length - 1];
    if (!isAdjacent(last, i)) return;

    selection.push(i);
    render();
  }

  // ─── Keyboard navigation ─────────────────────────────────────────────────
  // Arrow keys move focus to the nearest tile in that direction; Enter/Space
  // activate the focused tile. (SVG groups, unlike real <button>s, don't fire a
  // click on Enter/Space, so it's wired explicitly.) Focus only follows a
  // change, so a rejected (non-adjacent) Enter leaves the cursor put instead of
  // yanking it to the active tile.
  const ARROW_DIRS = {
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
  };

  function onTileKey(e, i) {
    if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
      e.preventDefault();
      const before = selection.length;
      onTileClick(i);
      if (selection.length !== before) {
        focusTile(selection[selection.length - 1]);
      }
      return;
    }
    const dir = ARROW_DIRS[e.key];
    if (!dir) return;
    e.preventDefault();
    const next = nearestTile(i, dir);
    if (next != null) focusTile(next);
  }

  // Closest tile within a ~60° cone of the pressed direction. Geometric rather
  // than neighbor-based, so four arrow keys map cleanly onto a six-neighbour hex
  // grid and skip over gaps to the next real tile.
  //
  // Tie-breaking matters: on this lattice the due-east and up-right neighbours
  // sit at the *same* distance, so "nearest" alone is a coin flip between them.
  // We rank candidates by, in order:
  //   1. nearest (one step, not a far jump),
  //   2. best aligned to the pressed direction (→ favours due-east over up-right),
  //   3. larger signed perpendicular `cross` — i.e. the same side of the arrow.
  // That last rule keeps each axis self-consistent AND makes opposite arrows
  // exact inverses: ↑ takes the left of the two upper tiles, ↓ the right of the
  // two lower tiles, so ↑ then ↓ returns to the tile you started on.
  function nearestTile(from, [dx, dy]) {
    const a = cellXY(from);
    let best = null;
    let bestDist = Infinity;
    let bestAlign = -Infinity;
    let bestCross = -Infinity;
    for (const j of BOARD.tiles.keys()) {
      if (j === from) continue;
      const b = cellXY(j);
      const vx = b.x - a.x;
      const vy = b.y - a.y;
      const dist = Math.hypot(vx, vy);
      const align = (vx * dx + vy * dy) / dist; // cosine to the pressed direction
      if (align < 0.5) continue; // behind, or outside the ~60° cone
      const cross = vx * dy - vy * dx; // signed offset perpendicular to the arrow

      let better;
      if (Math.abs(dist - bestDist) > 0.5) {
        better = dist < bestDist; // different lattice ring: pure distance
      } else if (Math.abs(align - bestAlign) > 1e-6) {
        better = align > bestAlign; // same ring: prefer the better-aligned tile
      } else {
        better = cross > bestCross; // genuine tie: pick a consistent side
      }
      if (better) {
        best = j;
        bestDist = dist;
        bestAlign = align;
        bestCross = cross;
      }
    }
    return best;
  }

  // Move keyboard focus to tile `i`, keeping the roving tabindex in sync so Tab
  // still enters and leaves the grid at a single stop.
  function focusTile(i) {
    const g = document.querySelector(`.bl-hex[data-i="${i}"]`);
    if (!g) return;
    document
      .querySelectorAll(".bl-hex")
      .forEach((el) => el.setAttribute("tabindex", "-1"));
    g.setAttribute("tabindex", "0");
    g.focus();
  }

  // Describe a tile for assistive tech: its role in the current word, or its
  // bloom state. Mirrors the visual cues render() sets below.
  function tileStatus(i, selSet, usedSet, anchor, lastSel) {
    if (i === anchor) return "start of current word";
    if (selSet.has(i))
      return i === lastSel ? "current letter" : "in current word";
    if (usedSet.has(i)) return "bloomed";
    return "unbloomed";
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
        "bl-filled",
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

      // The "filled" border tracks committed (used) tiles regardless of the
      // interaction state above, so a re-used tile keeps the cue while new tiles
      // in the current word stay thin — distinguishing a fresh pick from re-use.
      if (usedSet.has(i)) el.classList.add("bl-filled");

      // Mark tiles adjacent to the last selected so the player sees what's reachable.
      const reachable = !state.done && isAdjacent(lastSel, i);
      if (reachable) {
        el.classList.add("bl-adj");
      }

      // Keep the accessible name + roving tabindex in step with the visuals:
      // only the current entry tile stays in the Tab order; arrows move within.
      const hint = reachable && !selSet.has(i) ? ", press Enter to add" : "";
      el.setAttribute(
        "aria-label",
        `${letterAt(i).toUpperCase()}, ${tileStatus(i, selSet, usedSet, anchor, lastSel)}${hint}`,
      );
      el.setAttribute("aria-pressed", selSet.has(i) ? "true" : "false");
      el.setAttribute("tabindex", i === lastSel ? "0" : "-1");
    });

    const cw = document.getElementById("bl-current");
    cw.textContent = currentWord() || " ";

    const wl = document.getElementById("bl-words");
    // The goal nudge shows only on a fresh/restarted board (wordCount 0); once
    // play starts the tiles and word-chain convey progress, so it steps aside.
    const wordCount = state.words.length;
    const statusTxt =
      wordCount === 0
        ? `Use every tile to win. Aim for ${BOARD.targetWords} words if you can.`
        : "";

    wl.innerHTML = `
      <div class="bl-par">${statusTxt}</div>
      <div class="bl-word-chain">
        ${state.words.map((w) => `<span class="bl-word-chip">${w.word.toUpperCase()}</span>`).join('<span class="bl-word-sep">›</span>')}
      </div>
    `;

    if (state.done) {
      // state.done is only set on a win, so the board is full here. The praise
      // word is the only score signal, scaling with how few words it took.
      const text =
        wordCount < BOARD.targetWords
          ? `Incredible!`
          : wordCount === BOARD.targetWords
            ? `Amazing!`
            : `Nice!`;
      // Streak + Share render as one muted, dot-separated row after the praise.
      const streak =
        records.streak > 0 ? `🔥 ${records.streak} day streak` : "";
      const meta = [
        streak,
        `<button type="button" class="bl-banner-share" id="bl-banner-share">Share your high score</button>`,
      ]
        .filter(Boolean)
        .join(" · ");
      cw.innerHTML =
        `<span class="bl-done-banner">${text}` +
        `<span class="bl-banner-meta"> · ${meta}</span></span>`;
      const sb = document.getElementById("bl-banner-share");
      if (sb) sb.addEventListener("click", share);
    }
  }

  // ─── Toast ─────────────────────────────────────────────────────────────────
  let toastTimer;
  // tone "error" (default) reads coral-red; "info" reads neutral, so hints and
  // success messages don't masquerade as rejections.
  function toast(msg, { tone = "error", ms = 1600 } = {}) {
    const el = document.getElementById("bl-toast");
    el.textContent = msg;
    el.classList.toggle("bl-toast--info", tone === "info");
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
    // Anti-abuse ceiling only — a legit game never reaches this many words.
    // Refuse the word rather than ending the round, so there's no fail state.
    if (state.words.length >= BOARD.targetWords + WORD_CAP_OVER_TARGET) {
      toast("Word limit reached");
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

    // The only end state now is a win: every tile covered.
    const won = state.used.length >= BOARD.totalTiles;
    if (won) state.done = true;
    updateRecords(state.used.length);
    save();
    render();
    bloomCells(cells);
    if (!wasDone && won) {
      // Stagger the cascade so the entered word finishes blooming first
      setTimeout(victoryCascade, cells.length * 55 + 200);
    }
  }

  // Pop a single tile after `delay`ms: add the class to scale up, remove it a
  // beat later to settle back (a CSS transition — see games.css for why).
  const BLOOM_MS = 300;
  function popTile(cell, className, delay) {
    const el = document.querySelector(`.bl-hex[data-i="${cell}"]`);
    if (!el) return;
    setTimeout(() => {
      el.classList.add(className);
      setTimeout(() => el.classList.remove(className), BLOOM_MS);
    }, delay);
  }

  // Flash a bloom across each cell of a just-entered word.
  function bloomCells(cells) {
    cells.forEach((c, i) => popTile(c, "bl-bloom", i * 55));
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
      for (const c of rings.get(d)) popTile(c, "bl-victory", delay);
    });
  }

  // Incremental delete: drop the last selected letter, or if none past the
  // anchor, un-enter the last word and re-select all but its final letter (to
  // swap it). Stays live after a win — clearing `done` lets the player rework
  // the tail for a lower word count.
  function deleteLast() {
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

  function showHint() {
    // Available even after a win — a replay for a lower word count can still use it.
    toast(`The word ${LONGEST_WORD.toUpperCase()} is possible today`, {
      tone: "info",
      ms: 3500,
    });
  }

  // Build the shareable score string. After a completion it shares today's BEST
  // (fewest-word) win, not whatever redo is on the board; before that, current
  // progress. The bouquet:
  //   🌸 word entered   ⚪ open target slot   🏆 words under target (the brag)
  //   🌿 word past target (overshoot is fine — the goal is filling the board)
  // Non-winning states append the tile fraction.
  function shareText() {
    const target = BOARD.targetWords;
    // bestWords is only ever set on a full-board win, so a non-null value means
    // the board's been completed today — share that best run.
    const won = state.bestWords !== null;
    const used = won ? state.bestWords : state.words.length;
    const tilesUsed = won
      ? BOARD.totalTiles
      : new Set([BOARD.start, ...state.words.flatMap((w) => w.cells)]).size;
    const blooms = Math.min(used, target);
    const filler = Math.max(0, target - used);
    // Cap the overshoot run so a runaway count can't balloon the share text.
    const extras = Math.min(Math.max(0, used - target), 10);
    const fillerChar = won ? "🏆" : "⚪";
    const bouquet =
      "🌸".repeat(blooms) + fillerChar.repeat(filler) + "🌿".repeat(extras);
    // A win is just the flowers; unfinished games append the tile fraction.
    const line = won
      ? bouquet
      : `${bouquet} ${tilesUsed}/${BOARD.totalTiles} tiles`;
    // Keep the share to two lines: streak rides on the header line, subtly.
    const header =
      records.streak > 0
        ? `Blossom ${TODAY_KEY} · 🔥 ${records.streak}`
        : `Blossom ${TODAY_KEY}`;
    return `${header}\n${line}`;
  }

  // Last-resort copy for browsers without the async clipboard API (older /
  // in-app webviews): a hidden textarea + execCommand.
  function copyFallback(text) {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "absolute";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      toast(ok ? "Copied to clipboard" : "Couldn't copy — try again", {
        tone: ok ? "info" : "error",
      });
    } catch {
      toast("Couldn't copy — try again");
    }
  }

  function share() {
    const text = shareText();
    // Prefer the clipboard API where it exists (the familiar "Copied" toast on
    // desktop and modern mobile). `navigator.clipboard` is undefined in
    // non-secure contexts and some in-app browsers — accessing .writeText there
    // throws synchronously, which a .catch() wouldn't catch — so guard it, then
    // fall back to the native share sheet, then to a manual copy.
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => toast("Copied to clipboard", { tone: "info" }))
        .catch(() => toast("Couldn't copy — try again"));
      return;
    }
    if (navigator.share) {
      // Rejects if the user dismisses the sheet — nothing to report there.
      navigator.share({ text }).catch(() => {});
      return;
    }
    copyFallback(text);
  }

  function restart() {
    const { bestWords, maxTiles } = state;
    state = freshState();
    // Bests persist across Restart so a redo can be measured against earlier.
    state.bestWords = bestWords;
    state.maxTiles = maxTiles;
    selection = [state.active];
    save();
    render();
  }

  // ─── Wire up ───────────────────────────────────────────────────────────────
  buildGrid();
  render();

  document.getElementById("bl-enter").addEventListener("click", submit);
  document.getElementById("bl-delete").addEventListener("click", deleteLast);
  document.getElementById("bl-share").addEventListener("click", share);
  document.getElementById("bl-hint-btn").addEventListener("click", showHint);

  // ─── Modal focus management ────────────────────────────────────────────────
  // Keep keyboard/screen-reader users from getting stranded behind an open
  // dialog: move focus into it on open, trap Tab inside it, close on Escape, and
  // hand focus back to whatever opened it on close.
  let modalReturnFocus = null;
  function modalFocusables(overlay) {
    return [
      ...overlay.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ),
    ].filter((el) => !el.disabled && el.offsetParent !== null);
  }
  function openModal(overlay) {
    modalReturnFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    overlay.hidden = false;
    const f = modalFocusables(overlay);
    (f[0] || overlay).focus();
  }
  function closeModal(overlay) {
    overlay.hidden = true;
    if (modalReturnFocus && modalReturnFocus.focus) modalReturnFocus.focus();
    modalReturnFocus = null;
  }
  function wireModalKeys(overlay) {
    overlay.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeModal(overlay);
        return;
      }
      if (e.key !== "Tab") return;
      const f = modalFocusables(overlay);
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      // Wrap focus at the ends so Tab can't escape to the page behind.
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });
  }

  // Restart is destructive, so it confirms first — unless the player has opted
  // out via the dialog's "Don't ask again" checkbox (a one-way preference,
  // cleared only by wiping site data).
  const RESTART_NOCONFIRM_KEY = "blossom-restart-noconfirm";
  const confirmModal = document.getElementById("bl-confirm");
  function requestRestart() {
    // Guard the read: a storage-blocked browser throws on access, and we
    // don't want a dead Restart button — just fall through to the prompt.
    let noConfirm = false;
    try {
      noConfirm = !!localStorage.getItem(RESTART_NOCONFIRM_KEY);
    } catch {}
    if (noConfirm) {
      restart();
      return;
    }
    document.getElementById("bl-confirm-skip").checked = false;
    openModal(confirmModal);
  }
  wireModalKeys(confirmModal);
  document
    .getElementById("bl-restart")
    .addEventListener("click", requestRestart);
  document
    .getElementById("bl-confirm-cancel")
    .addEventListener("click", () => closeModal(confirmModal));
  document.getElementById("bl-confirm-ok").addEventListener("click", () => {
    if (document.getElementById("bl-confirm-skip").checked) {
      try {
        localStorage.setItem(RESTART_NOCONFIRM_KEY, "1");
      } catch {}
    }
    closeModal(confirmModal);
    restart();
  });
  confirmModal.addEventListener("click", (e) => {
    if (e.target === confirmModal) closeModal(confirmModal);
  });

  const modal = document.getElementById("bl-modal");
  // First-time players land on a bare grid with no rules — open the how-to
  // once so the chain mechanic (and the header buttons) are discoverable.
  const HELP_SEEN_KEY = "blossom-help-seen";
  // Guard the read: localStorage access throws in storage-blocked browsers.
  let helpSeen = false;
  try {
    helpSeen = !!localStorage.getItem(HELP_SEEN_KEY);
  } catch {}
  wireModalKeys(modal);
  if (!helpSeen) {
    openModal(modal);
    try {
      localStorage.setItem(HELP_SEEN_KEY, "1");
    } catch {}
  }
  document
    .getElementById("bl-help-btn")
    .addEventListener("click", () => openModal(modal));
  document
    .getElementById("bl-modal-close")
    .addEventListener("click", () => closeModal(modal));
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal(modal);
  });

  // TODAY_KEY and BOARD are captured at module load. If a tab is left open
  // across midnight, the player would see yesterday's board with whatever
  // in-memory selection they had — reload when the date rolls over.
  function refreshIfStale() {
    if (dateKey(new Date()) !== TODAY_KEY) location.reload();
  }

  // Fingerprinting can't bust the HTML that carries the script URLs, so a
  // returning visitor can boot old code. BLOSSOM_BUILD is baked into that
  // (possibly stale) HTML; a mismatch with the fresh file means a newer deploy
  // exists. Driven by the events below rather than the poll, since stale code
  // only surfaces when a tab is reopened or refocused.
  async function reloadIfCodeStale() {
    try {
      const res = await fetch("/blossom-version.txt", { cache: "no-store" });
      if (res.ok && (await res.text()).trim() !== window.BLOSSOM_BUILD)
        location.reload();
    } catch {}
  }

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      refreshIfStale();
      reloadIfCodeStale();
    }
  });
  window.addEventListener("pageshow", () => {
    refreshIfStale();
    reloadIfCodeStale();
  });
  // visibilitychange/pageshow miss the case of a tab left focused across
  // midnight, so also poll the date once a minute.
  setInterval(refreshIfStale, 60000);
})();
