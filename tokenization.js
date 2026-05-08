/* ============================================================
   [DEV 2] tokenization.js  —  Phase 5: Tokenization & Embedding
   GSAP: word reveal, token pill entrance, vocab ID flip, info-box bounce
   Canvas 2D: particle character rain background

   INTEGRATION DESIGN:
   • Uses the #token-canvas for a soft particle background.
   • Populates #sentence-container, #tokens-container,
     #vector-elements, #vector-elements via GSAP animations.
   • Exposes window.initPhase5() and window.reinitPhase5()
     which are called by y.js phase controller.
   • No external THREE.js usage here — canvas is 2D only,
     keeping this phase lightweight and portable.
============================================================ */

import { env, AutoTokenizer } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.14.0';

// Disable local models to force loading from HF Hub via CDN
env.allowLocalModels = false;

/* ── Dynamic BPE Tokenization Engine ─────────────────────── */
let currentTokenData = null;
let phaseRunning = false;
let loopTimeout  = null;

let tokenizerInstance = null;
let tokenizerLoading = false;
let tokenizerFailed = false;

// Initialize the real tokenizer in the background immediately
async function getTokenizer() {
    if (tokenizerInstance) return tokenizerInstance;
    if (tokenizerFailed) return null;
    if (tokenizerLoading) {
        return new Promise(resolve => {
            const check = setInterval(() => {
                if (tokenizerInstance) {
                    clearInterval(check);
                    resolve(tokenizerInstance);
                } else if (!tokenizerLoading) {
                    clearInterval(check);
                    resolve(null);
                }
            }, 100);
        });
    }
    tokenizerLoading = true;
    try {
        // Load the actual GPT-2 BPE tokenizer vocabulary (cl100k_base or gpt2)
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Tokenizer load timeout')), 5000));
        tokenizerInstance = await Promise.race([
            AutoTokenizer.from_pretrained('Xenova/gpt2'),
            timeoutPromise
        ]);
    } catch (e) {
        console.error("Failed to load tokenizer", e);
        tokenizerFailed = true;
    }
    tokenizerLoading = false;
    return tokenizerInstance;
}

getTokenizer(); // Pre-load

// Fallback simulator just in case the CDN fails or user is offline
function simulateRealWorldBPE(text) {
    if (!text || text.trim() === "") text = "Neural networks learn patterns";
    const tokens = [], ids = [];
    const hashStr = (str) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) { hash = ((hash << 5) - hash) + str.charCodeAt(i); hash |= 0; }
        return (Math.abs(hash) % 50157) + 100;
    };
    const words = text.trim().split(/\s+/);
    words.forEach((word, idx) => {
        const prefix = idx === 0 ? "" : "▁";
        if (word.length > 7) {
            const s1 = Math.floor(word.length / 2);
            const tok1 = prefix + word.substring(0, s1), part2 = word.substring(s1);
            tokens.push(tok1); ids.push(hashStr(tok1));
            tokens.push(part2); ids.push(hashStr(part2));
        } else {
            const tok = prefix + word;
            tokens.push(tok); ids.push(hashStr(tok));
        }
    });
    return { text, tokens, ids };
}

// Function to use the REAL tokenizer
async function performRealWorldBPE(text) {
    if (!text || text.trim() === "") text = "Neural networks learn patterns";
    try {
        const tokenizer = await getTokenizer();
        if (!tokenizer) throw new Error("Tokenizer failed to load.");

        // Real GPT-2 tokenization
        const encoded = await tokenizer(text);
        const ids = Array.from(encoded.input_ids.data);

        // Map IDs back to subwords, ensuring spaces are shown as '▁' for the UI
        const tokens = ids.map(id => {
            let decoded = tokenizer.decode([id]);
            if (decoded.startsWith(' ')) {
                decoded = '▁' + decoded.substring(1);
            }
            return decoded;
        });

        return { text, tokens, ids };
    } catch(e) {
        console.error("Using fallback BPE", e);
        return simulateRealWorldBPE(text);
    }
}

// Get current data from localStorage and run through REAL BPE
async function getDynamicData() {
    try {
        const stored = localStorage.getItem('bpe_data');
        if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed && parsed.sentence) {
                return await performRealWorldBPE(parsed.sentence);
            }
        }
    } catch (e) {
        console.error("Local storage access failed", e);
    }
    return await performRealWorldBPE("The neuron fires a signal");
}

/* ── Canvas particle background (2D, lightweight) ──────── */
const tokenCanvas = document.getElementById('token-canvas');
const tCtx        = tokenCanvas ? tokenCanvas.getContext('2d') : null;
let   tParticles  = [];

function resizeTokenCanvas() {
    if (!tokenCanvas) return;
    tokenCanvas.width  = window.innerWidth;
    tokenCanvas.height = window.innerHeight;
}
resizeTokenCanvas();
window.addEventListener('resize', resizeTokenCanvas);

/* Floating number/character rain for bg ambience */
const CHARS = '01▲▼◆●○■□ABCDEFabcdef';
function spawnTokenParticle() {
    return {
        x:       Math.random() * (tokenCanvas ? tokenCanvas.width : window.innerWidth),
        y:       -20,
        char:    CHARS[Math.floor(Math.random() * CHARS.length)],
        speed:   0.4 + Math.random() * 0.8,
        opacity: 0.06 + Math.random() * 0.12,
        size:    10 + Math.random() * 8,
        color:   Math.random() < 0.6 ? '#00ffff' : '#9D00FF'
    };
}

function renderTokenCanvas() {
    if (!tCtx || !tokenCanvas) return;
    if (tokenCanvas.style.display === 'none') {
        requestAnimationFrame(renderTokenCanvas);
        return;
    }
    tCtx.clearRect(0, 0, tokenCanvas.width, tokenCanvas.height);
    // Character rain for Phase 5 ambience
    if (Math.random() < 0.08) tParticles.push(spawnTokenParticle());
    tParticles = tParticles.filter(p => {
        p.y += p.speed;
        tCtx.globalAlpha = p.opacity;
        tCtx.fillStyle   = p.color;
        tCtx.font        = `${p.size}px 'Share Tech Mono', monospace`;
        tCtx.fillText(p.char, p.x, p.y);
        return p.y < tokenCanvas.height + 30;
    });
    tCtx.globalAlpha = 1;
    requestAnimationFrame(renderTokenCanvas);
}
renderTokenCanvas();

/* ── Terminal Log helper ───────────────────────────────── */
function appendLog(logEl, message, type = 'default') {
    if (!logEl) return;
    const line = document.createElement('div');
    line.className = `log-line log-${type}`;
    line.textContent = message;
    line.style.opacity = '0';
    line.style.transform = 'translateX(-8px)';
    logEl.appendChild(line);
    logEl.scrollTop = logEl.scrollHeight;
    gsap.to(line, { opacity: 1, x: 0, duration: 0.4, ease: 'power2.out' });
}

/* ── DOM helpers ─────────────────────────────────────────── */
function clearContainers() {
    const sc = document.getElementById('sentence-container');
    const tc = document.getElementById('tokens-container');
    if (sc) sc.innerHTML = '';
    if (tc) tc.innerHTML = '';
    const log = document.getElementById('narrator-log');
    if (log) log.innerHTML = '';
}

/* ── Main animation sequence ─────────────────────────────── */
function runTokenizationSequence(data, instant = false) {
    if (!phaseRunning) return;
    clearContainers();

    const sc  = document.getElementById('sentence-container');
    const tc  = document.getElementById('tokens-container');
    const log = document.getElementById('narrator-log');
    const narratorBox = document.getElementById('process-narrator');
    if (!sc || !tc) return;

    // Export IDs globally so embedding.js can read them
    window.lastTokenIds   = data.ids;
    window.lastTokenWords = data.tokens;
    try {
        localStorage.setItem('embedding_input_ids',
            JSON.stringify({ ids: data.ids, tokens: data.tokens }));
    } catch(e) {
        console.warn("localStorage unavailable for embedding_input_ids", e);
    }

    // Fade in the terminal log box
    if (narratorBox) gsap.to(narratorBox, { opacity: 1, duration: 0.5, ease: 'power2.out' });

    if (instant) {
        /* —— INSTANT (live typing) mode: no animations, no log —— */
        const words = data.text.split(' ');
        words.forEach(word => {
            const span = document.createElement('span');
            span.className = 'word';
            span.textContent = word + ' ';
            span.style.opacity = '1';
            sc.appendChild(span);
        });
        data.tokens.forEach((tok, i) => {
            const wrap = document.createElement('div');
            wrap.className = 'token-container';
            wrap.style.opacity = '1';
            wrap.style.transform = 'none';
            const pill = document.createElement('div');
            pill.className = 'token-pill';
            pill.textContent = tok;
            const idEl = document.createElement('div');
            idEl.className = 'token-id';
            idEl.textContent = data.ids[i];
            idEl.style.opacity = '1';
            idEl.style.transform = 'none';
            wrap.appendChild(pill);
            wrap.appendChild(idEl);
            tc.appendChild(wrap);
        });
        if (log) {
            log.innerHTML = '';
            appendLog(log, '> Processing complete.', 'success');
        }
        return;
    }

    /* —— ANIMATED mode —— */
    // Step 1: ingest raw text
    const words = data.text.split(' ');
    words.forEach(word => {
        const span = document.createElement('span');
        span.className = 'word';
        span.textContent = word + ' ';
        sc.appendChild(span);
    });

    const wordEls = sc.querySelectorAll('.word');
    gsap.set(wordEls, { opacity: 0 });
    gsap.to(wordEls, {
        opacity: 1, duration: 0.5, stagger: 0.15, ease: 'power2.out',
        onStart: () => appendLog(log,
            `> [INIT] Text stream received. ${data.text.length} chars.`, 'default')
    });

    const D1 = words.length * 0.15 + 1.0; // after words fade in

    // Step 2: BPE shredding — show token pills
    data.tokens.forEach((tok, i) => {
        const wrap = document.createElement('div');
        wrap.className = 'token-container';
        const pill = document.createElement('div');
        pill.className = 'token-pill';
        pill.textContent = tok;
        const idEl = document.createElement('div');
        idEl.className = 'token-id';
        idEl.textContent = data.ids[i];
        wrap.appendChild(pill);
        wrap.appendChild(idEl);
        tc.appendChild(wrap);
    });

    const tokenContainers = tc.querySelectorAll('.token-container');
    gsap.set(tokenContainers, { opacity: 0, y: 20 });
    gsap.to(tokenContainers, {
        opacity: 1, y: 0, duration: 0.5, stagger: 0.12,
        ease: 'power3.out', delay: D1,
        onStart: () => appendLog(log,
            `> [BPE]  Executing Byte-Pair Encoding... ${data.tokens.length} subwords found.`,
            'default')
    });

    const D2 = D1 + tokenContainers.length * 0.12 + 2.0;

    // Step 3: vocab mapping — flip in IDs
    const tokenIds = tc.querySelectorAll('.token-id');
    gsap.set(tokenIds, { opacity: 0, rotateX: 90 });
    gsap.to(tokenIds, {
        opacity: 1, rotateX: 0, duration: 0.45, stagger: 0.12,
        ease: 'back.out(1.7)', delay: D2,
        onStart: () => appendLog(log,
            '> [MAP]  Mapping tokens → GPT-2 dictionary (50,257 entries)...',
            'default')
    });

    const D3 = D2 + tokenIds.length * 0.12 + 2.0;

    // Step 4: done — prompt next phase
    gsap.delayedCall(D3, () => {
        if (!phaseRunning) return;
        appendLog(log, '> [DONE] All IDs assigned. Token array complete.', 'success');
        gsap.delayedCall(1.2, () => {
            if (!phaseRunning) return;
            appendLog(log,
                '> [►] Proceed to Phase 6 to fetch semantic weights from Embedding Matrix.',
                'waiting');
        });
    });
}



/* ── Info boxes slide-up (shared with Phase 4 style) ─────── */
function animateInfoBoxes() {
    const tokBoxes = document.querySelectorAll('#phase-tokenization .info-box');
    gsap.set(tokBoxes, { y: 100, opacity: 0 });
    gsap.to(tokBoxes, {
        y:        0,
        opacity:  1,
        duration: 1.0,
        ease:     'bounce.out',
        delay:    0.4,
        stagger: {
            each: 0.4,
            onStart: function() {
                const box = this.targets()[0];
                if (!box) return;
                const h = box.querySelector('.glowing-heading');
                if (h) h.classList.add('glitch-active');
            },
            onComplete: function() {
                const box = this.targets()[0];
                if (!box) return;
                const h = box.querySelector('.glowing-heading');
                setTimeout(() => { if (h) h.classList.remove('glitch-active'); }, 400);
            }
        }
    });
}

/* ══════════════════════════════════════════════════════════
   PUBLIC API — called by y.js phase controller
══════════════════════════════════════════════════════════ */

function setupUserPrompt() {
    const btn = document.getElementById('process-sentence-btn');
    const input = document.getElementById('user-sentence-input');
    
    if (btn && input && !btn.dataset.initialized) {
        
        let lastInputText = '';
        // Live typing updates
        input.addEventListener('input', async () => {
            const text = input.value;
            lastInputText = text;
            if (loopTimeout) clearTimeout(loopTimeout);
            
            if (text.trim() !== '') {
                // Kill ongoing token animations to prevent overlapping
                gsap.killTweensOf('.word, .token-container, .token-id, .vector-box, .vector-element');
                
                const liveData = await performRealWorldBPE(text);
                // Only render if this is still the latest text typed
                if (lastInputText === text) {
                    runTokenizationSequence(liveData, true); // instant = true
                }
            } else {
                clearContainers();
            }
        });

        btn.addEventListener('click', async () => {
            btn.blur();
            const text = input.value.trim();
            if (text) {
                // Store dynamically
                try {
                    localStorage.setItem('bpe_data', JSON.stringify({ sentence: text }));
                } catch(e) {
                    console.warn("localStorage unavailable", e);
                }
                // Fetch and run with animation
                currentTokenData = await getDynamicData();
                if (loopTimeout) clearTimeout(loopTimeout);
                runTokenizationSequence(currentTokenData, false);
            }
        });
        
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                btn.click();
            }
        });
        
        btn.dataset.initialized = "true";
    }
}

/* Called once: starts canvas, info-box animation + sequence */
window.initPhase5 = function(isForwardCycle = false) {
    phaseRunning = true;
    setupUserPrompt();

    if (tokenCanvas) tokenCanvas.style.display = 'block';

    animateInfoBoxes();
    const promptContainer = document.querySelector('.user-prompt-container');
    if (promptContainer) {
        gsap.to(promptContainer, { opacity: 1, duration: 1, delay: 0.8, ease: 'power2.out' });
    }

    clearContainers();
    
    getDynamicData().then(data => {
        currentTokenData = data;
        const input = document.getElementById('user-sentence-input');
        if (input) input.value = currentTokenData.text;

        loopTimeout = setTimeout(() => {
            runTokenizationSequence(currentTokenData);
        }, 1200);
    });
};

/* Called on re-entry */
window.reinitPhase5 = function(isForwardCycle = false) {
    phaseRunning = true;
    setupUserPrompt();

    if (tokenCanvas) tokenCanvas.style.display = 'block';

    const tokBoxes = document.querySelectorAll('#phase-tokenization .info-box');
    gsap.set(tokBoxes, { y: 60, opacity: 0 });
    gsap.to(tokBoxes, {
        y: 0, opacity: 1, duration: 0.8, ease: 'power2.out', stagger: 0.2
    });
    
    const promptContainer = document.querySelector('.user-prompt-container');
    if (promptContainer) {
        gsap.to(promptContainer, { opacity: 1, duration: 0.8, ease: 'power2.out' });
    }

    clearContainers();
    
    getDynamicData().then(data => {
        currentTokenData = data;
        const input = document.getElementById('user-sentence-input');
        if (input) input.value = currentTokenData.text;

        loopTimeout = setTimeout(() => {
            runTokenizationSequence(currentTokenData);
        }, 800);
    });
};

/* Called when leaving Phase 5 (y.js handles canvas hide, but stop loop) */
window.exitPhase5 = function() {
    phaseRunning = false;
    if (loopTimeout) { clearTimeout(loopTimeout); loopTimeout = null; }
    if (tokenCanvas) tokenCanvas.style.display = 'none';
    
    const promptContainer = document.querySelector('.user-prompt-container');
    if (promptContainer) gsap.to(promptContainer, { opacity: 0, duration: 0.3 });

    const narratorBox = document.getElementById('process-narrator');
    if (narratorBox) gsap.to(narratorBox, { opacity: 0, duration: 0.3 });
};