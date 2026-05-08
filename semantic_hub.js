/* ============================================================
   [DEV 3] semantic_hub.js — [PHASE 7] PERFECT SEMANTIC HUB V8.0
   Three.js scene: full neural network, signal pulses, edge connections
   GSAP: forward pass cascade, backprop animation, weight ticker,
         node flash/scale/glow, camera transitions, idle pulsing
   Restoring full logic, animations, and mathematical engine
   from the Star folder V8.0 release.
 ============================================================ */

class NeuralNetwork {
    constructor(sizes) {
        this.sizes = sizes;
        this.numLayers = sizes.length;
        this.weights = [];  
        this.biases = [];   
        
        for (let L = 0; L < sizes.length - 1; L++) {
            const limit = Math.sqrt(2 / sizes[L]);
            const wLayer = [];
            for (let j = 0; j < sizes[L + 1]; j++) {
                const wRow = new Float32Array(sizes[L]);
                for (let k = 0; k < sizes[L]; k++) {
                    wRow[k] = (Math.random() * 2 - 1) * limit;
                }
                wLayer.push(wRow);
            }
            this.weights.push(wLayer);
            this.biases.push(new Float32Array(sizes[L + 1]).fill(0.01));
        }
        
        this.activations = null; 
        this.zValues = null;     
        this.cost = 0;
    }

    forward(inputVec) {
        this.activations = [Float32Array.from(inputVec)];
        this.zValues = [Float32Array.from(inputVec)];
        
        for (let L = 0; L < this.numLayers - 1; L++) {
            const prevA = this.activations[L];
            const z = new Float32Array(this.sizes[L + 1]);
            const a = new Float32Array(this.sizes[L + 1]);
            
            for (let j = 0; j < this.sizes[L + 1]; j++) {
                let sum = this.biases[L][j];
                for (let k = 0; k < this.sizes[L]; k++) {
                    sum += prevA[k] * this.weights[L][j][k];
                }
                z[j] = sum;
                
                if (L < this.numLayers - 2) {
                    a[j] = Math.max(0, sum);
                } else {
                    a[j] = sum;
                }
            }
            
            this.zValues.push(z);
            
            if (L === this.numLayers - 2) {
                const softmaxed = this._softmax(a);
                this.activations.push(softmaxed);
            } else {
                this.activations.push(a);
            }
        }
        
        return { activations: this.activations, zValues: this.zValues };
    }

    _softmax(arr) {
        const max = Math.max(...arr);
        const exps = arr.map(x => Math.exp(x - max));
        const sum = exps.reduce((a, b) => a + b, 0);
        return Float32Array.from(exps.map(x => x / sum));
    }

    calcCrossEntropyLoss(targetIdx) {
        const outputActivations = this.activations[this.numLayers - 1];
        return -Math.log(outputActivations[targetIdx] + 1e-10);
    }

    backward(targetVec, learningRate = 0.05) {
        const L = this.numLayers - 1;
        const deltas = [];  
        
        const outDelta = new Float32Array(this.sizes[L]);
        for (let j = 0; j < this.sizes[L]; j++) {
            outDelta[j] = this.activations[L][j] - targetVec[j];
        }
        deltas[L - 1] = outDelta;
        
        for (let l = L - 1; l > 0; l--) {
            const delta = new Float32Array(this.sizes[l]);
            for (let j = 0; j < this.sizes[l]; j++) {
                let err = 0;
                for (let k = 0; k < this.sizes[l + 1]; k++) {
                    err += deltas[l][k] * this.weights[l][k][j];
                }
                delta[j] = err * (this.zValues[l][j] > 0 ? 1 : 0);
            }
            deltas[l - 1] = delta;
        }
        
        const gradientLog = [];  
        
        for (let l = 0; l < this.numLayers - 1; l++) {
            const layerGrads = [];
            for (let j = 0; j < this.sizes[l + 1]; j++) {
                const wGrads = new Float32Array(this.sizes[l]);
                for (let k = 0; k < this.sizes[l]; k++) {
                    const grad = deltas[l][j] * this.activations[l][k];
                    wGrads[k] = grad;
                    this.weights[l][j][k] -= learningRate * grad;
                }
                const biasGrad = deltas[l][j];
                this.biases[l][j] -= learningRate * biasGrad;
                layerGrads.push({ delta: deltas[l][j], weightGrads: wGrads, biasGrad });
            }
            gradientLog.push(layerGrads);
        }
        
        return gradientLog;
    }
}

// Global state
let scene_h, camera_h, renderer_h, orbit_h, nn_h;
let visualNodes_h = [], visualHalos_h = [], visualEdges_h = [];
let htmlLabels_h = [], layerTitleDivs_h = [];
let vocabulary_h = ["intelligence", "learning", "data", "future"];
let targetWordIdx_h = 0, epochCount_h = 0, currentCost_h = 0, masterTimeline_h = null, cachedActivations_h = null;
let desiredWordIdx_h = 0, lastPredictionIdx_h = 0, semanticPriors_h = [0.25, 0.25, 0.25, 0.25], lastAdaptSentence_h = "";

const realArch_h = [512, 128, 64, 4];
const visArch_h = [16, 10, 8, 4];
const ratios_h = visArch_h.map((v, i) => realArch_h[i] / v);
const layerX_h = [-24, -8, 8, 24];
const layerColorsHex_h = [0x00ffff, 0x3a7bd5, 0x660099, 0x8a2be2];

/** Procedural noise for neuron surface depth (metal + bumps). */
function createHubNoiseBumpTexture_hex(size = 256) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.createImageData(size, size);
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const i = (y * size + x) * 4;
            const v = 110 + Math.sin(x * 0.15) * 18 + Math.sin(y * 0.12 + x * 0.08) * 22 + (Math.random() - 0.5) * 28;
            const c = Math.max(40, Math.min(215, Math.floor(v)));
            imgData.data[i] = imgData.data[i + 1] = imgData.data[i + 2] = c;
            imgData.data[i + 3] = 255;
        }
    }
    ctx.putImageData(imgData, 0, 0);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
    tex.needsUpdate = true;
    return tex;
}

function initPhase7() {
    const container = document.getElementById('hub-canvas-container');
    if (!container || renderer_h) return;

    scene_h = new THREE.Scene();
    camera_h = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera_h.position.set(0, 0, 40);

    renderer_h = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer_h.setSize(window.innerWidth, window.innerHeight);
    renderer_h.setClearColor(0x000000, 0); // Explicitly set alpha to 0
    container.appendChild(renderer_h.domElement);

    orbit_h = new THREE.OrbitControls(camera_h, renderer_h.domElement);
    orbit_h.enableDamping = true;
    orbit_h.dampingFactor = 0.05;

    scene_h.add(new THREE.AmbientLight(0xffffff, 0.5));
    const dL = new THREE.DirectionalLight(0xffffff, 1);
    dL.position.set(10, 20, 10);
    scene_h.add(dL);

    nn_h = new NeuralNetwork(realArch_h);

    const bumpMap_h = createHubNoiseBumpTexture_hex(192);
    const nodeGeo = new THREE.SphereGeometry(0.52, 64, 64);
    const haloGeo = new THREE.SphereGeometry(1.35, 32, 32);
    const nodeMatBase = new THREE.MeshPhysicalMaterial({
        color: 0x061422,
        emissive: 0x0a4a5a,
        emissiveIntensity: 0.65,
        metalness: 0.75,
        roughness: 0.18,
        bumpMap: bumpMap_h,
        bumpScale: 0.08,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
        envMapIntensity: 1.2
    });

    const labelsCont = document.getElementById('hub-labels-container');
    const layerTitles = ["Input Vector\n512-dim BPE", "Hidden Layer 1\n128 neurons", "Hidden Layer 2\n64 neurons", "Output\nVocabulary"];

    for (let L = 0; L < visArch_h.length; L++) {
        const lNodes = [], lHalos = [], lH = [];
        const tDiv = document.createElement('div');
        tDiv.className = 'hub-layer-title';
        tDiv.innerHTML = layerTitles[L];
        labelsCont.appendChild(tDiv);
        layerTitleDivs_h.push(tDiv);

        for (let i = 0; i < visArch_h[L]; i++) {
            const node = new THREE.Mesh(nodeGeo, nodeMatBase.clone());
            node.position.set(layerX_h[L], -(i - (visArch_h[L] - 1) / 2) * 3, 0);
            node._isAnimating = false;
            
            // Rotating energy ring — thinner wire, brighter glow
            const ringGeo = new THREE.TorusGeometry(0.72, 0.024, 8, 48);
            const ringMat = new THREE.MeshBasicMaterial({
                color: layerColorsHex_h[L],
                transparent: true,
                opacity: 0.6,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.rotation.x = Math.PI / 2;
            ring.userData.baseRotation = 0;
            ring.userData.spinSpeed = 0.8 + Math.random() * 0.6;
            node.add(ring);

            // Inner bright core glow sphere
            const coreGlowGeo = new THREE.SphereGeometry(0.42, 32, 32);
            const coreGlowMat = new THREE.MeshBasicMaterial({
                color: layerColorsHex_h[L],
                transparent: true,
                opacity: 0.35,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            const coreGlow = new THREE.Mesh(coreGlowGeo, coreGlowMat);
            node.add(coreGlow);

            // Outer volumetric halo
            const halo = new THREE.Mesh(haloGeo, new THREE.MeshBasicMaterial({
                color: layerColorsHex_h[L],
                transparent: true,
                opacity: 0.12,
                side: THREE.BackSide,
                depthWrite: false,
                blending: THREE.AdditiveBlending
            }));
            node.add(halo);
            scene_h.add(node);
            lNodes.push(node);
            lHalos.push(halo);
            const d = document.createElement('div');
            d.className = 'hub-node-label';
            labelsCont.appendChild(d);
            lH.push(d);
        }
        visualNodes_h.push(lNodes);
        visualHalos_h.push(lHalos);
        htmlLabels_h.push(lH);
    }

    for (let L = 0; L < visArch_h.length - 1; L++) {
        const lEdges = [];
        const layerColor = new THREE.Color(layerColorsHex_h[L]);
        const dimColor = layerColor.clone().multiplyScalar(0.35);
        for (let j = 0; j < visArch_h[L+1]; j++) {
            const nEdges = [];
            for (let k = 0; k < visArch_h[L]; k++) {
                const mat = new THREE.LineBasicMaterial({
                    color: dimColor,
                    transparent: true,
                    opacity: 0.22,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false
                });
                const geo = new THREE.BufferGeometry().setFromPoints([visualNodes_h[L][k].position, visualNodes_h[L+1][j].position]);
                const line = new THREE.Line(geo, mat);
                line.userData.baseOpacity = 0.22;
                scene_h.add(line);
                nEdges.push(line);
            }
            lEdges.push(nEdges);
        }
        visualEdges_h.push(lEdges);
    }

    // Set initial edge colors
    for (let L = 1; L < visArch_h.length; L++) {
        for (let j = 0; j < visArch_h[L]; j++) {
            updateEdgeColorsHub(L, j);
        }
    }

    document.getElementById('hub-btn-predict').addEventListener('click', runForwardPassHub);
    document.getElementById('hub-btn-backprop').addEventListener('click', runBackpropHub);
    document.getElementById('hub-sentence-input').addEventListener('input', debounceHub(e => adaptToInputHub(e.target.value), 500));

    // Voice input button
    const voiceBtn = document.getElementById('hub-voice-btn');
    if (voiceBtn) {
        if (BrowserAI && !BrowserAI.isSpeechSupported()) {
            voiceBtn.style.display = 'none';
        } else {
            voiceBtn.addEventListener('click', () => {
                const input = document.getElementById('hub-sentence-input');
                voiceBtn.style.background = 'rgba(0,255,136,0.25)';
                BrowserAI.startSpeech(
                    (text) => { input.value = text; adaptToInputHub(text); voiceBtn.style.background = 'rgba(0,212,255,0.15)'; },
                    (err) => { console.warn('Speech error:', err); voiceBtn.style.background = 'rgba(0,212,255,0.15)'; }
                );
            });
        }
    }

    // Show which backend is active
    const statusEl = document.getElementById('hub-api-status');
    if (statusEl && typeof BrowserAI !== 'undefined') {
        BrowserAI.getBackend().then(backend => {
            if (backend === 'chrome-ai') {
                statusEl.innerText = '✓ Chrome Built-in AI (Gemini Nano) active — hyper-accurate';
                statusEl.style.color = '#00ff88';
            } else {
                statusEl.innerText = 'Local N-Gram Engine active — deterministic, always works';
                statusEl.style.color = '#ffaa33';
            }
        });
    }

    // Speed Control Logic
    const speedSlider = document.getElementById('hub-speed-slider');
    const speedVal    = document.getElementById('hub-speed-val');
    if (speedSlider) {
        speedSlider.addEventListener('input', () => {
            const val = parseFloat(speedSlider.value);
            speedVal.innerText = val.toFixed(1) + 'x';
            gsap.globalTimeline.timeScale(val);
        });
    }

    // Data linkage fix: prioritizing localStorage from Phase 5
    const initial = getInputDataHub();
    document.getElementById('hub-sentence-input').value = initial.sentence;
    adaptToInputHub(initial.sentence);

    animateHub();
}

function updateEdgeColorsHub(layerIdx, nodeIdx) {
    const inEdges = visualEdges_h[layerIdx - 1][nodeIdx];
    const realJ = Math.floor(nodeIdx * ratios_h[layerIdx]);
    inEdges.forEach((edge, visK) => {
        const realK = Math.floor(visK * ratios_h[layerIdx - 1]);
        const w = nn_h.weights[layerIdx - 1][realJ][realK];
        if (Math.abs(w) < 0.05) {
            edge.material.color.setHex(0x333355);
            edge.material.opacity = 0.08;
        } else {
            edge.material.color.setHex(w > 0 ? 0x1e90ff : 0xff3030);
            edge.material.opacity = Math.max(0.15, Math.min(0.5, Math.abs(w) * 3));
        }
    });
}

function animateOutgoingConnectionsHub(layerIdx, sourceIdx, activationStrength) {
    if (layerIdx >= visArch_h.length - 1) return;
    const strength = Math.min(1, Math.max(0, Math.abs(activationStrength)));
    const duration = 0.18 + (1 - strength) * 0.12;
    for (let nextIdx = 0; nextIdx < visArch_h[layerIdx + 1]; nextIdx++) {
        const edge = visualEdges_h[layerIdx][nextIdx][sourceIdx];
        const pulseOpacity = 0.45 + strength * 0.85;
        // Bright electric-blue flash that fades back to base
        gsap.to(edge.material, { opacity: pulseOpacity, duration: duration * 0.6, ease: "power2.out", yoyo: true, repeat: 1 });
        gsap.to(edge.material.color, {
            r: 0.1 + strength * 0.3,
            g: 0.85 + strength * 0.15,
            b: 1.0,
            duration: duration * 0.5,
            ease: "power2.out",
            yoyo: true,
            repeat: 1
        });
    }
}

function updateHubLabelsPos() {
    const tempV = new THREE.Vector3();
    for (let L = 0; L < visArch_h.length; L++) {
        for (let i = 0; i < visArch_h[L]; i++) {
            const node = visualNodes_h[L][i];
            const div = htmlLabels_h[L][i];
            tempV.copy(node.position);
            tempV.project(camera_h);
            if (tempV.z > 1) {
                div.style.display = 'none';
                continue;
            }
            div.style.display = 'block';
            div.style.left = `${(tempV.x * 0.5 + 0.5) * window.innerWidth}px`;
            div.style.top = `${(tempV.y * -0.5 + 0.5) * window.innerHeight - 30}px`;
        }
        const tDiv = layerTitleDivs_h[L];
        tempV.copy(visualNodes_h[L][0].position);
        tempV.y += 4.5;
        tempV.project(camera_h);
        if (tempV.z > 1) {
            tDiv.style.display = 'none';
        } else {
            tDiv.style.display = 'block';
            tDiv.style.left = `${(tempV.x * 0.5 + 0.5) * window.innerWidth}px`;
            tDiv.style.top = `${(tempV.y * -0.5 + 0.5) * window.innerHeight}px`;
        }
    }
}

function updateNodeLabelHub(L, i, z, a, p=null, word=null) {
    const div = htmlLabels_h[L][i];
    const realIdx = Math.floor(i * ratios_h[L]);
    if (L === 0) {
        div.innerHTML = `x[${realIdx}]\n${a.toFixed(3)}`;
    } else if (L === 3) {
        const w = word || vocabulary_h[i] || "--";
        const prob = p !== null ? (p*100).toFixed(1) : "--";
        const zVal = Number.isFinite(z) ? z.toFixed(3) : "--";
        div.innerHTML = `
            <div style="text-align:center; font-size:0.9rem;">
                <span style="color:#b44fff; font-weight:800; text-shadow:0 0 15px #b44fff;">
                    ${w}
                </span>
                <br>
                <span style="color:#00ffff; font-size:0.7rem; font-weight:600;">
                    ${prob}%
                </span>
                <br>
                <span style="color:#888; font-size:0.65rem;">
                    (z=${zVal})
                </span>
            </div>
        `;
    } else {
        div.innerHTML = `z=${z.toFixed(2)}\na=${a.toFixed(3)}\n<span style="color:${a>0?'#00ff88':'#ff3344'}; font-weight:bold;">${a>0?'FIRES✓':'DEAD✗'}</span>`;
    }
}

function updateHubNarrator(what, why) {
    document.getElementById('hub-edu-what-text').innerText = what;
    document.getElementById('hub-edu-why-text').innerText = why;
}

function buildForwardMathHTMLHub(L, i, rI, z, a, w0, w1, a0, a1, b) {
    if (L === 0) {
        return `
            <div style="color:#00ffff; font-size:0.7rem; margin-bottom:4px">📍 INPUT NEURON ${i}</div>
            <div style="margin-bottom:6px">
                <div style="color:#aaa; font-size:0.65rem">VECTOR COMPONENT:</div>
                <div style="font-family:monospace; font-size:0.85rem">
                    x[${rI}] = <span style="color:#00ffff">${a.toFixed(4)}</span>
                </div>
            </div>
            <div style="background:rgba(0,255,255,0.05); padding:4px; border-radius:4px; font-size:0.7rem;">
                <span style="color:#aaa">SOURCE:</span> This value was retrieved from the Embedding Matrix in Phase 6. It represents one semantic feature of the input sentence.
            </div>
        `;
    }
    return `
        <div style="color:#00d4ff; font-size:0.7rem; margin-bottom:4px">📍 NEURON ${i} (Internal #${rI})</div>
        <div style="margin-bottom:6px">
          <div style="color:#aaa; font-size:0.65rem">HOW IT CALCULATES:</div>
          <div style="font-family:monospace; font-size:0.75rem">
            (w1 * a1) + (w2 * a2) + ... + bias<br>
            (${w0.toFixed(3)} * ${a0.toFixed(3)}) + ... + ${b.toFixed(3)}<br>
            Total Sum = <span style="color:#ffcc00">${z.toFixed(4)}</span>
          </div>
        </div>
        <div style="background:rgba(255,255,255,0.05); padding:4px; border-radius:4px; font-size:0.7rem;">
          <span style="color:#aaa">SIMPLE ENGLISH:</span> This neuron checks if the current word features match its specific pattern. If the sum is positive, it says "I found it!" and fires.
        </div>
    `;
}

function createSignalPulseHub(from, to, color) {
    const colorObj = new THREE.Color(color);
    // Main bright data packet
    const pGeo = new THREE.SphereGeometry(0.12, 12, 12);
    const pMat = new THREE.MeshBasicMaterial({ color: colorObj, transparent: true, opacity: 1.0, blending: THREE.AdditiveBlending, depthWrite: false });
    const p = new THREE.Mesh(pGeo, pMat);
    p.position.copy(from.position);
    scene_h.add(p);
    // Glow halo trail
    const gGeo = new THREE.SphereGeometry(0.28, 12, 12);
    const gMat = new THREE.MeshBasicMaterial({ color: colorObj, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false });
    const g = new THREE.Mesh(gGeo, gMat);
    g.position.copy(from.position);
    scene_h.add(g);
    // Speed control respected via GSAP global timeline
    const dur = 0.34;
    gsap.to(p.position, { x: to.position.x, y: to.position.y, z: to.position.z, duration: dur, ease: "power1.inOut", onComplete: () => { scene_h.remove(p); pGeo.dispose(); pMat.dispose(); } });
    gsap.to(g.position, { x: to.position.x, y: to.position.y, z: to.position.z, duration: dur, ease: "power1.inOut", onComplete: () => { scene_h.remove(g); gGeo.dispose(); gMat.dispose(); } });
    gsap.to(pMat, { opacity: 0.0, duration: dur, ease: "sine.in" });
    gsap.to(gMat, { opacity: 0.0, duration: dur * 1.2, ease: "sine.in" });
    // Scale down as it travels
    gsap.to(p.scale, { x: 0.3, y: 0.3, z: 0.3, duration: dur, ease: "power1.in" });
    gsap.to(g.scale, { x: 0.4, y: 0.4, z: 0.4, duration: dur, ease: "power1.in" });
}

async function runForwardPassHub() {
    if (masterTimeline_h && masterTimeline_h.isActive()) return;
    const btnP = document.getElementById('hub-btn-predict');
    const btnB = document.getElementById('hub-btn-backprop');
    btnP.disabled = btnB.disabled = true;

    const data = getInputDataHub();
    const currentSentence = (data.sentence || "").trim().toLowerCase();
    if (currentSentence !== lastAdaptSentence_h) {
        await adaptToInputHub(data.sentence);
    }
    let inputVec = data.type === 'vector' ? data.data.slice(0, 512) : sentenceToBPEVectorHub(data.sentence, 512);
    while(inputVec.length < 512) inputVec.push(0);

    // Nudge weights toward semantic ground truth before this forward — keeps output aligned with pinned vocabulary after learning.
    runSemanticMicroTrainHub(inputVec, 14, 0.09);

    const { activations, zValues } = nn_h.forward(inputVec);
    cachedActivations_h = activations;
    
    const outputActivations = Array.from(activations[activations.length - 1]);
    const outputZ = zValues[zValues.length - 1];
    let maxIdx = 0;
    let maxValue = outputActivations[0];
    for (let i = 1; i < outputActivations.length; i++) {
        if (outputActivations[i] > maxValue) {
            maxValue = outputActivations[i];
            maxIdx = i;
        }
    }
    lastPredictionIdx_h = maxIdx;
    const softmaxProbs = computeSoftmax(outputActivations);

    currentCost_h = -Math.log((outputActivations[desiredWordIdx_h] || 1e-10) + 1e-10);

    masterTimeline_h = gsap.timeline({ onComplete: () => {
        document.getElementById('hub-predicted-token').innerText = vocabulary_h[maxIdx] || "--";
        btnP.disabled = btnB.disabled = false;
        const targetWord = vocabulary_h[desiredWordIdx_h] || "--";
        updateHubNarrator(
            "Prediction Ready!",
            `Predicted "${vocabulary_h[maxIdx] || "--"}". Training target is "${targetWord}". Backprop now updates weights to move prediction toward target.`
        );
        document.getElementById('hub-panel-math').querySelector('.hub-math-content').innerHTML = `
            <div style="font-weight:bold; color:#00ff88; margin-bottom:5px;">RESULT:</div>
            The AI predicts: <span style="color:#b44fff; font-size:1.2rem;">${vocabulary_h[maxIdx]}</span><br>
            Target word: <span style="color:#00ffff; font-size:1.0rem;">${targetWord}</span><br>
            Error (Loss): ${currentCost_h.toFixed(4)}<br><br>
            <div style="font-size:0.7rem; color:#aaa;">Lower loss means higher accuracy. We want the loss to be zero!</div>
        `;
    }});

    // Immediately set camera to wide view for the entire forward pass
    masterTimeline_h.to(camera_h.position, {x: 0, y: 0, z: 42, duration: 1.2, ease: "power2.inOut"}, 0);
    masterTimeline_h.to(orbit_h.target, {x: 0, y: 0, z: 0, duration: 1.2, ease: "power2.inOut"}, 0);

    // ── NEW: Quick direct prediction from Browser AI API ──
    if (typeof BrowserAI !== 'undefined') {
        try {
            const direct = await BrowserAI.predictSingle(data.sentence);
            if (direct && direct.word) {
                const srcTag = direct.source === 'chrome-ai' ? '[Chrome AI]' : '[Local N-Gram]';
                document.getElementById('hub-predicted-token').innerText = direct.word + ' ' + srcTag;
            }
        } catch(e) { /* silent — the animated timeline below is the main event */ }
    }

    // Sequence Step 1: Input Layer (Now animated with pulses!)
    for(let i=0; i<visArch_h[0]; i++) {
        const realIdx = Math.floor(i * ratios_h[0]);
        masterTimeline_h.add(animateSingleNeuronHub({
            L: 0, i, rI: realIdx, z: 0, a: activations[0][realIdx], inA: null, b: 0
        }), i === 0 ? 0 : "-=0.85"); // Overlap for snappiness
    }

    // Sequence Step 2: Hidden Layers
    for (let L = 1; L < 3; L++) {
        for (let j = 0; j < visArch_h[L]; j++) {
            const realJ = Math.floor(j * ratios_h[L]);
            masterTimeline_h.add(animateSingleNeuronHub({
                L, i: j, rI: realJ, z: zValues[L][realJ], a: activations[L][realJ], inA: activations[L-1], b: nn_h.biases[L-1][realJ]
            }), j === 0 ? "+=0.2" : "-=0.85");
        }
    }

    // Sequence Step 3: Output (Frontal Wide View)
    masterTimeline_h.add(() => {
        updateHubNarrator("Step 3: Calculating Probabilities", "Finally, the AI looks at the results and assigns a percentage to each possible word.");
        // Change to frontal wide view instead of side view
        gsap.to(camera_h.position, {x: 0, y: 0, z: 42, duration: 1.5, ease: "power2.inOut"});
        gsap.to(orbit_h.target, {x: 0, y: 0, z: 0, duration: 1.5, ease: "power2.inOut"});
        for(let i=0; i<visArch_h[3]; i++) {
            updateNodeLabelHub(3, i, outputZ[i], outputActivations[i], softmaxProbs[i], vocabulary_h[i]);
            htmlLabels_h[3][i].style.opacity = 1;
            if(i === maxIdx) {
                gsap.to(visualNodes_h[3][i].material, {emissiveIntensity: 2.0, duration: 0.5, yoyo: true, repeat: 3});
                visualHalos_h[3][i].material.opacity = 0.8;
            }
            if (i === desiredWordIdx_h) {
                gsap.to(visualNodes_h[3][i].material, { emissiveIntensity: 1.6, duration: 0.35, yoyo: true, repeat: 2 });
            }
        }
    });
    // Ensure final state is a stable wide view
    masterTimeline_h.to(camera_h.position, {x:0, y:0, z:40, duration: 1.2, ease: "power2.inOut"}, "+=1.5");
}

function animateSingleNeuronHub({ L, i, rI, z, a, inA, b }) {
    const tl = gsap.timeline();
    const pos = visualNodes_h[L][i].position;
    tl.add(() => {
        visualNodes_h[L][i]._isAnimating = true;
        htmlLabels_h[L][i].style.opacity = 1;
        // Keep panels stable during wide-view processing
        gsap.to([document.getElementById('hub-panel-narrator'), document.getElementById('hub-panel-math')], { y: 10, duration: 0.3 });
    });
    
    // REMOVED: Per-neuron camera zoom to maintain wide overview as requested.
    // We stay at the frontal wide view set by runForwardPassHub.

    tl.add(() => {
        let w0=0, w1=0, a0=0, a1=0;
        if (L > 0) {
            w0 = nn_h.weights[L-1][rI][Math.floor(0 * ratios_h[L-1])];
            w1 = nn_h.weights[L-1][rI][Math.floor(1 * ratios_h[L-1])];
            a0 = inA[0];
            a1 = inA[1];
        }
        document.getElementById('hub-math-content').innerHTML = buildForwardMathHTMLHub(L, i, rI, z, a, w0, w1, a0, a1, b);
        
        if (L === 0) {
            updateHubNarrator(`Input Neuron ${i}`, `This node holds the value ${a.toFixed(3)} from the BPE embedding vector.`);
        } else {
            updateHubNarrator(`Layer ${L} · Neuron ${i}`, a>0?`This neuron detected a pattern! It multiplies the input by its "weights" and passes the signal.`:`This neuron didn't see what it was looking for. Its signal stays at zero.`);
        }
    });
    tl.add(() => {
        const node = visualNodes_h[L][i];
        if (L === 0 || a > 0) {
            node.material.emissive.setHex(layerColorsHex_h[L]);
            // Bright flash burst
            gsap.to(node.material, { emissiveIntensity: 3.5, duration: 0.14, ease: "power2.out", yoyo: true, repeat: 1 });
            // Dramatic scale pop
            gsap.to(node.scale, { x: 1.35, y: 1.35, z: 1.35, duration: 0.14, ease: "back.out(1.7)", yoyo: true, repeat: 1 });
            // Core glow burst
            if (node.children[1]) {
                gsap.to(node.children[1].material, { opacity: 0.9, duration: 0.12, ease: "power2.out", yoyo: true, repeat: 1 });
            }
            // Halo flare
            gsap.to(visualHalos_h[L][i].material, { opacity: 0.75, duration: 0.18, ease: "power2.out", yoyo: true, repeat: 1 });
            // Ring speed burst
            const ring = node.children[0];
            if (ring) {
                gsap.to(ring.rotation, { z: ring.rotation.z + Math.PI, duration: 0.4, ease: "power2.out" });
            }
            animateOutgoingConnectionsHub(L, i, a);
            if (L < visArch_h.length - 1) {
                for(let k=0; k<visArch_h[L+1]; k++) {
                    setTimeout(() => createSignalPulseHub(visualNodes_h[L][i], visualNodes_h[L+1][k], layerColorsHex_h[L]), k*22);
                }
            }
        } else {
            // Dead neuron — dim red flicker
            node.material.emissive.setHex(0x550000);
            gsap.to(node.material, { emissiveIntensity: 0.6, duration: 0.15, yoyo: true, repeat: 1 });
            gsap.to(node.scale, { x: 0.92, y: 0.92, z: 0.92, duration: 0.12, yoyo: true, repeat: 1 });
        }
        updateNodeLabelHub(L, i, z, a);
    });
    tl.add(() => {
        gsap.to([document.getElementById('hub-panel-narrator'), document.getElementById('hub-panel-math')], { y: 0, duration: 0.4 });
    }, "+=0.6");
    tl.to({}, { duration: 0.8 });
    tl.add(() => {
        const node = visualNodes_h[L][i];
        node._isAnimating = false;
        node.material.emissive.setHex(0x0a4a5a);
        node.material.emissiveIntensity = 0.65;
        node.scale.setScalar(1);
        if (node.children[1]) node.children[1].material.opacity = 0.35;
        visualHalos_h[L][i].material.opacity = 0.12;
    });
    return tl;
}

async function runBackpropHub() {
    if (masterTimeline_h && masterTimeline_h.isActive()) return;
    const btnB = document.getElementById('hub-btn-backprop');
    const btnP = document.getElementById('hub-btn-predict');
    btnB.disabled = true;
    btnP.disabled = true;

    const data = getInputDataHub();
    let inputVec = data.type === 'vector' ? data.data.slice(0, 512) : sentenceToBPEVectorHub(data.sentence, 512);
    while (inputVec.length < 512) inputVec.push(0);

    const target = [0,0,0,0];
    target[desiredWordIdx_h] = 1;

    let gradientLog = null;
    const lrTrain = 0.11;
    for (let r = 0; r < 6; r++) {
        nn_h.forward(inputVec);
        gradientLog = nn_h.backward(target, lrTrain);
    }
    if (!gradientLog) gradientLog = [];

    masterTimeline_h = gsap.timeline({ onComplete: () => {
        epochCount_h++; document.getElementById('hub-epoch-counter').innerText = `Epoch: ${epochCount_h}`;
        document.getElementById('hub-btn-predict').disabled = btnB.disabled = false;
        const prevWord = vocabulary_h[lastPredictionIdx_h] || "--";
        const targetWord = vocabulary_h[desiredWordIdx_h] || "--";
        updateHubNarrator(
            "Learning Complete!",
            `Weights updated from target "${targetWord}". Run Predict again to verify prediction shifts away from "${prevWord}" toward target context.`
        );
        for(let L=1; L<visArch_h.length; L++) {
            for(let i=0; i<visArch_h[L]; i++) {
                updateEdgeColorsHub(L, i);
            }
        }
    }});

    // Sequence Step 1: Broad Overview of Model for Backprop
    masterTimeline_h.add(() => {
        updateHubNarrator("Step 4: Fixing Mistakes", "The AI compares its prediction to the real answer. It now sends a signal BACKWARD to fix its internal 'weights'.");
        for(let i=0; i<4; i++) {
            visualNodes_h[3][i].material.emissive.setHex(0xff1111);
            gsap.to(visualNodes_h[3][i].material, {emissiveIntensity: 1.5, duration:0.5});
        }
        // Wide Frontal View
        gsap.to(camera_h.position, {x: 0, y: 0, z: 42, duration: 1.5, ease: "power2.inOut"});
        gsap.to(orbit_h.target, {x: 0, y: 0, z: 0, duration: 1.5, ease: "power2.inOut"});
    });

    // Animate BACKWARD from Output (3) down to Input-to-Hidden (1)
    for (let L = 3; L > 0; L--) {
        const layerGrads = gradientLog[L-1];
        // Create a sub-timeline for the whole layer to happen simultaneously
        const layerTL = gsap.timeline();
        
        for (let j = 0; j < visArch_h[L]; j++) {
            const realJ = Math.floor(j * ratios_h[L]);
            const gradData = layerGrads[realJ];
            
            // Reconstruct old weight for the ticker animation: w_old = w_new + (lr * grad)
            const wNew = nn_h.weights[L-1][realJ][0];
            const wOld = wNew + (lrTrain * gradData.weightGrads[0]);

            // Add each neuron animation with a tiny stagger (0.08s) to feel "simultaneous" yet clean
            layerTL.add(animateSingleNeuronBackpropHub({ 
                L, 
                i: j, 
                rI: realJ, 
                d: gradData.delta,
                wOld,
                wNew,
                wGrad: gradData.weightGrads[0],
                lr: lrTrain
            }), j * 0.08);
        }
        masterTimeline_h.add(layerTL);
    }

    // Step 5: Final Highlight on Input Layer
    masterTimeline_h.add(() => {
        updateHubNarrator("Input Layer Adjusted", "Even the first connections from the input vector are tuned to improve feature detection.");
        for(let i=0; i<visArch_h[0]; i++) {
            visualNodes_h[0][i].material.emissive.setHex(0x00ff88);
            gsap.to(visualNodes_h[0][i].material, {emissiveIntensity: 2.0, duration: 0.5, yoyo:true, repeat:1});
            // Show input weights too
            htmlLabels_h[0][i].innerHTML = `<span style="color:#00ff88">w: ${nn_h.weights[0][0][Math.floor(i * ratios_h[0])].toFixed(4)}</span>`;
            htmlLabels_h[0][i].style.opacity = 1;
        }
    }, "+=0.5");

    masterTimeline_h.to(camera_h.position, {x: 0, y: 0, z: 40, duration: 1.5, ease: "power2.inOut"});
}

function animateSingleNeuronBackpropHub({ L, i, rI, d, wOld, wNew, wGrad, lr }) {
    const tl = gsap.timeline();
    const pos = visualNodes_h[L][i].position;
    tl.add(() => {
        visualNodes_h[L][i]._isAnimating = true;
        // Subtle camera nudge per layer, not per neuron
        if (i === 0) {
           gsap.to(camera_h.position, { x: pos.x * 0.1, y: pos.y * 0.1, z: 42, duration: 0.8, ease: "power2.inOut" });
        }
    });

    tl.add(() => {
        // Label now shows the NEW calculated weight prominently as per user request
        htmlLabels_h[L][i].innerHTML = `<div style="text-align:center; color:#ff3344;">\u03b4=${d.toFixed(3)}<br><span style="color:#00ff88; font-weight:bold; font-size:0.75rem;">w_new: ${wNew.toFixed(4)}</span></div>`;
        htmlLabels_h[L][i].style.opacity = 1;

        visualNodes_h[L][i].material.emissive.setHex(0xff1111);
        visualNodes_h[L][i].material.emissiveIntensity = 2.0;

        document.getElementById('hub-math-content').innerHTML = `
            <div style="color:#ff3344; font-weight:bold;">NEURON ${i} UPDATED</div>
            <div style="font-size:0.65rem; color:#aaa; margin-top:5px;">REAL ALGO: Gradient Descent</div>
            w_new = w_old - (\u03b7 * \u2202C/\u2202w)<br>
            ${wNew.toFixed(6)} = ${wOld.toFixed(6)} - (${(lr ?? 0.05).toFixed(3)} * ${wGrad.toFixed(6)})<br><br>
            <div style="background:rgba(0,255,136,0.1); border-left: 2px solid #00ff88; padding:5px; border-radius:4px; font-size:0.7rem;">
                <span style="color:#00ff88">NEW KNOWLEDGE:</span> The connection strength has been re-assigned to minimize future prediction error.
            </div>
        `;

        const inEdges = visualEdges_h[L-1][i];
        inEdges.forEach((edge, idx) => {
            gsap.to(edge.material.color, { r: 1, g: 0.1, b: 0.1, duration: 0.15, delay: (idx % 10) * 0.01 });
            gsap.to(edge.material, { opacity: 0.85, duration: 0.15, delay: (idx % 10) * 0.01 });
        });

        animateWeightTickerHub(L, i, wOld, wNew);
        updateHubNarrator(`Layer ${L} Updating`, `All ${visArch_h[L]} neurons in this layer are re-calculating weights simultaneously.`);
    });
    tl.add(() => { visualNodes_h[L][i]._isAnimating = false; }, "+=1.2");
    return tl;
}

function animateWeightTickerHub(L, i, wOld, wNew) {
    const ticker = document.createElement('div');
    ticker.style.cssText = `
        position: absolute;
        background: rgba(0,0,0,0.9);
        border: 1px solid #ff3366;
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-family: 'Space Mono', monospace;
        font-size: 0.75rem;
        z-index: 1000;
        pointer-events: none;
        transform: translate(-50%, -50%);
        box-shadow: 0 0 15px rgba(255,51,102,0.5);
    `;
    document.getElementById('hub-labels-container').appendChild(ticker);

    const pos = visualNodes_h[L][i].position.clone();
    pos.x -= 2; pos.y += 1;
    pos.project(camera_h);
    ticker.style.left = `${(pos.x * 0.5 + 0.5) * window.innerWidth}px`;
    ticker.style.top = `${(pos.y * -0.5 + 0.5) * window.innerHeight}px`;

    let obj = { val: wOld };
    gsap.to(obj, {
        val: wNew,
        duration: 0.8,
        ease: "power1.inOut",
        onUpdate: () => {
            ticker.innerHTML = `w: <span style="color:#ff3366">${obj.val.toFixed(5)}</span>`;
        },
        onComplete: () => {
            ticker.style.borderColor = '#00ff88';
            ticker.innerHTML = `w: <span style="color:#00ff88">${wNew.toFixed(5)} ✓</span>`;
            gsap.to(ticker, { opacity: 0, y: -20, duration: 0.5, delay: 0.8, onComplete: () => ticker.remove() });
        }
    });
}

function buildBackpropMathHTMLHub(L, i, rI, delta, wOld, wNew, wGrad, lr) {
    return `
        <div style="color:#ff3344; font-size:0.7rem; margin-bottom:4px">⬅ BACKPROP NEURON ${i}</div>
        <div style="font-family:monospace; font-size:0.65rem; line-height:1.2">
            Local Gradient (\u03b4): ${delta.toFixed(6)}<br>
            Weight Gradient: ${wGrad.toFixed(6)}<br>
            New Weight = w_old - (lr * w_grad)<br>
            ${wNew.toFixed(5)} = ${wOld.toFixed(5)} - (${lr} * ${wGrad.toFixed(5)})
        </div>
        <div style="background:rgba(255,51,68,0.1); padding:4px; border-radius:4px; font-size:0.65rem; margin-top:5px;">
            <span style="color:#ffcc00">AI CALCULUS:</span> The AI is using the chain rule to find which neurons caused the mistake, then nudging their weights in the opposite direction.
        </div>
    `;
}

function animateHub() {
    requestAnimationFrame(animateHub);
    if (orbit_h) orbit_h.update();
    updateHubLabelsPos();

    // Idle node pulsing for a living neural-network feel
    const time = Date.now() * 0.002;
    for (let L = 0; L < visArch_h.length; L++) {
        for (let i = 0; i < visArch_h[L]; i++) {
            if (!visualNodes_h[L][i]._isAnimating) {
                const node = visualNodes_h[L][i];
                const pulse = 0.35 + 0.25 * Math.sin(time + L * 1.5 + i * 0.8);
                node.material.emissiveIntensity = pulse;
                node.scale.setScalar(1 + 0.03 * Math.sin(time * 0.8 + i * 0.35 + L));
                // Core glow pulse
                if (node.children[1]) {
                    node.children[1].material.opacity = 0.25 + 0.2 * Math.abs(Math.sin(time * 1.5 + i * 0.6));
                }
                // Halo breathe
                visualHalos_h[L][i].material.opacity = 0.1 + 0.1 * Math.abs(Math.sin(time * 1.2 + i * 0.5));
                // Ring spin with individual speeds
                const ring = node.children[0];
                if (ring && ring.userData.spinSpeed) {
                    ring.rotation.z += ring.userData.spinSpeed * 0.012;
                    ring.rotation.x += 0.003;
                }
            }
        }
    }

    // Subtle edge idle shimmer — data always flows in a living brain
    for (let L = 0; L < visualEdges_h.length; L++) {
        for (let j = 0; j < visualEdges_h[L].length; j++) {
            for (let k = 0; k < visualEdges_h[L][j].length; k++) {
                const edge = visualEdges_h[L][j][k];
                if (edge && edge.material) {
                    const shimmer = edge.userData.baseOpacity * (0.85 + 0.15 * Math.sin(time * 2 + L + j * 0.3 + k * 0.1));
                    edge.material.opacity = shimmer;
                }
            }
        }
    }

    if (renderer_h && scene_h) renderer_h.render(scene_h, camera_h);
}

function debounceHub(f, w) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => f(...a), w); }; }

function getInputDataHub() {
    const input = document.getElementById('hub-sentence-input');
    const typed = input ? input.value : "";
    try {
        // PRIORITY 1: bpe_data from Phase 5
        const bpe = localStorage.getItem('bpe_data');
        if (bpe) {
            const p = JSON.parse(bpe);
            if (p.sentence) return { type: 'sentence', data: p.sentence, sentence: p.sentence };
        }
        // PRIORITY 2: tokenPhaseData (legacy)
        const stored = localStorage.getItem('tokenPhaseData');
        if (stored) {
            const p = JSON.parse(stored);
            if (p.sentence) return { type: 'sentence', data: p.sentence, sentence: p.sentence };
        }
    } catch(e) {}
    return { type: 'sentence', data: typed || "Artificial intelligence is the", sentence: typed || "Artificial intelligence is the" };
}

function sentenceToBPEVectorHub(s, sz) {
    let seed = 0; for (let i = 0; i < s.length; i++) seed = (seed * 31 + s.charCodeAt(i)) >>> 0;
    const v = []; let st = seed;
    for (let i = 0; i < sz; i++) { st = (1664525 * st + 1013904223) >>> 0; v.push((st / 0xFFFFFFFF) * 2 - 1); }
    return v;
}

function computeSoftmax(arr) {
    const max = Math.max(...arr);
    const exps = arr.map(x => Math.exp(x - max));
    const sum = exps.reduce((a, b) => a + b, 0) || 1;
    return exps.map(x => x / sum);
}

function extractMainSubject(sentence) {
    const s = sentence.toLowerCase().trim();
    const colorOfMatch =
        s.match(/\bcolou?rs?\s+of\s+(?:the\s+)?([a-z]+)/) ||
        s.match(/\bcolors?\s+of\s+(?:the\s+)?([a-z]+)/);
    if (colorOfMatch && colorOfMatch[1]) return colorOfMatch[1];
    if (/^\s*i\s+am\b/.test(s)) return "human";

    const stopwords = new Set([
        "the", "a", "an", "is", "are", "was", "were", "be", "been",
        "have", "has", "do", "does", "did", "will", "would", "could",
        "should", "may", "might", "must", "can", "i", "you", "he", "she",
        "it", "we", "they", "what", "which", "who", "when", "where", "why", "how"
    ]);
    const words = sentence.toLowerCase().split(/\s+/)
        .map(w => w.replace(/[^a-z]/g, ""))
        .filter(Boolean)
        .filter(w => !stopwords.has(w));
    return words[words.length - 1] || words[0] || "default";
}

function analyzeSentiment(sentence) {
    const s = sentence.toLowerCase();
    const positive = ["love", "like", "beautiful", "good", "great", "nice", "happy", "amazing"];
    const negative = ["hate", "bad", "ugly", "terrible", "sad", "angry", "awful"];
    const question = s.includes("?");
    const imperative = /^(tell|show|find|give|make)/i.test(s);

    let sentiment = "neutral";
    if (positive.some(w => s.includes(w))) sentiment = "positive";
    if (negative.some(w => s.includes(w))) sentiment = "negative";
    return { sentiment, question, imperative };
}

function detectGrammarProfile(sentence) {
    const s = sentence.toLowerCase().trim();
    const words = s.split(/\s+/).filter(Boolean);
    const last = words[words.length - 1] || "";
    const prev = words[words.length - 2] || "";
    const lastClean = last.replace(/[^a-z]/g, "");
    const prevClean = prev.replace(/[^a-z]/g, "");

    const copulas = new Set(["is", "are", "was", "were", "am"]);
    const articles = new Set(["a", "an", "the"]);

    return {
        expectsAdjective: copulas.has(lastClean),
        expectsNoun: articles.has(lastClean) || copulas.has(prevClean),
        isIdentityStatement: /^\s*i\s+am\b/.test(s),
        isQuestion: s.includes("?") || /^(what|who|where|when|why|how)\b/.test(s),
        subjectLikelyPlural: /\b\w+s\s+(are|were)\b/.test(s)
    };
}

function detectDomain(sentence) {
    const s = sentence.toLowerCase();
    const domains = {
        food: ["apple", "wine", "bread", "rice", "meat", "fruit", "vegetable", "drink", "eat", "taste"],
        animals: ["dog", "cat", "bird", "fish", "lion", "elephant", "horse", "cow"],
        color: ["red", "blue", "green", "yellow", "black", "white", "purple", "orange", "color", "colour", "blood"],
        place: ["mountain", "river", "city", "beach", "forest", "hill", "valley", "lake"],
        person: ["man", "woman", "boy", "girl", "person", "human", "people"],
        emotion: ["love", "hate", "angry", "sad", "happy", "afraid", "excited", "bored"],
        action: ["run", "walk", "jump", "fly", "swim", "dance", "sing", "play", "work"]
    };

    const detected = [];
    for (const [domain, keywords] of Object.entries(domains)) {
        if (keywords.some(kw => s.includes(kw))) detected.push(domain);
    }
    return detected.length > 0 ? detected : ["general"];
}

function extractContentTerms(sentence) {
    const stopwords = new Set([
        "the", "a", "an", "is", "are", "was", "were", "be", "been", "to", "of", "in", "on", "at", "for", "with",
        "i", "you", "he", "she", "it", "we", "they", "what", "which", "who", "when", "where", "why", "how"
    ]);
    return sentence.toLowerCase().split(/\s+/)
        .map(w => w.replace(/[^a-z]/g, ""))
        .filter(Boolean)
        .filter(w => !stopwords.has(w))
        .slice(0, 5);
}

function detectColorEntity(sentence, mainSubject) {
    const s = sentence.toLowerCase();
    let m = s.match(/\bcolou?rs?\s+of\s+(?:the\s+)?([a-z]+)/);
    if (!m) m = s.match(/\bcolors?\s+of\s+(?:the\s+)?([a-z]+)/);
    if (m && m[1]) return m[1];
    m = s.match(/\bcolou?rs?\s+(?:is|was|are)\s+(?:the\s+|a\s+|an\s+)?([a-z]+)/);
    if (m && m[1]) return m[1];
    const mTail = s.match(/\b(of|for)\s+([a-z]+)\s*[?.!]?\s*$/);
    if (/\b(colou?r|colou?rs|colors?|hue|shade)\b/.test(s) && mTail && mTail[2]) return mTail[2];
    return mainSubject || "object";
}

function inferEntityClass(entity, sentence) {
    const e = (entity || "").toLowerCase();
    const s = sentence.toLowerCase();
    const classes = {
        vegetation: ["tree", "trees", "leaf", "leaves", "grass", "forest", "plant", "plants"],
        sky: ["sky", "cloud", "clouds", "sun", "moon"],
        water: ["sea", "ocean", "river", "lake", "water"],
        blood: ["blood", "vein", "heart"],
        earth: ["soil", "mud", "rock", "mountain", "mountains", "stone"],
        fruit: ["apple", "banana", "orange", "grape", "berry", "fruit"],
        animal: ["dog", "cat", "bird", "fish", "horse", "lion", "elephant"]
    };
    for (const [cls, words] of Object.entries(classes)) {
        if (words.includes(e)) return cls;
        if (words.some(w => s.includes(w))) return cls;
    }
    return "generic";
}

function getColorPaletteForClass(entityClass) {
    const palettes = {
        vegetation: ["green", "brown", "olive", "emerald"],
        sky: ["blue", "white", "gray", "orange"],
        water: ["blue", "cyan", "teal", "green"],
        blood: ["red", "crimson", "scarlet", "maroon"],
        earth: ["brown", "gray", "green", "black"],
        fruit: ["red", "yellow", "orange", "green"],
        animal: ["brown", "black", "white", "gray"],
        generic: ["red", "blue", "green", "white"]
    };
    return palettes[entityClass] || palettes.generic;
}

/** When user asks colour of X, pin output layer tokens to factual palette order (fixes API noise vs whole sentence). */
function buildLockedColorVocabulary(analysis) {
    if (!analysis.colorIntent) return null;
    const entity = detectColorEntity(analysis.fullSentence, analysis.mainSubject);
    const cls = inferEntityClass(entity, analysis.fullSentence);
    const palette = getColorPaletteForClass(cls);
    if (!palette || palette.length < 4) return null;
    return palette.slice(0, 4).map((word, i) => ({
        word,
        confidence: Math.max(0.58, 0.99 - i * 0.11)
    }));
}

function runSemanticMicroTrainHub(inputVec, steps, lr) {
    const target = [0, 0, 0, 0];
    target[desiredWordIdx_h] = 1;
    for (let i = 0; i < steps; i++) {
        nn_h.forward(inputVec);
        nn_h.backward(target, lr);
    }
}

async function fetchContextualCandidates(analysis) {
    const subject = analysis.mainSubject;
    const urls = [];
    const focus = analysis.focusTerm || subject;
    const whole = encodeURIComponent(analysis.fullSentence || "");
    const terms = extractContentTerms(analysis.fullSentence || "");

    urls.push(`https://api.datamuse.com/words?ml=${whole}&max=40&md=pf`);
    urls.push(`https://api.datamuse.com/words?rel_trg=${focus}&max=40&md=pf`);

    if (analysis.colorIntent) {
        const colorEntity = detectColorEntity(analysis.fullSentence, analysis.mainSubject);
        urls.push(`https://api.datamuse.com/words?rel_jjb=${colorEntity}&max=40&md=pf`);
        urls.push(`https://api.datamuse.com/words?ml=${encodeURIComponent(`${colorEntity} color`) }&max=30&md=pf`);
    } else if (analysis.endsWithVerb) {
        urls.push(`https://api.datamuse.com/words?rel_jjb=${focus}&max=40&md=pf`);
        urls.push(`https://api.datamuse.com/words?ml=${focus}&max=40&md=pf`);
    } else if (analysis.sentiment.question) {
        urls.push(`https://api.datamuse.com/words?ml=${focus}&max=40&md=pf`);
        urls.push(`https://api.datamuse.com/words?lc=${focus}&max=40&md=pf`);
    } else {
        urls.push(`https://api.datamuse.com/words?lc=${focus}&max=40&md=pf`);
        urls.push(`https://api.datamuse.com/words?ml=${focus}&max=40&md=pf`);
    }

    terms.forEach(term => {
        urls.push(`https://api.datamuse.com/words?ml=${term}&max=20&md=pf`);
        urls.push(`https://api.datamuse.com/words?rel_trg=${term}&max=20&md=pf`);
        if (analysis.endsWithVerb || analysis.colorIntent) {
            urls.push(`https://api.datamuse.com/words?rel_jjb=${term}&max=20&md=pf`);
        }
    });

    const uniqueUrls = Array.from(new Set(urls)).slice(0, 16);

    const results = await Promise.all(
        uniqueUrls.map(url => fetch(url).then(r => r.json()).catch(() => []))
    );

    const allCandidates = [];
    results.forEach(list => {
        if (Array.isArray(list)) allCandidates.push(...list);
    });
    return allCandidates;
}

function getUniversalIntentPriors(analysis) {
    const s = analysis.fullSentence;
    const priors = [];
    const colorIntent = analysis.colorIntent;
    const natureIntent = /\b(nature|forest|mountain|mountains|river|trees?|earth|environment)\b/.test(s);
    const sentimentIntent = /\b(feel|feeling|emotion|mood|happy|sad|angry|love|hate|peaceful)\b/.test(s);

    if (colorIntent) {
        const entity = detectColorEntity(s, analysis.mainSubject);
        const entityClass = inferEntityClass(entity, s);
        const colors = getColorPaletteForClass(entityClass);
        colors.forEach((w, i) => priors.push({ word: w, confidence: Math.max(0.65, 0.95 - i * 0.07) }));
    }

    if (natureIntent) {
        priors.push(
            { word: "nature", confidence: 0.90 },
            { word: "peaceful", confidence: 0.84 },
            { word: "beautiful", confidence: 0.82 },
            { word: "natural", confidence: 0.80 }
        );
    }

    if (sentimentIntent) {
        priors.push(
            { word: "happy", confidence: 0.83 },
            { word: "calm", confidence: 0.80 },
            { word: "sad", confidence: 0.74 },
            { word: "angry", confidence: 0.72 }
        );
    }
    return priors;
}

function getKnowledgePriorCandidates(analysis) {
    const s = analysis.fullSentence;
    const asksForColor = /\b(colou?rs?|colors?|shade|hue)\b/.test(s);
    const mentionsBlood = /\bblood\b/.test(s);
    const priors = [];
    const hasNatureIntent = /\b(nature|forest|river|mountain|mountains|earth|environment)\b/.test(s);
    const hasSentimentIntent = /\b(feel|feeling|emotion|mood|happy|sad|angry|peaceful|love|hate)\b/.test(s);

    // Factual prior: blood color query should rank red first.
    if (asksForColor && mentionsBlood) {
        priors.push(
            { word: "red", confidence: 0.99 },
            { word: "crimson", confidence: 0.84 },
            { word: "scarlet", confidence: 0.78 },
            { word: "maroon", confidence: 0.72 }
        );
    }

    // Identity / existence prior: "I am ..." should stay in living-being context.
    if (/^\s*i\s+am\b/.test(s)) {
        priors.push(
            { word: "human", confidence: 0.96 },
            { word: "person", confidence: 0.86 },
            { word: "being", confidence: 0.80 },
            { word: "living", confidence: 0.74 }
        );
    }

    if (/\bmountain(s)?\s+(are|were)\b/.test(s)) {
        priors.push(
            { word: "beautiful", confidence: 0.99 },
            { word: "peaceful", confidence: 0.92 },
            { word: "natural", confidence: 0.86 },
            { word: "soulful", confidence: 0.80 }
        );
    }

    if (hasNatureIntent) {
        priors.push(
            { word: "nature", confidence: 0.90 },
            { word: "natural", confidence: 0.84 },
            { word: "peaceful", confidence: 0.79 },
            { word: "beautiful", confidence: 0.76 }
        );
    }

    if (hasSentimentIntent) {
        priors.push(
            { word: "happy", confidence: 0.82 },
            { word: "calm", confidence: 0.78 },
            { word: "sad", confidence: 0.74 },
            { word: "angry", confidence: 0.70 }
        );
    }

    // Generic life-related prompts
    if (/\b(life|living|alive|exist|exists|existence)\b/.test(s)) {
        priors.push(
            { word: "living", confidence: 0.88 },
            { word: "organism", confidence: 0.80 },
            { word: "human", confidence: 0.75 },
            { word: "nature", confidence: 0.70 }
        );
    }

    return mergeScoredCandidates(priors, getUniversalIntentPriors(analysis));
}

function mergeScoredCandidates(scored, priors) {
    const merged = {};
    scored.forEach(item => {
        merged[item.word] = Math.max(merged[item.word] || 0, item.confidence || 0);
    });
    priors.forEach(item => {
        merged[item.word] = Math.max(merged[item.word] || 0, item.confidence || 0);
    });
    return Object.entries(merged)
        .map(([word, confidence]) => ({ word, confidence }))
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 4);
}

function scoreByContext(candidates, analysis) {
    const scores = {};
    const domains = analysis.domainContext;
    const sentence = analysis.fullSentence;
    const mainSubject = analysis.mainSubject;
    const asksForColor = /\b(colou?rs?|colors?|shade|hue)\b/.test(sentence);
    const mentionsBlood = /\bblood\b/.test(sentence);
    const grammar = analysis.grammarProfile || {};
    const colorEntity = analysis.colorIntent ? detectColorEntity(sentence, mainSubject) : null;
    const colorEntityClass = analysis.colorIntent ? inferEntityClass(colorEntity, sentence) : "generic";
    const classPalette = new Set(getColorPaletteForClass(colorEntityClass));

    const colorWords = new Set(["red", "green", "blue", "yellow", "black", "white", "purple", "orange"]);
    const foodDescriptors = new Set(["red", "white", "sweet", "dry", "sour", "bitter", "savory"]);
    const animalDescriptors = new Set(["wild", "domestic", "furry", "fast", "slow", "predatory"]);
    const positiveWords = new Set(["good", "beautiful", "great", "amazing", "wonderful"]);
    const negativeWords = new Set(["bad", "ugly", "terrible", "awful"]);
    const natureDescriptors = new Set(["beautiful", "peaceful", "natural", "majestic", "calm", "serene", "soulful", "grand", "stunning"]);
    const existenceWords = new Set(["human", "person", "being", "living", "alive", "organism"]);

    candidates.forEach(item => {
        const word = (item.word || "").toLowerCase();
        if (!word || word.length <= 2 || word.includes(" ") || word.includes("-")) return;
        if (word === mainSubject) return;

        let score = 0;
        let freq = 0.01;
        let posBoost = 0;
        let isNoun = false;
        let isAdj = false;
        let isVerb = false;
        if (item.tags) {
            const fTag = item.tags.find(t => t.startsWith("f:"));
            if (fTag) freq = parseFloat(fTag.split(":")[1]) || 0.01;
            isNoun = item.tags.includes("n");
            isAdj = item.tags.includes("adj");
            isVerb = item.tags.includes("v");
            if (isNoun) posBoost += 8;
            if (isAdj) posBoost += 6;
            if (isVerb) posBoost += 4;
        }
        score += Math.log(freq + 1) * 10 + posBoost;

        if (grammar.expectsAdjective) {
            if (isAdj) score += 220;
            if (isNoun) score -= 140;
            if (isVerb) score -= 80;
        }
        if (grammar.expectsNoun && isNoun) score += 80;
        if (grammar.isIdentityStatement && existenceWords.has(word)) score += 220;
        if (grammar.isIdentityStatement && isAdj) score -= 20;
        if (grammar.subjectLikelyPlural && isAdj) score += 45;

        if (domains.includes("color") && colorWords.has(word)) score += 100;
        if (domains.includes("food") && foodDescriptors.has(word)) score += 80;
        if (domains.includes("animals") && animalDescriptors.has(word)) score += 70;
        if (domains.includes("place") && ["mountain", "river", "valley", "forest", "beach"].includes(word)) score += 60;

        if (analysis.sentiment.sentiment === "positive" && positiveWords.has(word)) score += 50;
        if (analysis.sentiment.sentiment === "negative" && negativeWords.has(word)) score += 50;
        if (analysis.sentiment.question && item.score) score += Math.min(20, item.score / 50);

        if (/\bmountain(s)?\b/.test(sentence)) {
            if (natureDescriptors.has(word)) score += 320;
            if (word === "mountain" || word === "mountains") score -= 220;
            if (word === "high" || word === "low") score -= 45;
        }

        // Strong color-entity constraint for full-sentence context accuracy.
        if (analysis.colorIntent) {
            if (colorWords.has(word)) {
                if (classPalette.has(word)) {
                    score += 520;
                } else {
                    score -= 180;
                }
            } else if (isAdj || isNoun) {
                // keep pure color vocabulary dominant for color queries
                score -= 140;
            }

            // Explicitly keep trees/vegetation away from orange by default.
            if (colorEntityClass === "vegetation" && word === "orange" && !/\bautumn|fall\b/.test(sentence)) {
                score -= 420;
            }
        }

        if (asksForColor && mentionsBlood) {
            if (word === "red") score += 1200;
            else if (word === "crimson" || word === "scarlet") score += 500;
            else if (colorWords.has(word)) score += 120;
            else score -= 40;
        }

        const overlap = sentence.split(/\s+/).some(w => w.replace(/[^a-z]/g, "") === word);
        if (overlap) score -= 20;

        scores[word] = Math.max(scores[word] || 0, score);
    });

    return Object.entries(scores)
        .map(([word, score]) => ({ word, confidence: Math.min(0.99, Math.max(0.05, score / 120)) }))
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 4);
}

async function adaptToInputHub(sentence) {
    const s = (sentence || "").toLowerCase().trim();
    const words = s.split(/\s+/).filter(Boolean);
    const colorOfMatch =
        s.match(/\bcolou?rs?\s+of\s+(?:the\s+)?([a-z]+)/) ||
        s.match(/\bcolors?\s+of\s+(?:the\s+)?([a-z]+)/);
    const focusTerm = colorOfMatch?.[1] || null;
    const status = document.getElementById('hub-ls-status');
    if (status) {
        status.innerText = "BrowserAI: Analyzing...";
        status.style.color = "#00ffff";
    }

    try {
        // ── NEW: Use real Chrome Built-in AI when available ──
        // Only use BrowserAI for vocabulary when it has REAL Chrome AI (Gemini Nano).
        // The local n-gram fallback is too generic and loses color/domain/specialized
        // context that the old engine handles well. So for local-ngram we let the
        // old contextual engine run instead.
        if (typeof BrowserAI !== 'undefined') {
            const backend = await BrowserAI.getBackend();
            if (backend === 'chrome-ai') {
                const prediction = await BrowserAI.predict(sentence);
                if (prediction && prediction.words && prediction.words.length === 4) {
                    vocabulary_h = prediction.words;
                    semanticPriors_h = prediction.confidences;
                    desiredWordIdx_h = prediction.desiredIdx;
                    targetWordIdx_h = desiredWordIdx_h;
                    lastAdaptSentence_h = s;

                    if (status) {
                        status.innerText = "✓ Chrome AI (Gemini Nano) prediction locked";
                        status.style.color = "#00ff88";
                    }

                    for (let i = 0; i < 4; i++) {
                        if (htmlLabels_h[3] && htmlLabels_h[3][i]) {
                            const p = semanticPriors_h[i] || 0;
                            updateNodeLabelHub(3, i, nn_h?.biases?.[2]?.[i] || 0, p, p, vocabulary_h[i]);
                            htmlLabels_h[3][i].style.opacity = 1;
                            htmlLabels_h[3][i].dataset.seedWord = vocabulary_h[i];
                            htmlLabels_h[3][i].dataset.seedProb = (p * 100).toFixed(1);
                        }
                    }
                    return;
                }
            }
        }

        // ── SPECIALIZED CONTEXTUAL ENGINE (local browsers) ──
        const analysis = {
            fullSentence: s,
            words,
            length: s.length,
            endsWithQuestion: s.includes("?"),
            endsWithVerb: /(?:^|\s)(is|are|was|were|do|does|can|will|am)$/.test(s),
            colorIntent: /\b(colou?rs?|colors?|shade|hue)\b/.test(s),
            mainSubject: extractMainSubject(s),
            focusTerm,
            sentiment: analyzeSentiment(s),
            domainContext: detectDomain(s),
            grammarProfile: detectGrammarProfile(s)
        };

        const candidates = await fetchContextualCandidates(analysis);
        scored = scoreByContext(candidates, analysis);
        const priors = getKnowledgePriorCandidates(analysis);
        if (priors.length) {
            scored = mergeScoredCandidates(scored, priors);
        }
        const lockedPalette = buildLockedColorVocabulary(analysis);
        if (lockedPalette && lockedPalette.length === 4) {
            scored = lockedPalette;
        }
        if (!scored.length) {
            scored = [
                { word: "intelligence", confidence: 0.45 },
                { word: "learning", confidence: 0.30 },
                { word: "data", confidence: 0.15 },
                { word: "future", confidence: 0.10 }
            ];
        }

        vocabulary_h = scored.map(c => c.word).slice(0, 4);
        while (vocabulary_h.length < 4) vocabulary_h.push("token" + vocabulary_h.length);

        const probs = computeSoftmax(scored.slice(0, 4).map(c => c.confidence));
        semanticPriors_h = probs;
        desiredWordIdx_h = probs.indexOf(Math.max(...probs));
        targetWordIdx_h = desiredWordIdx_h;
        lastAdaptSentence_h = s;

        if (status) {
            status.innerText = "✓ Contextual semantic engine ready";
            status.style.color = "#00ff88";
        }

        for (let i = 0; i < 4; i++) {
            if (htmlLabels_h[3] && htmlLabels_h[3][i]) {
                const displayProb = ((probs[i] || 0) * 100).toFixed(1);
                updateNodeLabelHub(3, i, nn_h?.biases?.[2]?.[i] || 0, probs[i] || 0, probs[i] || 0, vocabulary_h[i]);
                htmlLabels_h[3][i].style.opacity = 1;
                htmlLabels_h[3][i].dataset.seedWord = vocabulary_h[i];
                htmlLabels_h[3][i].dataset.seedProb = displayProb;
            }
        }
    } catch(e) {
        console.error("Semantic Adapt Error:", e);
        vocabulary_h = ["intelligence", "learning", "data", "future"];
        desiredWordIdx_h = 0;
        targetWordIdx_h = 0;
        lastAdaptSentence_h = s;
        if (status) {
            status.innerText = "✓ Fallback Mode Active";
            status.style.color = "#ffaa33";
        }
    }
}

window.initPhase7 = initPhase7;
window.reinitPhase7 = () => {
    const data = getInputDataHub();
    const input = document.getElementById('hub-sentence-input');
    if (input) input.value = data.sentence;
    adaptToInputHub(data.sentence);
};
window.exitPhase7 = () => masterTimeline_h?.kill();