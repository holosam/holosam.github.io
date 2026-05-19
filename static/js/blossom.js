(function () {
  // Validation list is broad (includes inflections like "began", "runs").
  // Generation list is the uninflected root-word set — cleaner chains and
  // avoids embedding hidden plurals/past-tenses in the solution chain.
  const VALID = new Set(window.BLOSSOM_WORDS);
  const { idx, toRC, neighbors, isAdjacent, generateBoard, seedForDate, dateKey } = window.BlossomGen;

  const MAX_WORD_LEN = 12;

  // ─── Today's board ─────────────────────────────────────────────────────────
  const TODAY = new Date();
  const TODAY_KEY = dateKey(TODAY);
  // Bump the version when the generator changes so stale state (referencing
  // cells that no longer exist on the new board) is automatically discarded.
  const STORAGE_KEY = 'blossom-v2-' + TODAY_KEY;
  const BOARD = generateBoard(seedForDate(TODAY), window.BLOSSOM_GEN_WORDS);

  function loadState() {
    try {
      const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (s && Array.isArray(s.words) && Array.isArray(s.used)) return s;
    } catch {}
    return {
      words: [],          // [{word, cells: [idx,...]}]
      used: [BOARD.start],
      active: BOARD.start,
      done: false,
    };
  }
  let state = loadState();

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  // ─── DOM scaffolding ───────────────────────────────────────────────────────
  const root = document.getElementById('blossom-game');
  root.innerHTML = `
    <div class="bl-container">
      <div class="bl-header-row">
        <div class="bl-date">${TODAY_KEY}</div>
        <div class="bl-header-actions">
          <button class="bl-help bl-icon-btn" id="bl-hint-btn" aria-label="Hint" title="Hint">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M9 18h6"/>
              <path d="M10 22h4"/>
              <path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2V18h6v-1.3c0-.8.4-1.5 1-2A7 7 0 0 0 12 2z"/>
            </svg>
          </button>
          <button class="bl-help" id="bl-help-btn">How to play</button>
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
        <button class="bl-btn" id="bl-deselect">Deselect</button>
        <button class="bl-btn bl-btn--primary" id="bl-enter">Enter</button>
      </div>
      <div class="bl-modal" id="bl-modal" hidden>
        <div class="bl-modal-card">
          <button class="bl-modal-close" id="bl-modal-close" aria-label="Close">×</button>
          <h2>How to play</h2>
          <ol>
            <li>Start at the highlighted tile. Tap adjacent tiles to spell a word, then hit Enter. You can reuse tiles with a word.</li>
            <li>Each new word begins where the last one ended.</li>
            <li>Use every tile to win. Use ${BOARD.targetWords} or fewer if possible.</li>
            <li>Stuck? Tap the 💡 for a hint.</li>
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
    return pts.join(' ');
  }

  function buildGrid() {
    const svg = document.getElementById('bl-grid');
    const SVG_NS = 'http://www.w3.org/2000/svg';

    // Compute bounding box of placed tiles
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
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
    const vbW = (maxX - minX) + pad * 2;
    const vbH = (maxY - minY) + pad * 2;
    svg.setAttribute('viewBox', `${vbX} ${vbY} ${vbW} ${vbH}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    // Hand the wrapper the aspect ratio so CSS can size the grid against
    // both viewport width AND viewport height (see games.css). Animation
    // transforms inside the SVG can overflow without changing the box,
    // because aspect-ratio fixes the box dimensions independently of
    // content.
    const aspect = document.getElementById('bl-grid-aspect');
    aspect.style.setProperty('--bl-aspect', `${vbW / vbH}`);

    // Render top-down so a lifted hex always paints over the row above it.
    // (SVG has no z-index; later siblings paint on top.)
    const sortedTiles = [...BOARD.tiles.entries()].sort(
      ([a], [b]) => toRC(a)[0] - toRC(b)[0]
    );
    for (const [i, letter] of sortedTiles) {
      const { x, y } = cellXY(i);

      const g = document.createElementNS(SVG_NS, 'g');
      g.setAttribute('class', 'bl-hex');
      g.setAttribute('data-i', i);

      const poly = document.createElementNS(SVG_NS, 'polygon');
      poly.setAttribute('points', hexPoints(x, y));

      const text = document.createElementNS(SVG_NS, 'text');
      text.setAttribute('x', x);
      text.setAttribute('y', y + 1);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'central');
      text.textContent = letter.toUpperCase();

      g.appendChild(poly);
      g.appendChild(text);
      svg.appendChild(g);
    }

    svg.addEventListener('click', e => {
      let t = e.target;
      if (!t.classList.contains('bl-hex')) t = t.closest('.bl-hex');
      if (!t) return;
      onTileClick(parseInt(t.getAttribute('data-i'), 10));
    });
  }

  // ─── Current selection ─────────────────────────────────────────────────────
  // selection[0] is always state.active (start of in-progress word).
  let selection = [state.active];

  function letterAt(i) {
    return BOARD.tiles.get(i);
  }

  function currentWord() {
    return selection.map(letterAt).join('');
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

    // Any tile adjacent to the last selected can be added — including a tile
    // that's already in the current selection (letters can be reused within
    // a word, e.g. spelling LEAVE by walking L→E→A→V→E back over the first E).
    const last = selection[selection.length - 1];
    if (!isAdjacent(last, i)) return;
    if (selection.length >= MAX_WORD_LEN) return;

    selection.push(i);
    render();
  }

  // ─── Rendering ─────────────────────────────────────────────────────────────
  function render() {
    const usedSet = new Set(state.used);
    const selSet = new Set(selection);
    const lastSel = selection[selection.length - 1];
    const anchor = selection[0];

    document.querySelectorAll('.bl-hex').forEach(el => {
      const i = parseInt(el.getAttribute('data-i'), 10);
      el.classList.remove('bl-used', 'bl-unused', 'bl-sel', 'bl-active', 'bl-anchor', 'bl-adj');

      if (selSet.has(i)) {
        el.classList.add('bl-sel');
        if (i === lastSel && selection.length > 1) el.classList.add('bl-active');
        if (i === anchor) el.classList.add('bl-anchor');
      } else if (usedSet.has(i)) {
        el.classList.add('bl-used');
      } else {
        el.classList.add('bl-unused');
      }

      // Mark every tile adjacent to the last selected — including ones already
      // in selection — so the player can see what's reachable for re-use.
      if (!state.done && isAdjacent(lastSel, i)) {
        el.classList.add('bl-adj');
      }
    });

    // Current word display
    const cw = document.getElementById('bl-current');
    cw.textContent = currentWord() || ' ';

    // Words history
    const wl = document.getElementById('bl-words');
    const used = new Set([BOARD.start]);
    state.words.forEach(w => w.cells.forEach(c => used.add(c)));
    const tilesUsed = used.size;
    const delta = state.words.length - BOARD.targetWords;
    const sign = delta > 0 ? '+' : '';
    const statusTxt = state.words.length === 0
      ? `Target: ${BOARD.targetWords} words`
      : `${state.words.length} word${state.words.length === 1 ? '' : 's'} · ${tilesUsed}/${BOARD.totalTiles} tiles · target ${BOARD.targetWords} (${sign}${delta})`;

    wl.innerHTML = `
      <div class="bl-par">${statusTxt}</div>
      <div class="bl-word-chain">
        ${state.words.map(w => `<span class="bl-word-chip">${w.word.toUpperCase()}</span>`).join('<span class="bl-word-sep">›</span>')}
      </div>
    `;

    // Done banner
    if (state.done) {
      const won = tilesUsed >= BOARD.totalTiles;
      const stars = !won ? 0 : (state.words.length <= BOARD.targetWords ? 2 : 1);
      const starStr = '★'.repeat(stars) + '☆'.repeat(2 - stars);
      cw.innerHTML = won
        ? `<span class="bl-done-banner">${starStr} Complete in ${state.words.length} words</span>`
        : `<span class="bl-done-banner">Game over — ${tilesUsed}/${BOARD.totalTiles} tiles</span>`;
    }
  }

  // ─── Toast ─────────────────────────────────────────────────────────────────
  let toastTimer;
  function toast(msg, ms = 1600) {
    const el = document.getElementById('bl-toast');
    el.textContent = msg;
    el.classList.add('bl-toast--on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('bl-toast--on'), ms);
  }

  function shake() {
    const el = document.getElementById('bl-current');
    el.classList.remove('bl-shake');
    void el.offsetWidth;
    el.classList.add('bl-shake');
  }

  // ─── Submit ────────────────────────────────────────────────────────────────
  function submit() {
    if (state.done) return;
    if (selection.length < 3) { toast('Words must be at least 3 letters'); shake(); return; }
    const word = currentWord();
    if (!VALID.has(word)) { toast(`"${word.toUpperCase()}" not in dictionary`); shake(); return; }
    if (state.words.some(w => w.word === word)) { toast('Already used'); shake(); return; }

    const cells = selection.slice();
    const wasDone = state.done;
    state.words.push({ word, cells });
    cells.forEach(c => { if (!state.used.includes(c)) state.used.push(c); });
    state.active = cells[cells.length - 1];
    selection = [state.active];

    // Check completion
    if (state.used.length >= BOARD.totalTiles) state.done = true;
    save();
    render();
    bloomCells(cells);
    if (!wasDone && state.done) {
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
        el.classList.add('bl-bloom');
        el.addEventListener('animationend', () => el.classList.remove('bl-bloom'), { once: true });
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
          el.classList.add('bl-victory');
          el.addEventListener('animationend', () => el.classList.remove('bl-victory'), { once: true });
        }, delay);
      }
    });
  }

  function deselect() {
    selection = [state.active];
    render();
  }

  // Pick a chain word the player hasn't entered yet. Prefer one that starts
  // at the current active letter (so it's playable from where they stand);
  // fall back to any remaining chain word so they can see the intended path
  // even if they need to backtrack.
  function findHint() {
    const entered = new Set(state.words.map(w => w.word));
    const activeLetter = letterAt(state.active);
    for (const w of BOARD.chain) {
      if (!entered.has(w) && w[0] === activeLetter) return w;
    }
    for (const w of BOARD.chain) {
      if (!entered.has(w)) return w;
    }
    return null;
  }

  function showHint() {
    if (state.done) return;
    const h = findHint();
    if (!h) { toast('No hints available'); return; }
    toast(`Hint: try ${h.toUpperCase()}`, 3500);
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

  document.getElementById('bl-enter').addEventListener('click', submit);
  document.getElementById('bl-deselect').addEventListener('click', deselect);
  document.getElementById('bl-restart').addEventListener('click', restart);
  document.getElementById('bl-hint-btn').addEventListener('click', showHint);

  const modal = document.getElementById('bl-modal');
  document.getElementById('bl-help-btn').addEventListener('click', () => modal.hidden = false);
  document.getElementById('bl-modal-close').addEventListener('click', () => modal.hidden = true);
  modal.addEventListener('click', e => { if (e.target === modal) modal.hidden = true; });

  // Keyboard: Enter submits, Backspace pops
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key === 'Enter') { submit(); e.preventDefault(); }
    else if (e.key === 'Backspace') {
      if (selection.length > 1) { selection.pop(); render(); e.preventDefault(); }
    } else if (e.key === 'Escape') {
      if (!modal.hidden) modal.hidden = true;
      else deselect();
    }
  });
})();
