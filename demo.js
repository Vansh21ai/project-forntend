/* ============================================================
   demo.js  —  Phase 4: Artificial Neuron Processing
   Embedded into chg/x.html as <script type="module">

   INTEGRATION DESIGN:
   • ALL WebGL / Three.js objects are created LAZILY inside
     setupANN(), which runs only on the first call to
     window.initPhase4(). This means zero GPU overhead until
     the user actually enters Phase 4.
   • The #neuron-canvas CSS is:  display:none; mix-blend-mode:screen
     When screen-blended, black pixels are transparent,
     so the #particles star-field (z-index:-2) shows through
     everywhere the ANN scene is dark.
   • Do NOT modify this file's 3-D node / signal logic —
     only the lifecycle wiring changed.
============================================================ */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass }     from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const THRESHOLD = 0.5;
const BIAS      = 0.2;

/* ── Grab the canvas that already exists in x.html ─────── */
const canvas = document.getElementById('neuron-canvas');
/* Canvas starts display:none (set in z.css).
   y.js sets display:block before calling initPhase4().    */

/* ── All scene objects declared here, built lazily ─────── */
let scene, camera, renderer, composer;
let ambientLight, pointLight, rimLight;
let cyanMat, purpleMat, out1Mat, out0Mat;
let input1, input2, aggregator, output1, output0, nodes;
let streamIn1, streamIn2, streamOut1, streamOut0;
let particleStreams = [];
let animRunning = false;
let simTimeout  = null;
let mouse       = new THREE.Vector2();
let targetCam   = new THREE.Vector3(0, 0, 20);

/* ──────────────────────────────────────────────────────────
   LAZY SETUP — called once on first Phase 4 entry
─────────────────────────────────────────────────────────── */
function setupANN() {
    scene  = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 20);

    /* alpha:true → transparent framebuffer.
       mix-blend-mode:screen (CSS) makes black = invisible.   */
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ReinhardToneMapping;
    renderer.setClearColor(0x000000, 0);

    /* Bloom — makes nodes glow without a solid background    */
    const renderScene = new RenderPass(scene, camera);
    const bloomPass   = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        2.0, 0.4, 0.82
    );
    bloomPass.threshold = 0;
    bloomPass.strength  = 2.0;
    bloomPass.radius    = 0.6;

    composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);

    /* ── Lighting ─────────────────────────────────────────── */
    ambientLight = new THREE.AmbientLight(0x112244, 0.7);
    scene.add(ambientLight);

    pointLight = new THREE.PointLight(0xffffff, 1.2);
    pointLight.position.set(0, 5, 10);
    scene.add(pointLight);

    rimLight = new THREE.PointLight(0x4400cc, 1.8);
    rimLight.position.set(12, -4, 6);
    scene.add(rimLight);

    /* ── Materials ────────────────────────────────────────── */
    cyanMat   = new THREE.MeshStandardMaterial({ color:0x004455, emissive:0x00ffff, emissiveIntensity:2.2, roughness:0.15, metalness:0.3 });
    purpleMat = new THREE.MeshStandardMaterial({ color:0x220055, emissive:0x9D00FF, emissiveIntensity:2.2, roughness:0.15, metalness:0.3 });
    out1Mat   = new THREE.MeshStandardMaterial({ color:0x00ffff, emissive:0x00ffff, emissiveIntensity:2.2, roughness:0.15, metalness:0.3 });
    out0Mat   = new THREE.MeshStandardMaterial({ color:0x9D00FF, emissive:0x9D00FF, emissiveIntensity:2.2, roughness:0.15, metalness:0.3 });

    /* ── Geometries ───────────────────────────────────────── */
    const largeSphere = new THREE.SphereGeometry(1.8, 32, 32);
    const medSphere   = new THREE.SphereGeometry(1.3, 32, 32);

    function createNode(size, coreMat, shellColorHex, px, py, pz, isAggregator = false) {
        const group = new THREE.Group();
        group.position.set(px, py, pz);
        group.scale.set(0, 0, 0);
        group.userData.baseY        = py;
        group.userData.isAggregator = isAggregator;

        const core = new THREE.Mesh(size === 'large' ? largeSphere : medSphere, coreMat);
        group.add(core);

        const shellGeo = new THREE.IcosahedronGeometry(size === 'large' ? 1.95 : 1.45, 2);
        const shellMat = new THREE.MeshBasicMaterial({
            color: shellColorHex, wireframe: true,
            transparent: true, opacity: 0.3,
            blending: THREE.AdditiveBlending
        });
        const shell = new THREE.Mesh(shellGeo, shellMat);
        group.add(shell);

        group.userData.core  = core;
        group.userData.shell = shell;
        return group;
    }

    input1     = createNode('med',   cyanMat,   0x00ffff, -10,  5, 0);
    input2     = createNode('med',   cyanMat,   0x00ffff, -10, -5, 0);
    aggregator = createNode('large', purpleMat, 0x9D00FF,   0,  0, 0, true);
    output1    = createNode('med',   out1Mat,   0x00ffff,  10,  5, 0);
    output0    = createNode('med',   out0Mat,   0x9D00FF,  10, -5, 0);
    nodes      = [input1, input2, aggregator, output1, output0];
    nodes.forEach(n => scene.add(n));

    /* ── Particle Streams (connections) ───────────────────── */
    function createParticleStream(startNode, endNode, colorHex) {
        const path  = new THREE.LineCurve3(startNode.position, endNode.position);
        const count = 300;
        const geometry  = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const progress  = new Float32Array(count);
        const speed     = new Float32Array(count);
        const offsets   = new Float32Array(count * 3);

        for (let i = 0; i < count; i++) {
            progress[i]      = Math.random();
            speed[i]         = 0.003 + Math.random() * 0.005;
            offsets[i*3]     = (Math.random()-0.5)*0.8;
            offsets[i*3+1]   = (Math.random()-0.5)*0.8;
            offsets[i*3+2]   = (Math.random()-0.5)*0.8;
        }
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('progress',  new THREE.BufferAttribute(progress,  1));
        geometry.setAttribute('speed',     new THREE.BufferAttribute(speed,     1));
        geometry.setAttribute('offset',    new THREE.BufferAttribute(offsets,   3));

        const mat = new THREE.PointsMaterial({
            color: colorHex, size: 0.12,
            transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        const stream = new THREE.Points(geometry, mat);
        stream.userData = { curve: path };
        scene.add(stream);
        particleStreams.push(stream);
        return stream;
    }

    streamIn1  = createParticleStream(input1,     aggregator, 0x00ffff);
    streamIn2  = createParticleStream(input2,     aggregator, 0x00ffff);
    streamOut1 = createParticleStream(aggregator, output1,    0x00ffff);
    streamOut0 = createParticleStream(aggregator, output0,    0x9D00FF);

    /* ── Mouse parallax ───────────────────────────────────── */
    window.addEventListener('mousemove', (e) => {
        mouse.x =  (e.clientX / window.innerWidth)  * 2 - 1;
        mouse.y = -(e.clientY / window.innerHeight)  * 2 + 1;
    });

    /* ── Resize ───────────────────────────────────────────── */
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        composer.setSize(window.innerWidth, window.innerHeight);
    });

    /* ── Animation loop ───────────────────────────────────── */
    animRunning = true;
    animateANN();
}

/* ── Animation loop ─────────────────────────────────────── */
function animateANN() {
    if (!animRunning) return;
    requestAnimationFrame(animateANN);

    /* Skip render if canvas is hidden (other phases) */
    if (canvas.style.display === 'none') return;

    const t = Date.now() * 0.001;

    nodes.forEach((group, index) => {
        group.userData.core.rotation.y  += 0.005;
        group.userData.shell.rotation.y -= 0.008;
        group.userData.shell.rotation.x += 0.002;
        group.position.y = group.userData.baseY + Math.sin(t*2 + index)*0.2;
    });

    aggregator.userData.shell.material.opacity = 0.2 + Math.sin(t*3)*0.15;
    ambientLight.intensity = 0.55 + Math.sin(t*0.55)*0.18;

    particleStreams.forEach(stream => {
        if (stream.material.opacity > 0) {
            const pos     = stream.geometry.attributes.position.array;
            const prog    = stream.geometry.attributes.progress.array;
            const spd     = stream.geometry.attributes.speed.array;
            const offsets = stream.geometry.attributes.offset.array;
            const curve   = stream.userData.curve;
            for (let i = 0; i < prog.length; i++) {
                prog[i] += spd[i];
                if (prog[i] > 1.0) prog[i] = 0;
                const pt = curve.getPoint(prog[i]);
                pos[i*3]   = pt.x + offsets[i*3];
                pos[i*3+1] = pt.y + offsets[i*3+1];
                pos[i*3+2] = pt.z + offsets[i*3+2];
            }
            stream.geometry.attributes.position.needsUpdate = true;
        }
    });

    targetCam.x = mouse.x * 2.5;
    targetCam.y = mouse.y * 1.5;
    camera.position.x += (targetCam.x - camera.position.x) * 0.05;
    camera.position.y += (targetCam.y - camera.position.y) * 0.05;
    camera.lookAt(scene.position);

    updateLabels();
    composer.render();
}

/* ── UI label projection ─────────────────────────────────── */
function updateLabels() {
    const halfW = window.innerWidth / 2;
    const halfH = window.innerHeight / 2;
    function project(mesh, id, offsetX) {
        const pos  = mesh.position.clone().project(camera);
        const elem = document.getElementById(id);
        if (!elem) return;
        elem.style.left = (pos.x * halfW + halfW + offsetX) + 'px';
        elem.style.top  = -(pos.y * halfH - halfH) + 'px';
    }
    project(input1,  'label-in1',  -120);
    project(input2,  'label-in2',  -120);
    project(output1, 'label-out1',  185);
    project(output0, 'label-out0',  185);
}

function getScreenPos(mesh) {
    const hw = window.innerWidth / 2, hh = window.innerHeight / 2;
    const p  = mesh.position.clone().project(camera);
    return { x: p.x*hw + hw, y: -(p.y*hh - hh) };
}

/* ── Flying signal tags ──────────────────────────────────── */
function flyLabel(text, fromMesh, toMesh, durationSec, isPurple) {
    const phaseEl = document.getElementById('phase-ann');
    const tag = document.createElement('div');
    tag.className = 'signal-tag' + (isPurple ? ' purple-tag' : '');
    tag.textContent = text;
    phaseEl.appendChild(tag);
    const s = getScreenPos(fromMesh);
    const e = getScreenPos(toMesh);
    tag.style.left = s.x + 'px';
    tag.style.top  = s.y + 'px';
    gsap.timeline({ onComplete: () => tag.remove() })
        .to(tag, { opacity:1, duration:0.18 })
        .to(tag, { left: e.x+'px', top: e.y+'px', duration:durationSec, ease:'power2.inOut' }, 0)
        .to(tag, { opacity:0, duration:0.22 }, durationSec - 0.2);
}

/* ── Signal packet ───────────────────────────────────────── */
function createSignalPacket(startMesh, colorHex) {
    const packet = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 16, 16),
        new THREE.MeshBasicMaterial({ color: colorHex })
    );
    packet.position.copy(startMesh.position);
    scene.add(packet);
    return packet;
}

/* ── Simulation loop ─────────────────────────────────────── */
function runSimulation() {
    const x1 = (Math.random()*2-1).toFixed(2);
    const x2 = (Math.random()*2-1).toFixed(2);
    const w1 = (Math.random()*2-1).toFixed(2);
    const w2 = (Math.random()*2-1).toFixed(2);

    const sv = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    sv('val-x1', x1); sv('val-w1', w1);
    sv('val-x2', x2); sv('val-w2', w2);

    document.querySelectorAll('.node-label').forEach(el => {
        el.style.opacity = 0.3;
        el.style.borderLeftColor = 'rgba(0,255,255,0.6)';
    });
    ['label-in1','label-in2'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.style.opacity = 1; el.style.borderLeftColor = '#00ffff'; }
    });

    const eqEl = document.getElementById('equation-text');
    if (eqEl) eqEl.textContent = 'Awaiting signal parameters...';

    const calculation = (x1*w1) + (x2*w2) + BIAS;
    const fired = calculation >= THRESHOLD;

    out1Mat.emissive.set(0x00ffff); out1Mat.color.set(0x00ffff);
    gsap.to(out1Mat, { emissiveIntensity:2.2, duration:0.9 });
    out0Mat.emissive.set(0x9D00FF); out0Mat.color.set(0x9D00FF);
    gsap.to(out0Mat, { emissiveIntensity:2.2, duration:0.9 });
    ['label-out1','label-out0'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.className = 'node-label output-label inactive-out';
    });

    const tl = gsap.timeline({ onComplete: () => { simTimeout = setTimeout(runSimulation, 7000); } });

    tl.to({}, { duration:2.5 })
      .call(() => {
          if (eqEl) eqEl.textContent = 'Passing inputs to aggregator...';
          flyLabel(`x₁·w₁ = ${(x1*w1).toFixed(3)}`, input1, aggregator, 2.3, false);
          flyLabel(`x₂·w₂ = ${(x2*w2).toFixed(3)}`, input2, aggregator, 2.3, false);
      });

    const sig1 = createSignalPacket(input1, 0x00ffff);
    const sig2 = createSignalPacket(input2, 0x00ffff);

    tl.to([sig1.position, sig2.position], {
            x: aggregator.position.x, y: aggregator.position.y, z: aggregator.position.z,
            duration:2.5, ease:'power2.inOut'
        }, 2.5)
      .to([streamIn1.material, streamIn2.material], { opacity:0.8, duration:0.8, yoyo:true, repeat:1 }, 2.5)
      .call(() => {
          scene.remove(sig1, sig2);
          if (eqEl) eqEl.innerHTML =
              `Aggr(z) = (${x1}&times;${w1}) + (${x2}&times;${w2}) + ${BIAS} = <strong>${calculation.toFixed(3)}</strong>`;
      })
      .to(aggregator.scale, { x:1.2, y:1.2, z:1.2, duration:0.2, yoyo:true, repeat:1 })
      .call(() => {
          const targetNode   = fired ? output1    : output0;
          const targetStream = fired ? streamOut1 : streamOut0;
          const targetLblId  = fired ? 'label-out1' : 'label-out0';
          if (eqEl) eqEl.innerHTML +=
              `<br><span style="font-size:1.2rem;color:#b3b3b3;">Check: ${calculation.toFixed(3)} ${fired?'&ge;':'&lt;'} ${THRESHOLD} &rarr; Output ${fired?'1':'0'}</span>`;
          flyLabel(`z = ${calculation.toFixed(3)}`, aggregator, targetNode, 1.8, !fired);
          const outSig = createSignalPacket(aggregator, fired ? 0x00ffff : 0x8a2be2);
          gsap.to(outSig.position, {
              x: targetNode.position.x, y: targetNode.position.y, z: targetNode.position.z,
              duration:2.0, ease:'power1.inOut',
              onStart:    () => gsap.to(targetStream.material, { opacity:0.8, duration:0.8, yoyo:true, repeat:1 }),
              onComplete: () => {
                  scene.remove(outSig);
                  const cm = targetNode.userData.core.material;
                  if (fired) { cm.emissive.set(0x00ffff); cm.emissiveIntensity = 8.5; gsap.to(cm, { emissiveIntensity:3.5, duration:0.7, ease:'power2.out' }); }
                  else        { cm.emissive.set(0x9D00FF); cm.emissiveIntensity = 5.5; gsap.to(cm, { emissiveIntensity:3.0, duration:0.5, ease:'power2.out' }); }
                  gsap.timeline()
                      .to(targetNode.scale, { x:1.35,y:1.35,z:1.35, duration:0.12, ease:'power3.out' })
                      .to(targetNode.scale, { x:1.0, y:1.0, z:1.0,  duration:0.6,  ease:'elastic.out(1,0.45)' });
                  const tLbl = document.getElementById(targetLblId);
                  if (tLbl) tLbl.className = 'node-label output-label active-out';
              }
          });
      });
}

/* ══════════════════════════════════════════════════════════
   PUBLIC API — called by y.js phase controller
══════════════════════════════════════════════════════════ */

/* Called once: builds WebGL context, starts animation + sim */
window.initPhase4 = function() {
    if (!scene) setupANN();   /* lazy WebGL creation */

    /* Ensure canvas is visible */
    canvas.style.display = 'block';

    /* Reset node scales for pop-in animation */
    nodes.forEach(n => n.scale.set(0,0,0));

    gsap.to([input1.scale, input2.scale, aggregator.scale, output1.scale, output0.scale], {
        x:1, y:1, z:1, duration:1.5, ease:'elastic.out(1,0.3)'
    });

    /* Info-boxes slide up with glitch effect */
    gsap.set('.info-box', { y:100, opacity:0 });
    gsap.to('.info-box', {
        y:0, opacity:1, duration:1.0, ease:'bounce.out', delay:1.2,
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

    gsap.to('.node-label', { opacity:0.3, duration:0.6, delay:2.5 });
    gsap.to(aggregator.userData.core.material, { emissiveIntensity:2.8, duration:2.2, yoyo:true, repeat:-1, ease:'sine.inOut', delay:3.0 });

    simTimeout = setTimeout(runSimulation, 3000);
};

/* Called on re-entry (user navigated away then back) */
window.reinitPhase4 = function() {
    canvas.style.display = 'block';
    gsap.set('.info-box', { y:60, opacity:0 });
    gsap.to('.info-box', { y:0, opacity:1, duration:0.8, ease:'power2.out', stagger:0.2 });
};