/* ============================================================
   browser_ai_api.js — REAL BROWSER API FOR ACCURATE PREDICTION
   1. Chrome Built-in AI API (window.ai.languageModel) — Gemini Nano
   2. Enhanced Local N-Gram Engine — deterministic, always works
   3. Web Speech API — voice input
   ============================================================ */

const BrowserAI = (function () {
    'use strict';

    let aiSession = null, aiCreating = false, aiAvail = null, speechRec = null;

    /* ── 1. CHROME BUILT-IN AI API ─────────────────────────── */
    async function detectChromeAI() {
        if (aiAvail !== null) return aiAvail;
        try {
            const has = typeof window !== 'undefined' && window.ai && window.ai.languageModel;
            if (!has) { aiAvail = false; return false; }
            const caps = await window.ai.languageModel.capabilities();
            aiAvail = caps && caps.available !== 'no';
        } catch (e) { aiAvail = false; }
        return aiAvail;
    }

    async function getSession() {
        if (aiSession) return aiSession;
        if (aiCreating) { while (aiCreating) await new Promise(r => setTimeout(r, 100)); return aiSession; }
        aiCreating = true;
        try {
            aiSession = await window.ai.languageModel.create({
                systemPrompt: 'You predict the single best next word for a sentence. Reply with exactly ONE lowercase word, no punctuation, no explanation.'
            });
        } catch (e) { console.warn('[BrowserAI] LM create failed:', e); aiSession = null; }
        aiCreating = false;
        return aiSession;
    }

    async function predictChromeAI(sentence) {
        if (!await detectChromeAI()) return null;
        const sess = await getSession();
        if (!sess) return null;
        try {
            const prompt = 'Complete with exactly one word (no punctuation, no explanation):\n\n"' + sentence + '" \u2192';
            const result = await sess.prompt(prompt);
            const clean = result.trim().toLowerCase().replace(/[^a-z]/g, '').split(/\s+/)[0];
            return clean.length >= 2 ? clean : null;
        } catch (e) { console.warn('[BrowserAI] predict failed:', e); return null; }
    }

    /* ── 2. ENHANCED LOCAL N-GRAM ENGINE ───────────────────── */
    const BG = {
        "artificial intelligence": { future:90, revolution:85, field:80, technology:75, is:70, will:60, has:55, can:50, and:45, domain:40 },
        "intelligence is":       { the:95, a:80, about:60, defined:55, not:50, our:45, transforming:40, evolving:35, reshaping:30, fundamental:25 },
        "is the":               { future:85, key:70, foundation:65, backbone:60, driving:55, most:50, new:45, next:40, ultimate:35, heart:30 },
        "is a":                 { powerful:80, new:75, rapidly:70, complex:65, revolutionary:60, transformative:55, critical:50, fundamental:45, rapid:40, vast:35 },
        "machine learning":     { is:85, algorithm:75, model:70, technique:65, approach:60, method:55, paradigm:50, field:45, revolution:40, has:35 },
        "deep learning":        { is:80, model:75, neural:70, algorithm:65, technique:60, approach:55, subset:50, revolutionary:45, powerful:40, has:35 },
        "neural network":       { is:80, learns:70, processes:65, model:60, simulates:55, mimics:50, approximates:45, represents:40, transforms:35 },
        "the future":           { of:90, is:75, holds:60, belongs:55, depends:50, lies:45, awaits:40, promises:35, unfolds:30, brings:25 },
        "data is":              { the:80, a:70, crucial:65, essential:60, fundamental:55, vital:50, powerful:45, transformative:40, critical:35 },
        "the brain":            { is:75, processes:70, contains:65, has:60, controls:55, regulates:50, interprets:45, stores:40, learns:35 },
        "human brain":          { is:70, has:65, processes:60, contains:55, controls:50, regulates:45, stores:40, learns:35, adapts:30 },
        "the world":            { is:70, has:60, needs:55, faces:50, requires:45, deserves:40, awaits:35, demands:30, offers:25 },
        "we are":               { the:70, entering:65, witnessing:60, living:55, creating:50, building:45, shaping:40, exploring:35, transforming:30 },
        "ai is":                { the:75, transforming:70, reshaping:65, revolutionizing:60, changing:55, redefining:50, creating:45, enabling:40, empowering:35 },
        "technology is":          { the:70, evolving:65, advancing:60, changing:55, transforming:50, driving:45, reshaping:40, accelerating:35, revolutionizing:30 },
        "computers can":        { learn:80, process:75, recognize:70, understand:65, generate:60, predict:55, analyze:50, simulate:45, solve:40 },
        "robots will":          { transform:70, revolutionize:65, change:60, replace:55, enhance:50, automate:45, shape:40, define:35, build:30 },
        "science is":           { the:75, a:65, about:60, fundamentally:55, continuously:50, always:45, essentially:40, deeply:35, relentlessly:30 },
        "the universe":         { is:75, has:65, contains:60, holds:55, expands:50, evolves:45, operates:40, remains:35, awaits:30 },
        "learning is":          { a:75, the:70, about:65, essential:60, fundamental:55, continuous:50, lifelong:45, adaptive:40, deep:35 },
        "patterns in":          { data:80, nature:70, behavior:65, language:60, images:55, music:50, markets:45, genes:40, weather:35 },
        "nature is":            { beautiful:75, a:70, the:65, full:55, filled:50, constantly:45, inherently:40, powerfully:35, profoundly:30 },
        "life is":              { beautiful:70, a:65, about:60, full:55, complex:50, precious:45, mysterious:40, evolving:35, dynamic:30 },
        "the mountain":         { is:70, stands:65, rises:60, towers:55, looms:50, dominates:45, beckons:40, challenges:35 },
        "blood is":             { red:90, the:60, a:50, crimson:45, life:40, essential:35, vital:30 },
        "sky is":               { blue:85, the:60, clear:50, vast:45, beautiful:40, endless:35 },
        "grass is":             { green:85, the:50, soft:45, lush:40, vibrant:35 },
        "sun is":               { yellow:80, the:60, bright:50, hot:45, glowing:40, rising:35 },
        "snow is":              { white:85, the:50, cold:45, pure:40, beautiful:35 },
        "night is":             { dark:80, the:55, black:50, mysterious:45, quiet:40 },
        "fire is":              { orange:75, hot:60, red:55, dangerous:50, the:40 },
        "clouds are":           { white:70, grey:60, floating:50, gathering:45, drifting:40 },
        "trees are":            { green:70, tall:60, growing:50, beautiful:45, ancient:40 },
        "water is":             { blue:65, clear:60, essential:55, life:50, the:45, pure:40 },
        "algorithm learns":     { from:80, patterns:75, data:70, examples:65, experience:60, mistakes:55, feedback:50 },
        "model predicts":       { the:75, outcomes:70, results:65, patterns:60, behavior:55, trends:50, future:45 },
        "system processes":     { data:80, information:75, signals:65, inputs:60, requests:55, tasks:50, images:45 }
    };

    const FALLBACK = [
        {w:"future",c:0.25},{w:"data",c:0.20},{w:"learning",c:0.18},{w:"intelligence",c:0.15},
        {w:"technology",c:0.12},{w:"revolution",c:0.10},{w:"system",c:0.08},{w:"model",c:0.07}
    ];

    function predictLocal(sentence) {
        const s = (sentence || "").toLowerCase().trim().replace(/[^a-z\s]/g, '');
        const words = s.split(/\s+/).filter(Boolean);
        if (!words.length) return FALLBACK.slice(0,4);

        // Try bigrams (last 2 words)
        if (words.length >= 2) {
            const bg = words.slice(-2).join(' ');
            if (BG[bg]) {
                const entries = Object.entries(BG[bg])
                    .map(([w,score]) => ({word:w, confidence: Math.min(0.99, score/100) }))
                    .sort((a,b) => b.confidence - a.confidence);
                if (entries.length) return entries.slice(0,4);
            }
        }

        // Try last-word continuation via unigram heuristics
        const last = words[words.length-1];
        const scores = {};
        Object.values(BG).forEach(map => {
            Object.keys(map).forEach(w => {
                scores[w] = (scores[w]||0) + (map[w]||0) * 0.02;
            });
        });
        // Boost words that phonetically or prefix-match the last word
        Object.keys(scores).forEach(w => {
            if (w.startsWith(last.substring(0,2)) && w !== last) scores[w] += 15;
            if (w.length > 3 && last.length > 3 && w[0] === last[0]) scores[w] += 8;
        });
        const entries = Object.entries(scores)
            .map(([w,score]) => ({word:w, confidence: Math.min(0.99, Math.max(0.05, score/100))}))
            .sort((a,b) => b.confidence - a.confidence);
        if (entries.length >= 4) return entries.slice(0,4);

        // Merge with fallback
        const merged = {};
        entries.forEach(e => merged[e.word] = e.confidence);
        FALLBACK.forEach(e => merged[e.w] = Math.max(merged[e.w]||0, e.c));
        return Object.entries(merged)
            .map(([w,c]) => ({word:w, confidence:c}))
            .sort((a,b) => b.confidence - a.confidence)
            .slice(0,4);
    }

    /* ── 3. WEB SPEECH API ─────────────────────────────────── */
    function getSpeechRecognizer() {
        if (speechRec) return speechRec;
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) return null;
        speechRec = new SR();
        speechRec.continuous = false;
        speechRec.interimResults = false;
        speechRec.lang = 'en-US';
        return speechRec;
    }

    function startSpeechInput(onResult, onError) {
        const rec = getSpeechRecognizer();
        if (!rec) { onError && onError('Speech API not supported'); return null; }
        rec.onresult = (e) => {
            const transcript = e.results[0][0].transcript;
            onResult && onResult(transcript);
        };
        rec.onerror = (e) => { onError && onError(e.error); };
        rec.start();
        return rec;
    }

    /* ── PUBLIC API ────────────────────────────────────────── */
    return {
        /* Which backend is active? */
        async getBackend() {
            if (await detectChromeAI()) return 'chrome-ai';
            return 'local-ngram';
        },

        /* Predict the single best next word + 3 runners-up */
        async predict(sentence) {
            // Primary: Chrome Built-in AI
            const chromeWord = await predictChromeAI(sentence);
            if (chromeWord) {
                // Build a 4-word vocabulary around the Chrome AI prediction
                const local = predictLocal(sentence);
                const vocab = [chromeWord];
                local.forEach(item => { if (item.word !== chromeWord && vocab.length < 4) vocab.push(item.word); });
                while (vocab.length < 4) vocab.push("token" + vocab.length);
                const confidences = [0.92, 0.45, 0.25, 0.15].map((c,i) => vocab[i] === chromeWord ? 0.95 : c);
                const desiredIdx = 0;
                return { words: vocab, confidences, desiredIdx, source: 'chrome-ai' };
            }

            // Fallback: Local N-Gram
            const local = predictLocal(sentence);
            const vocab = local.map(x => x.word);
            while (vocab.length < 4) vocab.push("token" + vocab.length);
            const confidences = local.map(x => x.confidence);
            while (confidences.length < 4) confidences.push(0.05);
            const desiredIdx = confidences.indexOf(Math.max(...confidences));
            return { words: vocab, confidences, desiredIdx, source: 'local-ngram' };
        },

        /* Quick single-word prediction (no vocab building) */
        async predictSingle(sentence) {
            const chromeWord = await predictChromeAI(sentence);
            if (chromeWord) return { word: chromeWord, source: 'chrome-ai' };
            const local = predictLocal(sentence);
            return { word: local[0]?.word || 'future', source: 'local-ngram' };
        },

        /* Voice input */
        startSpeech: startSpeechInput,
        stopSpeech() { if (speechRec) { try { speechRec.stop(); } catch(e){} } },
        isSpeechSupported() { return !!(window.SpeechRecognition || window.webkitSpeechRecognition); },

        /* Status */
        async isChromeAIAvailable() { return detectChromeAI(); }
    };
})();

window.BrowserAI = BrowserAI;
