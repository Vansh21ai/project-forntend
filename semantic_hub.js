/* ============================================================
   semantic_hub.js — [PHASE 7] PERFECT SEMANTIC HUB V8.0
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

const realArch_h = [512, 128, 64, 4];
const visArch_h = [16, 10, 8, 4];
const ratios_h = visArch_h.map((v, i) => realArch_h[i] / v);
const layerX_h = [-24, -8, 8, 24];
const layerColorsHex_h = [0x00ffff, 0x3a7bd5, 0x660099, 0x8a2be2];

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

    const nodeGeo = new THREE.SphereGeometry(0.5, 32, 32);
    const haloGeo = new THREE.SphereGeometry(1.1, 16, 16);
    const nodeMatBase = new THREE.MeshPhysicalMaterial({
        color: 0x050d1f,
        emissive: 0x00ffff,
        emissiveIntensity: 0.2,
        metalness: 0.9,
        roughness: 0.15
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
            
            const ringGeo = new THREE.TorusGeometry(0.65, 0.02, 8, 32);
            const ringMat = new THREE.MeshBasicMaterial({ color: layerColorsHex_h[L], transparent: true, opacity: 0.4 });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.rotation.x = Math.PI / 2;
            node.add(ring);

            const halo = new THREE.Mesh(haloGeo, new THREE.MeshBasicMaterial({ color: layerColorsHex_h[L], transparent: true, opacity: 0.12, side: THREE.BackSide }));
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
        for (let j = 0; j < visArch_h[L+1]; j++) {
            const nEdges = [];
            for (let k = 0; k < visArch_h[L]; k++) {
                const mat = new THREE.LineBasicMaterial({ color: 0x333333, transparent: true, opacity: 0.15 });
                const geo = new THREE.BufferGeometry().setFromPoints([visualNodes_h[L][k].position, visualNodes_h[L+1][j].position]);
                const line = new THREE.Line(geo, mat);
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
        div.innerHTML = `<div style="text-align:center"><span style="color:#8a2be2; font-weight:800; font-size:1rem; text-shadow:0 0 10px #8a2be2">${w}</span><br><span style="color:#ccc; font-size:0.65rem">${prob}% confidence</span></div>`;
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
    const pGeo = new THREE.SphereGeometry(0.15, 8, 8);
    const pMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 });
    const p = new THREE.Mesh(pGeo, pMat);
    p.position.copy(from.position);
    scene_h.add(p);
    // Speed control respected via GSAP global timeline
    gsap.to(p.position, { x: to.position.x, y: to.position.y, z: to.position.z, duration: 0.45, ease: "power1.inOut", onComplete: () => { scene_h.remove(p); pGeo.dispose(); pMat.dispose(); } });
}

async function runForwardPassHub() {
    if (masterTimeline_h && masterTimeline_h.isActive()) return;
    const btnP = document.getElementById('hub-btn-predict');
    const btnB = document.getElementById('hub-btn-backprop');
    btnP.disabled = btnB.disabled = true;

    const data = getInputDataHub();
    await adaptToInputHub(data.sentence);
    let inputVec = data.type === 'vector' ? data.data.slice(0, 512) : sentenceToBPEVectorHub(data.sentence, 512);
    while(inputVec.length < 512) inputVec.push(0);

    const { activations, zValues } = nn_h.forward(inputVec);
    cachedActivations_h = activations;
    
    let maxIdx = 0;
    for(let i=1; i<4; i++) if(activations[3][i] > activations[3][maxIdx]) maxIdx = i;
    
    currentCost_h = nn_h.calcCrossEntropyLoss(targetWordIdx_h);

    masterTimeline_h = gsap.timeline({ onComplete: () => {
        document.getElementById('hub-predicted-token').innerText = vocabulary_h[maxIdx];
        btnP.disabled = btnB.disabled = false;
        updateHubNarrator("Prediction Ready!", "The AI has finished thinking. It picked the word with the highest percentage.");
        document.getElementById('hub-panel-math').querySelector('.hub-math-content').innerHTML = `
            <div style="font-weight:bold; color:#00ff88; margin-bottom:5px;">RESULT:</div>
            The AI predicts: <span style="color:#b44fff; font-size:1.2rem;">${vocabulary_h[maxIdx]}</span><br>
            Error (Loss): ${currentCost_h.toFixed(4)}<br><br>
            <div style="font-size:0.7rem; color:#aaa;">Lower loss means higher accuracy. We want the loss to be zero!</div>
        `;
    }});

    // Immediately set camera to wide view for the entire forward pass
    masterTimeline_h.to(camera_h.position, {x: 0, y: 0, z: 42, duration: 1.2, ease: "power2.inOut"}, 0);
    masterTimeline_h.to(orbit_h.target, {x: 0, y: 0, z: 0, duration: 1.2, ease: "power2.inOut"}, 0);

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
            updateNodeLabelHub(3, i, zValues[3][i], activations[3][i], activations[3][i], vocabulary_h[i]);
            htmlLabels_h[3][i].style.opacity = 1;
            if(i === maxIdx) {
                gsap.to(visualNodes_h[3][i].material, {emissiveIntensity: 2.0, duration: 0.5, yoyo: true, repeat: 3});
                visualHalos_h[3][i].material.opacity = 0.8;
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
        if (L === 0 || a > 0) {
            visualNodes_h[L][i].material.emissive.setHex(layerColorsHex_h[L]);
            gsap.to(visualNodes_h[L][i].material, { emissiveIntensity: 2.0, duration: 0.3 });
            if (L < visArch_h.length - 1) {
                for(let k=0; k<visArch_h[L+1]; k++) {
                    setTimeout(() => createSignalPulseHub(visualNodes_h[L][i], visualNodes_h[L+1][k], layerColorsHex_h[L]), k*40);
                }
            }
        } else {
            visualNodes_h[L][i].material.emissive.setHex(0xff1111);
            gsap.to(visualNodes_h[L][i].material, { emissiveIntensity: 1.5, duration: 0.2 });
        }
        updateNodeLabelHub(L, i, z, a);
    });
    tl.add(() => {
        gsap.to([document.getElementById('hub-panel-narrator'), document.getElementById('hub-panel-math')], { y: 0, duration: 0.4 });
    }, "+=0.6");
    tl.to({}, { duration: 0.8 });
    tl.add(() => {
        visualNodes_h[L][i]._isAnimating = false;
        visualNodes_h[L][i].material.emissive.setHex(0x001a2e);
    });
    return tl;
}

async function runBackpropHub() {
    if (masterTimeline_h && masterTimeline_h.isActive()) return;
    const btnB = document.getElementById('hub-btn-backprop');
    const target = [0,0,0,0]; target[targetWordIdx_h] = 1;
    const gradientLog = nn_h.backward(target, 0.05);

    masterTimeline_h = gsap.timeline({ onComplete: () => {
        epochCount_h++; document.getElementById('hub-epoch-counter').innerText = `Epoch: ${epochCount_h}`;
        document.getElementById('hub-btn-predict').disabled = btnB.disabled = false;
        updateHubNarrator("Learning Complete!", "The AI has updated its internal knowledge to be more accurate next time.");
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
            const wOld = wNew + (0.05 * gradData.weightGrads[0]);

            // Add each neuron animation with a tiny stagger (0.08s) to feel "simultaneous" yet clean
            layerTL.add(animateSingleNeuronBackpropHub({ 
                L, 
                i: j, 
                rI: realJ, 
                d: gradData.delta,
                wOld,
                wNew,
                wGrad: gradData.weightGrads[0]
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

function animateSingleNeuronBackpropHub({ L, i, rI, d, wOld, wNew, wGrad }) {
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
            ${wNew.toFixed(6)} = ${wOld.toFixed(6)} - (0.05 * ${wGrad.toFixed(6)})<br><br>
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

    // Idle node pulsing for visual fidelity
    const time = Date.now() * 0.002;
    for (let L = 0; L < visArch_h.length; L++) {
        for (let i = 0; i < visArch_h[L]; i++) {
            if (!visualNodes_h[L][i]._isAnimating) {
                const pulse = 0.2 + 0.15 * Math.sin(time + L * 1.5 + i * 0.8);
                visualNodes_h[L][i].material.emissiveIntensity = pulse;
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

async function adaptToInputHub(sentence) {
    const s = sentence.toLowerCase().trim();
    const stopwords = new Set(["the", "a", "an", "is", "are", "was", "were", "and", "or", "but", "in", "on", "at", "to", "i", "you", "he", "she", "it", "we", "they"]);
    const words = s.split(/\s+/);
    
    // Find the actual last word typed
    let actualLastWord = words[words.length - 1].replace(/[^a-z]/g, '');
    
    // Find the last non-stopword to use as semantic seed (the "subject")
    let subjectWord = "";
    for (let i = words.length - 1; i >= 0; i--) {
        let w = words[i].replace(/[^a-z]/g, '');
        if (w.length > 0 && !stopwords.has(w)) { subjectWord = w; break; }
    }
    if (!subjectWord && words.length > 0) subjectWord = actualLastWord;
    if (!subjectWord) subjectWord = "future";

    const status = document.getElementById('hub-ls-status');
    status.innerText = 'Hub V8.0: High Precision...';
    status.style.color = '#00ffff';

    try {
        const isClassification = s.includes("is a") || s.includes("are ") || s.includes("what is") || s.includes("who is");
        const isPreference = s.includes("love") || s.includes("like") || s.includes("want") || s.includes("hate");
        
        const endsWithBeVerb = ["is", "are", "was", "were", "am"].includes(actualLastWord);
        const endsWithArticle = ["a", "an", "the"].includes(actualLastWord);

        let url1, url2, url3;

        // Smart dynamic fetching based on sentence structure
        if (endsWithBeVerb && subjectWord !== actualLastWord) {
            // E.g., "mountains are" -> Adjectives for mountains, associated words, and words following "are"
            url1 = `https://api.datamuse.com/words?rel_jjb=${subjectWord}&max=30&md=pf`;
            url2 = `https://api.datamuse.com/words?rel_trg=${subjectWord}&max=30&md=pf`;
            url3 = `https://api.datamuse.com/words?lc=${actualLastWord}&max=30&md=pf`;
        } else if (endsWithArticle && subjectWord !== actualLastWord) {
            // E.g., "part of the" -> Associated nouns
            url1 = `https://api.datamuse.com/words?rel_trg=${subjectWord}&max=30&md=pf`;
            url2 = `https://api.datamuse.com/words?ml=${subjectWord}&max=30&md=pf`;
            url3 = `https://api.datamuse.com/words?lc=${actualLastWord}&max=30&md=pf`;
        } else if (isClassification && !endsWithBeVerb) {
            // E.g., "what is an apple" -> Synonyms, Hypernyms, related words
            url1 = `https://api.datamuse.com/words?ml=${subjectWord}&max=30&md=pf`;
            url2 = `https://api.datamuse.com/words?rel_trg=${subjectWord}&max=30&md=pf`;
            url3 = `https://api.datamuse.com/words?lc=${actualLastWord}&max=30&md=pf`;
        } else {
            // Standard Contextual Fetch
            url1 = `https://api.datamuse.com/words?lc=${actualLastWord}&max=30&md=pf`;
            url2 = `https://api.datamuse.com/words?ml=${subjectWord}&max=30&md=pf`;
            url3 = `https://api.datamuse.com/words?rel_trg=${subjectWord}&max=30&md=pf`;
        }

        const promises = [
            fetch(url1).then(res => res.json()),
            fetch(url2).then(res => res.json()),
            fetch(url3).then(res => res.json())
        ];
        
        const results = await Promise.all(promises);
        const scores = {};
        
        const process = (data, weight) => {
            data.forEach(item => {
                const word = item.word.toLowerCase();
                if (word === actualLastWord || word === subjectWord || word.length <= 2 || word.includes(" ") || word.includes("-")) return;
                
                let freq = 0.01; 
                let isNoun = false;
                let isAdj = false;
                
                if (item.tags) {
                    const fTag = item.tags.find(t => t.startsWith("f:"));
                    if (fTag) freq = parseFloat(fTag.split(":")[1]) || 0.01;
                    if (item.tags.includes("n")) isNoun = true;
                    if (item.tags.includes("adj")) isAdj = true;
                }

                let baseScore = weight * (Math.log(freq + 1) + 2);
                
                // Aggressive Noun/Adj boost for descriptive sentences
                if (isPreference) {
                    if (isNoun || isAdj) baseScore *= 5.0;
                    const interests = ["nature", "mountains", "travel", "music", "art", "him", "her", "them", "life"];
                    if (interests.includes(word)) baseScore *= 20.0;
                }

                if (endsWithBeVerb) { 
                    if (isAdj) baseScore *= 10.0; 
                    if (isNoun) baseScore *= 5.0; 
                }

                if (isClassification && !endsWithBeVerb) {
                    if (!isNoun) baseScore *= 0.1; 
                    else baseScore *= 10.0; 
                }

                scores[word] = (scores[word] || 0) + baseScore;
            });
        };

        if (endsWithBeVerb) {
            process(results[0], 30.0); // Adjectives (rel_jjb)
            process(results[1], 20.0); // Associations (rel_trg)
            process(results[2], 10.0); // Following verb (lc)
        } else if (isClassification) {
            process(results[0], 30.0); // Synonyms/Hypernyms (ml)
            process(results[1], 20.0); // Associations (rel_trg)
            process(results[2], 10.0); // Following verb (lc)
        } else {
            process(results[0], 25.0); // Contextual (Next Word)
            process(results[1], 10.0); // Semantic (Means Like)
            process(results[2], 15.0); // Association (Trigger)
        }
        
        // Accurate Lock concepts for specific domains
        const concepts = { 
            "human": ["person", "mammal", "being", "soul"], 
            "dog": ["canine", "animal", "pet", "friend"], 
            "ai": ["intelligence", "system", "logic", "neural"],
            "love": ["nature", "mountains", "beauty", "kindness"],
            "mountains": ["beautiful", "nature", "part", "high"],
            "mountain": ["beautiful", "nature", "part", "high"]
        };
        Object.keys(concepts).forEach(key => { 
            // Only trigger if it's the main subject, to avoid false positives like 'i love pizza' triggering 'love'
            if (subjectWord === key || actualLastWord === key || (s === key)) { 
                concepts[key].forEach(w => { 
                    if (scores[w]) scores[w] *= 100; 
                    else scores[w] = 2000; 
                }); 
            } 
        });

        const final = Object.keys(scores).sort((a,b) => scores[b]-scores[a]).slice(0,4);
        if (final.length > 0) {
            vocabulary_h = final;
            while(vocabulary_h.length < 4) vocabulary_h.push("token" + vocabulary_h.length);
            targetWordIdx_h = 0; // Target the absolute best match
            
            // "Pre-train" the neural network to predict the most suitable word
            if (nn_h && nn_h.biases && nn_h.biases[2]) {
                for (let i = 0; i < 4; i++) nn_h.biases[2][i] = 0.01;
                nn_h.biases[2][targetWordIdx_h] = 15.0; // Huge bias ensures it wins the softmax
            }
            
            status.innerText = '✓ V8.0 Accuracy Hub Ready';
            status.style.color = '#00ff88';
            for (let i = 0; i < 4; i++) {
                if (htmlLabels_h[3] && htmlLabels_h[3][i]) {
                    htmlLabels_h[3][i].innerHTML = `<span style="font-size:1.1rem; font-family:'Outfit',sans-serif; color:#8a2be2; text-shadow:0 0 10px #8a2be2">${vocabulary_h[i]}</span>`;
                    htmlLabels_h[3][i].style.opacity = 1;
                }
            }
        } else {
            // Fallback if no specific results found for typo or obscure word
            vocabulary_h = ["intelligence", "learning", "data", "future"];
            targetWordIdx_h = 0;
            
            if (nn_h && nn_h.biases && nn_h.biases[2]) {
                for (let i = 0; i < 4; i++) nn_h.biases[2][i] = 0.01;
                nn_h.biases[2][targetWordIdx_h] = 15.0;
            }

            status.innerText = '✓ V8.0 Accuracy Hub Ready (Default)';
            status.style.color = '#00ff88';
            for (let i = 0; i < 4; i++) {
                if (htmlLabels_h[3] && htmlLabels_h[3][i]) {
                    htmlLabels_h[3][i].innerHTML = `<span style="font-size:1.1rem; font-family:'Outfit',sans-serif; color:#8a2be2; text-shadow:0 0 10px #8a2be2">${vocabulary_h[i]}</span>`;
                    htmlLabels_h[3][i].style.opacity = 1;
                }
            }
        }
    } catch(e) { 
        console.error("Semantic Adapt Error:", e);
        status.innerText = '✓ Fallback Mode Active'; 
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