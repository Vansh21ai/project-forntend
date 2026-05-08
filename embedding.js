/**
 * [DEV 2] embedding.js — Phase 6: Embedding Matrix Lookup
 * GSAP: log slide-in, matrix scroll, chip pop-in, info-box bounce
 * No Three.js — pure DOM animations
 *
 * Reads token IDs from Phase 5, renders a scrollable matrix,
 * and lets the user click any ID chip to watch the row extraction.
 */

/* ── State ─────────────────────────────────────────────────── */
let embedPhaseRunning = false;
let currentIds        = [];
let currentTokens     = [];
let selectedChip      = null;

/* ── Terminal log helper ──────────────────────────────────── */
function embedLog(message, type = 'default') {
    const log = document.getElementById('embed-narrator-log');
    if (!log) return;
    const line = document.createElement('div');
    line.className = `log-line log-${type}`;
    line.textContent = message;
    line.style.opacity = '0';
    line.style.transform = 'translateX(-8px)';
    log.appendChild(line);
    log.scrollTop = log.scrollHeight;
    gsap.to(line, { opacity: 1, x: 0, duration: 0.4, ease: 'power2.out' });
}

function clearEmbedLog() {
    const log = document.getElementById('embed-narrator-log');
    if (log) log.innerHTML = '';
}

/* ── Matrix grid builder ─────────────────────────────────── */
const MATRIX_ROWS    = 40;   // visible rows — enough to make it feel infinite
const FLOATS_PER_ROW = 64;   // 64 of the 512 dims shown — requires horizontal scroll
const FLOAT_DECIMALS = 4;

function randFloat() {
    return (Math.random() * 2 - 1).toFixed(FLOAT_DECIMALS);
}

function buildMatrix(highlightRow = -1) {
    const grid = document.getElementById('embed-matrix-grid');
    if (!grid) return;
    grid.innerHTML = '';

    for (let r = 0; r < MATRIX_ROWS; r++) {
        const row = document.createElement('div');
        row.className = 'matrix-row';
        row.dataset.rowIndex = r;

        const label = document.createElement('span');
        label.className = 'matrix-row-label';
        label.textContent = `row ${String(r).padStart(2, '0')}:`;
        row.appendChild(label);

        for (let c = 0; c < FLOATS_PER_ROW; c++) {
            const cell = document.createElement('span');
            cell.className = 'matrix-cell';
            // Alternate cyan / bright-white for the data-stream look
            cell.style.color = Math.random() > 0.5 ? '#00ffff' : '#e6ffff';
            cell.textContent = randFloat();
            row.appendChild(cell);
        }

        if (r === highlightRow) row.classList.add('highlighted');
        grid.appendChild(row);
    }
}

/* ── Scroll matrix to a specific display row ─────────────── */
function scrollMatrixToRow(displayRow, cb) {
    const container = document.getElementById('embed-matrix-container');
    const grid      = document.getElementById('embed-matrix-grid');
    const rows      = grid.querySelectorAll('.matrix-row');
    if (!rows.length) return;

    const rowH       = rows[0].offsetHeight || 24;
    const targetScroll = Math.max(0, displayRow * rowH - container.clientHeight / 2);

    gsap.to(container, {
        scrollTop: targetScroll,
        duration:  1.2,
        ease:      'power3.inOut',
        onComplete: cb
    });
}

/* ── Extract floats from the highlighted row ─────────────── */
function extractFloats(tokenWord, tokenId) {
    const outputContainer = document.getElementById('embed-output-container');
    const outputFloats    = document.getElementById('embed-output-floats');
    if (!outputFloats) return;

    outputFloats.innerHTML = '';
    if (outputContainer) gsap.set(outputContainer, { opacity: 0 });

    // 32 representative dimensions with index labels (d0..d31)
    for (let i = 0; i < 32; i++) {
        const chip = document.createElement('div');
        chip.className = 'embed-float-chip';
        chip.style.opacity = '0';
        chip.style.transform = 'scale(0.6)';

        const dimLabel = document.createElement('div');
        dimLabel.style.cssText =
            'font-size:0.5rem;color:rgba(157,0,255,0.6);text-align:center;' +
            'margin-bottom:1px;letter-spacing:0.3px;';
        dimLabel.textContent = `d${i}`;

        const val = document.createElement('div');
        val.textContent = randFloat();

        chip.appendChild(dimLabel);
        chip.appendChild(val);
        outputFloats.appendChild(chip);
    }

    gsap.to(outputContainer, { opacity: 1, duration: 0.5, ease: 'power2.out' });

    const chips = outputFloats.querySelectorAll('.embed-float-chip');
    gsap.to(chips, {
        opacity: 1, scale: 1, duration: 0.28,
        stagger: 0.035, ease: 'back.out(1.7)',
        delay: 0.3,
        onComplete: () => {
            embedLog(
                `> [DONE] Row ${tokenId} extracted — these are the embedding weights for "${tokenWord}".`,
                'success'
            );
            embedLog(
                '> [INFO] Each float d0..d511 = one semantic dimension. +1.0 means strongly related, -1.0 means opposite.',
                'default'
            );
            embedLog('> [►]  Scroll right to see all 512 dims → or click another token ID.', 'waiting');
            revealSendButton();
        }
    });
}


/* ── Show "Send to Neuron" button ────────────────────────── */
function revealSendButton() {
    const btn = document.getElementById('send-to-neuron-btn');
    if (!btn || btn.style.opacity === '1') return;
    gsap.to(btn, { opacity: 1, duration: 0.6, ease: 'power2.out' });
    btn.style.pointerEvents = 'auto';
}

/* ── Chip click handler ──────────────────────────────────── */
function onChipClick(chip, tokenId, tokenWord) {
    if (!embedPhaseRunning) return;

    // Deselect previous chip
    if (selectedChip && selectedChip !== chip) {
        gsap.to(selectedChip, { scale: 1, boxShadow: 'none', duration: 0.25 });
        selectedChip.classList.remove('active-chip');
    }
    selectedChip = chip;
    chip.classList.add('active-chip');
    gsap.to(chip, {
        scale: 1.12,
        boxShadow: '0 0 22px #00ffff',
        duration: 0.3,
        ease: 'back.out(1.7)'
    });

    clearEmbedLog();
    embedLog(`> [SEL] Token ID ${tokenId} selected ("${tokenWord}").`, 'default');
    embedLog(`> [SRCH] Searching Embedding Matrix E ∈ ℝ^{50257×512} for row ${tokenId}...`, 'default');

    // Pick a display row to highlight
    const displayRow = Math.floor(Math.random() * (MATRIX_ROWS - 6)) + 3;

    // Rebuild matrix with fresh numbers (simulate live lookup)
    buildMatrix();

    // Scroll to the row, then highlight + extract
    scrollMatrixToRow(displayRow, () => {
        if (!embedPhaseRunning) return;

        // Highlight the row and set its label to the real token ID
        const rows = document.querySelectorAll('#embed-matrix-grid .matrix-row');
        rows.forEach(r => r.classList.remove('highlighted'));
        if (rows[displayRow]) {
            rows[displayRow].classList.add('highlighted');
            rows[displayRow].querySelector('.matrix-row-label').textContent =
                `ROW E[${tokenId}]:`;
            // Freshen the cell values with alternating colors on the highlighted row
            rows[displayRow].querySelectorAll('.matrix-cell').forEach(c => {
                c.textContent = randFloat();
                c.style.color = Math.random() > 0.5 ? '#00ffff' : '#e6ffff';
            });
        }

        embedLog(`> [FOUND] Row ${tokenId} located. Fetching 512 float weights...`, 'default');

        gsap.delayedCall(0.8, () => {
            if (!embedPhaseRunning) return;
            extractFloats(tokenWord, tokenId);
        });
    });
}

/* ── Build the clickable ID chip row ────────────────────── */
function buildIdRow(ids, tokens) {
    const row = document.getElementById('embed-id-row');
    if (!row) return;
    row.innerHTML = '';

    ids.forEach((id, i) => {
        const chip = document.createElement('button');
        chip.className   = 'embed-chip';
        chip.textContent = id;
        chip.title       = `Token: "${tokens[i]}" → ID: ${id}`;
        chip.style.opacity = '0';
        chip.style.transform = 'translateY(12px)';

        chip.addEventListener('click', () => onChipClick(chip, id, tokens[i]));
        row.appendChild(chip);
    });

    // Stagger chips in
    const chips = row.querySelectorAll('.embed-chip');
    gsap.to(chips, {
        opacity: 1, y: 0, duration: 0.5,
        stagger: 0.08, ease: 'power3.out', delay: 0.4
    });
}

/* ── Animate info boxes ──────────────────────────────────── */
function animateEmbedInfoBoxes() {
    const boxes = document.querySelectorAll('#phase-embedding .info-box');
    gsap.set(boxes, { y: 100, opacity: 0 });
    gsap.to(boxes, {
        y: 0, opacity: 1, duration: 1.0,
        ease: 'bounce.out', delay: 0.4, stagger: 0.35
    });
}

/* ── Phase init helpers ──────────────────────────────────── */
function loadTokenData() {
    // Try live global first (set by tokenization.js), then localStorage
    if (window.lastTokenIds && window.lastTokenIds.length) {
        currentIds    = window.lastTokenIds;
        currentTokens = window.lastTokenWords || currentIds.map(() => '?');
    } else {
        try {
            const raw = localStorage.getItem('embedding_input_ids');
            if (raw) {
                const parsed = JSON.parse(raw);
                currentIds    = parsed.ids    || [];
                currentTokens = parsed.tokens || [];
            }
        } catch (_) { currentIds = []; currentTokens = []; }
    }
}

function initUI() {
    const narrator = document.getElementById('embed-narrator');
    if (narrator) gsap.to(narrator, { opacity: 1, duration: 0.5, ease: 'power2.out' });

    clearEmbedLog();

    const out = document.getElementById('embed-output-container');
    if (out) { gsap.set(out, { opacity: 0 }); out.querySelector('#embed-output-floats').innerHTML = ''; }
    const btn = document.getElementById('send-to-neuron-btn');
    if (btn) { btn.style.opacity = '0'; btn.style.pointerEvents = 'none'; }
    selectedChip = null;

    if (currentIds.length === 0) {
        embedLog('> [WARN] No token data found. Go to Phase 5, type a sentence, then return.', 'waiting');
        buildMatrix();
        return;
    }

    const delay = (s, fn) => gsap.delayedCall(s, () => { if (embedPhaseRunning) fn(); });

    embedLog('> [PHASE 6] Embedding Matrix Lookup — initialising...', 'default');
    delay(0.9, () => embedLog(
        `> [MATRIX] E \u2208 \u211d^{50,257 \u00d7 512}. Each of 50,257 tokens has a row of 512 floats.`,
        'default'
    ));
    delay(1.8, () => embedLog(
        '> [WHAT?]  Each float encodes one semantic dimension: gender, tense, topic, sentiment...',
        'default'
    ));
    delay(2.7, () => embedLog(
        '> [WHY?]   AI cannot read text. It does MATH. These 512 numbers ARE the word to the model.',
        'default'
    ));
    delay(3.6, () => embedLog(
        `> [INPUT]  ${currentIds.length} Token IDs received from Phase 5 BPE pipeline.`,
        'default'
    ));
    delay(4.5, () => embedLog(
        '> [HOW?]   Click a Token ID chip. Model runs: vector = E[ token_id ]  (one row lookup).',
        'default'
    ));
    delay(5.3, () => embedLog(
        '> [OUT]    Result is a 512-float dense vector. Scroll the output row RIGHT to see all dims.',
        'default'
    ));
    delay(6.0, () => embedLog(
        '> [\u25ba]  SELECT any Token ID chip below to trigger a live matrix lookup.',
        'waiting'
    ));

    buildIdRow(currentIds, currentTokens);
    buildMatrix();
}

/* ═══════════════════════════════════════════════════════════
   PUBLIC API  — called by y.js
═══════════════════════════════════════════════════════════ */

window.initPhase6 = function() {
    embedPhaseRunning = true;
    loadTokenData();
    animateEmbedInfoBoxes();
    initUI();

    // Wire the "Send to Neuron" button — next ANN phase will be added later
    const btn = document.getElementById('send-to-neuron-btn');
    if (btn && !btn.dataset.wired) {
        btn.addEventListener('click', () => {
            if (window.switchPhaseWithTransition) window.switchPhaseWithTransition(6);
        });
        btn.dataset.wired = 'true';
    }
};

window.reinitPhase6 = function() {
    embedPhaseRunning = true;
    loadTokenData();

    // Re-animate info boxes quickly
    const boxes = document.querySelectorAll('#phase-embedding .info-box');
    gsap.set(boxes, { y: 60, opacity: 0 });
    gsap.to(boxes, { y: 0, opacity: 1, duration: 0.8, ease: 'power2.out', stagger: 0.2 });

    initUI();
};

window.exitPhase6 = function() {
    embedPhaseRunning = false;
    const narrator = document.getElementById('embed-narrator');
    if (narrator) gsap.to(narrator, { opacity: 0, duration: 0.3 });
};