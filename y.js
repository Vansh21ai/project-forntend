/* ============================================================
   y.js — Artificial Neuron Project  (v4 DEFINITIVE)

   DEFINITIVE FIX LOG:
   1. BUG: scene.add(light).position — scene.add() returns the SCENE,
      not the light. Silent error corrupted the render pipeline.
      FIX: Light is declared as a variable, then added separately.

   2. BUG: material.opacity starts at 0, relies on GSAP+setTimeout
      chain — if anything interrupts that chain, brain stays invisible.
      FIX: material.opacity = 0.9 from the start. Brain is ALWAYS
      visible as soon as particles exist. No deferred opacity tricks.

   3. BUG: Particles generated inside setTimeout(50ms), but by the
      time text panels finish their bounce-in, the brain particles
      may not have loaded yet — making it look like there's no brain.
      FIX: Particles generated synchronously at script load. Yes,
      there's a ~1s parse stall on slow machines, but the brain is
      GUARANTEED to be present on first paint.

   4. BUG: On return from hologram, material.opacity was being reset
      to 0.9 but GSAP's finishing tween sometimes overrode it.
      FIX: gsap.killTweensOf(material) before ALL manual resets.
      Material properties are then set directly.

   WHAT IS PRESERVED (unchanged):
   - All visual effects and animations
   - Star warp / black hole dive timing
   - Hologram sphere with bloom
   - Brain pull effect (camera z:18→z:3)
   - Phase 3 biological neuron CSS art
   - All keyboard controls
   - Zoom prevention
 ============================================================ */

/* ============================================================
   [DEV 2] PHASE CONTROLLER — keyboard navigation logic
 ============================================================ */
const phases      = document.querySelectorAll(".phase");
let   current     = 0;
let   isAnimating = false;
let   annInitialized       = false;   // Phase 4 ANN init flag
let   tokenInitialized     = false;   // Phase 5 Tokenization init flag
let   embeddingInitialized = false;   // Phase 6 Embedding init flag
let   semanticHubInitialized = false; // Phase 7 Semantic Hub init flag

let navigatingForward  = true;
let fullCycleCompleted = false;

document.addEventListener("keydown", (e) => {
    if (isAnimating) return;
    
    // Prevent shortcut keys from triggering when the user is typing in an input field
    const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
    if (activeTag === 'input' || activeTag === 'textarea') {
        return;
    }

    if (e.key === "ArrowRight" || e.key === " ") {
        navigatingForward = true;
        const next = (current + 1) % phases.length;
        if (current === phases.length - 1 && next === 0) {
            sessionStorage.removeItem("tokenPhaseData");
            fullCycleCompleted = true;
        }
        switchPhaseWithTransition(next);
    }
    if (e.key === "ArrowLeft") {
        navigatingForward = false;
        switchPhaseWithTransition((current - 1 + phases.length) % phases.length);
    }
    if (e.key === "r" || e.key === "R") {
        navigatingForward = false;
        sessionStorage.removeItem("tokenPhaseData");
        switchPhaseWithTransition(0);
    }
});

/* ============================================================
   [DEV 3] STAR FIELD — 2D Canvas particle background
 ============================================================ */
const starsCanvas = document.getElementById("particles");
const sCtx        = starsCanvas.getContext("2d");
starsCanvas.width  = window.innerWidth;
starsCanvas.height = window.innerHeight;

const starList  = [];
const animState = { speedMultiplier: 1 };

for (let i = 0; i < 220; i++) {
    starList.push({
        x:         Math.random() * starsCanvas.width,
        y:         Math.random() * starsCanvas.height,
        size:      Math.random() * 1.6 + 0.2,
        baseSpeed: Math.random() * 0.40 + 0.08
    });
}

function renderStars() {
    sCtx.clearRect(0, 0, starsCanvas.width, starsCanvas.height);
    starList.forEach(star => {
        const stretch = animState.speedMultiplier > 2 ? animState.speedMultiplier : 0;
        if (stretch > 0) {
            sCtx.beginPath();
            sCtx.moveTo(star.x, star.y);
            sCtx.lineTo(star.x, star.y - stretch * 2.5);
            sCtx.strokeStyle = "rgba(255,255,255,0.72)";
            sCtx.lineWidth   = star.size;
            sCtx.stroke();
        } else {
            sCtx.beginPath();
            sCtx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            sCtx.fillStyle   = "white";
            sCtx.shadowBlur  = 6;
            sCtx.shadowColor = "rgba(150,200,255,0.8)";
            sCtx.fill();
        }
        star.y += star.baseSpeed * animState.speedMultiplier;
        if (star.y > starsCanvas.height + 80) {
            star.y = -30;
            star.x = Math.random() * starsCanvas.width;
        }
    });
    requestAnimationFrame(renderStars);
}
renderStars();

/* ============================================================
   [DEV 3] THREE.JS — BRAIN SCENE (Phase 1)

   FIX 1: Light declared as variable FIRST, then added to scene.
   Never chain .position.set() onto scene.add() — that returns
   the Scene object, not the light.

   FIX 2: Particles generated SYNCHRONOUSLY before anything else.
   material.opacity = 0.9 from the very start. The brain is
   always present. No fragile deferred-load chains.
 ============================================================ */
const threeContainer = document.getElementById("three-container");
const scene          = new THREE.Scene();

const camera3 = new THREE.PerspectiveCamera(
    45, window.innerWidth / window.innerHeight, 0.1, 1000
);
camera3.position.set(0, 0, 16);

const renderer3 = new THREE.WebGLRenderer({ alpha: true, antialias: true });
renderer3.setSize(window.innerWidth, window.innerHeight);
threeContainer.appendChild(renderer3.domElement);

/* FIX 1 — declare light separately, add separately */
const brainLight = new THREE.PointLight(0xffffff, 2, 50);
brainLight.position.set(0, 5, 10);
scene.add(brainLight);

const brainGroup = new THREE.Group();
scene.add(brainGroup);

/* Brain surface implicit function */
function evaluateBrainSurface(x, y, z) {
    const scaleX = 5.2, scaleY = 4.2, scaleZ = 6.2;
    let shape = (x*x)/(scaleX*scaleX) + (y*y)/(scaleY*scaleY) + (z*z)/(scaleZ*scaleZ);
    shape += Math.exp(-Math.abs(x) * 4.0) * (y > -1.5 ? 0.35 : 0.0);
    if (z > 0) shape += z * 0.025;
    if (y < -2.2) {
        const cb = (y > -3.8 && z < -1.0 && Math.abs(x) < 3.0) ? 0 : 1.0;
        const st = (Math.abs(x) < 1.0 && z > -1.5 && z < 0.5 && y > -4.5) ? 0 : 1.0;
        if (cb > 0 && st > 0) return 10;
    }
    let w = 0;
    if (y > -2.0) {
        w += Math.sin(x*2.8 + Math.cos(z*2.8)) * Math.sin(y*2.8 + Math.cos(x*2.8)) * Math.sin(z*2.8 + Math.cos(y*2.8)) * 0.12;
        w += Math.sin(x*5.0) * Math.sin(y*5.0) * Math.sin(z*5.0) * 0.03;
    } else {
        if (z < -1.0) w = Math.sin(y * 18.0) * 0.05;
    }
    if (y < 0.5 && y > -2 && Math.abs(x) > 2.5 && z < 2 && z > -2) shape -= 0.06;
    return shape + w;
}

/* FIX 2 — generate SYNCHRONOUSLY, opacity 0.9 from start */
const brainPositions = [];
const brainColors    = [];
let   pCount = 0, pAttempts = 0;

while (pCount < 25000 && pAttempts < 1500000) {
    pAttempts++;
    const x = (Math.random() - 0.5) * 14;
    const y = (Math.random() - 0.5) * 12;
    const z = (Math.random() - 0.5) * 14;
    const val = evaluateBrainSurface(x, y, z);
    if (val > 0.88 && val < 1.0) {
        brainPositions.push(x, y, z);
        if (y < -2.0 && z < -1.0) {
            brainColors.push(0.8, 0.1, 0.9);
        } else if (Math.abs(x) < 0.8 && y > 0) {
            brainColors.push(1.0, 0.5, 0.8);
        } else {
            const mix = Math.random();
            if      (mix < 0.3) brainColors.push(0.0, 0.8, 1.0);
            else if (mix < 0.6) brainColors.push(0.2, 1.0, 1.0);
            else                brainColors.push(0.4, 0.5, 1.0);
        }
        pCount++;
    }
}

const brainGeo = new THREE.BufferGeometry();
brainGeo.setAttribute("position", new THREE.Float32BufferAttribute(brainPositions, 3));
brainGeo.setAttribute("color",    new THREE.Float32BufferAttribute(brainColors, 3));

/* Restored size to 0.085 to create massive additive glow */
const material = new THREE.PointsMaterial({
    size:         0.085,
    vertexColors: true,
    transparent:  true,
    opacity:      1.0,
    blending:     THREE.AdditiveBlending
});

const brain = new THREE.Points(brainGeo, material);
brainGroup.add(brain);

/* Brain rotation flag — separate from isAnimating */
let brainRotating = true;

window.addEventListener("resize", () => {
    camera3.aspect = window.innerWidth / window.innerHeight;
    camera3.updateProjectionMatrix();
    renderer3.setSize(window.innerWidth, window.innerHeight);
});

function animate3D() {
    requestAnimationFrame(animate3D);
    if (brainRotating) {
        brainGroup.rotation.y += 0.002;
        brainGroup.rotation.x  = Math.sin(Date.now() * 0.0004) * 0.05;
    }
    renderer3.render(scene, camera3);
}
animate3D();

/* ============================================================
   [DEV 2 + DEV 3] PHASE TRANSITION ROUTER — GSAP star warp + flashbang
 ============================================================ */
function switchPhaseWithTransition(nextIndex) {
    if (isAnimating) return;
    isAnimating = true;

    // Call exit hooks on the phase we're leaving
    if (current === 4 && typeof window.exitPhase5 === 'function') window.exitPhase5();
    if (current === 5 && typeof window.exitPhase6 === 'function') window.exitPhase6();
    if (current === 6 && typeof window.exitPhase7 === 'function') window.exitPhase7();

    if (current === 0 && nextIndex === 1) { playAntigravityDive(); return; }
    if (current === 1 && nextIndex === 2) { playHologramToNeuronZoom(); return; }
    if (current === 2 && nextIndex === 1) { playReturnToHologram(); return; }

    /* Return to Brain from any phase */
    if (nextIndex === 0) { playReturnToBrainView(); return; }

    /* Standard flashbang / star-warp for all other transitions */
    gsap.to(animState, { speedMultiplier: 65, duration: 0.45, ease: "power3.in" });
    gsap.to("#flashbang", {
        opacity: 1,
        duration: 0.35,
        delay: 0.38,
        onComplete() {
            phases.forEach(p => p.classList.remove("active"));
            phases[nextIndex].classList.add("active");
            current = nextIndex;
            animState.speedMultiplier = 1;

            /* Hide hologram when not on phase 2 */
            if (current !== 1) {
                gsap.to("#hologram-container", {
                    opacity: 0, duration: 0.5,
                    onComplete: () => {
                        document.getElementById("hologram-container").style.display = "none";
                    }
                });
            }

            /* Background stars should ALWAYS be visible as the foundation */
            const starsCanvas = document.getElementById("particles");
            if (starsCanvas) starsCanvas.style.display = "block";

            /* Show / hide phase-specific overlays */
            const annCanvas   = document.getElementById("neuron-canvas");
            const tokenCanvas = document.getElementById("token-canvas");
            const hubCanvas   = document.getElementById("hub-canvas-container");
            
            if (current === 3) {
                if (annCanvas)   annCanvas.style.display   = "block";
                if (tokenCanvas) tokenCanvas.style.display = "none";
                if (hubCanvas)   hubCanvas.style.display   = "none";
            } else if (current === 4) {
                if (annCanvas)   annCanvas.style.display   = "none";
                if (tokenCanvas) tokenCanvas.style.display = "block";
                if (hubCanvas)   hubCanvas.style.display   = "none";
            } else if (current === 6) {
                if (annCanvas)   annCanvas.style.display   = "none";
                if (tokenCanvas) tokenCanvas.style.display = "none";
                if (hubCanvas)   hubCanvas.style.display   = "block";
            } else {
                if (annCanvas)   annCanvas.style.display   = "none";
                if (tokenCanvas) tokenCanvas.style.display = "none";
                if (hubCanvas)   hubCanvas.style.display   = "none";
            }

            gsap.to("#flashbang", { opacity: 0, duration: 0.75, ease: "power1.inOut" });
            playPhaseReveal(nextIndex);
        }
    });
}

/* Expose globally so embedding.js Send-to-Neuron button can call it */
window.switchPhaseWithTransition = switchPhaseWithTransition;

/* ============================================================
   [DEV 3] BLACK HOLE DIVE  (Phase 1 → Phase 2) — GSAP timeline

   Experience:
   • Stars warp to speed immediately
   • Brain RUSHES toward camera (z: 18 → 3, surface only)
   • Vignette blacks out edges fully
   • Particles glow & enlarge as you close in
   • WHITE FLASH at moment of "impact"
   • Scene swaps under flash (invisible)
   • Flash fades revealing hologram from inside the sphere
   Camera NEVER goes past z=3. User never sees brain interior.
 ============================================================ */
function playAntigravityDive() {
  const tl = gsap.timeline();
  brainRotating = false;
  const brainEl = document.getElementById('three-container');
  const holoEl  = document.getElementById('hologram-container');
  holoEl.style.display = 'block';
  holoEl.style.opacity = 0;
  // Accelerate starfield and camera like a lens zoom burst
  tl.to(animState, { speedMultiplier: 80, duration: 0.55, ease: "power4.in" }, 0);
  // Quick lens zoom — camera rushes forward while slightly changing FOV
  tl.to(camera3.position, { z: 4.5, duration: 0.55, ease: "power4.inOut" }, 0);
  tl.to(camera3, {
    fov: 80, duration: 0.55, ease: "power4.inOut",
    onUpdate: () => camera3.updateProjectionMatrix()
  }, 0);
  // Antigravity shimmer: brain pulses outward then releases
  tl.to(brainGroup.scale, { x:1.15, y:1.15, z:1.15, duration:0.35, ease:"power2.out" }, 0.05);
  tl.to(material, {
    opacity: 1, size: 0.10,
    duration: 0.55, ease: "power2.out"
  }, 0);
  // INFO boxes + text lifted away like gravity reversal
  tl.to(".text-wrapper, .info-box", { y:-150, opacity:0, duration:0.4, ease:"power2.in" }, 0);
  // Gentle vignette and chromatic blur instead of white flash
  tl.to("#vignette-transition", { opacity:0.85, duration:0.45, ease:"sine.out" }, 0.2);
  
  // Antigravity shimmer gradient invert
  tl.to("#vignette-transition", { 
    filter: "invert(1)", 
    duration: 0.15, 
    yoyo: true, 
    repeat: 1 
  }, 0.4);

  // Scene swap at peak zoom
  tl.call(() => {
    document.getElementById("three-container").style.display = "none";
    phases.forEach(p => p.classList.remove("active"));
    phases[1].classList.add("active");
    current = 1;
    // Reset camera and material instantly (for clean return)
    material.size = 0.085; material.opacity = 0.9;
    camera3.position.set(0, 0, 16);
    camera3.fov = 45; camera3.updateProjectionMatrix();
    gsap.set(".text-wrapper, .info-box", { y: 0, opacity: 1 }); // reset elements moved upwards
  }, [], 0.55);
  // Reveal hologram through the blur
  tl.to("#vignette-transition", { opacity: 0, duration: 0.6, ease: "power2.out" }, 0.7);
  tl.to(holoEl, { opacity: 1, duration: 0.8, ease: "power2.out" }, 0.6);
  tl.call(() => {
    playPhaseReveal(1);
    gsap.to(animState, { speedMultiplier: 1, duration: 1.0, ease: "power2.out" });
    isAnimating = false;
  }, [], 1.2);
}

function playHologramToNeuronZoom() {
  const holoEl = document.getElementById('hologram-container');
  const sun = document.getElementById('sun-overlay');
  const neuronArt = document.getElementById('phase3-3d-container');
  const neuronHint = document.getElementById('phase3-interaction-hint');
  const tl = gsap.timeline();

  // 1. Zoom into the Hologram nodes
  // We keep the background stars steady to "remove the white lines"
  tl.to(animState, { speedMultiplier: 1.5, duration: 1.2, ease: "power2.in" }, 0);
  tl.to(holoGroup.scale, { x: 8, y: 8, z: 8, duration: 1.5, ease: "power3.in" }, 0);
  tl.to(holoGroup.rotation, { y: "+=2.5", duration: 1.5, ease: "power3.in" }, 0);
  
  // Fade out the hologram lines and nodes to clear the view
  tl.to(holoEl, { opacity: 0, duration: 1.0, ease: "power2.in" }, 0.4);

  // 2. The "Sun" glow acts as a soft transition portal (no sharp flashback)
  tl.to(sun, { 
    opacity: 0.7, 
    width: "120vmax", 
    height: "120vmax", 
    duration: 1.2, 
    ease: "sine.inOut" 
  }, 0.1);

  // 3. Switch scene under the soft glow
  tl.call(() => {
    holoEl.style.display = "none";
    phases.forEach(p => p.classList.remove("active"));
    phases[2].classList.add("active");
    current = 2;
    
    // Prepare the neuron for emergence
    gsap.set(neuronArt, { scale: 0, opacity: 0, display: 'block' });
    gsap.set(neuronHint, { opacity: 0, display: 'none' });
    gsap.to("#celestial-stars", { opacity: 1, duration: 1.5 });
  }, [], 0.9);

  // 4. The Neuron "comes out" from the center of the glow
  tl.to(neuronArt, { 
    scale: 1, 
    opacity: 1, 
    duration: 1.4, 
    ease: "back.out(1.4)" 
  }, 1.0);

  // 4b. Show the interaction hint shortly after
  tl.to(neuronHint, { display: 'flex', opacity: 1, duration: 1.0 }, 2.0);

  // 5. Fade out the portal glow
  tl.to(sun, { opacity: 0, duration: 1.5, ease: "power2.out" }, 1.1);
  
  tl.call(() => {
    playPhaseReveal(2);
    gsap.to(animState, { speedMultiplier: 1, duration: 1.5, ease: "power2.out" });
    isAnimating = false;
  }, [], 2.4);
}

function playReturnToHologram() {
  const holoEl = document.getElementById('hologram-container');
  const sun = document.getElementById('sun-overlay');
  const neuronArt = document.getElementById('phase3-3d-container');
  const neuronHint = document.getElementById('phase3-interaction-hint');
  const tl = gsap.timeline();

  isAnimating = true;

  // 1. Show hologram container (hidden in phase 2 -> 3)
  holoEl.style.display = "block";
  holoEl.style.opacity = 0;

  // 2. The "Sun" glow acts as a soft transition portal
  tl.to(sun, { 
    opacity: 0.7, 
    width: "120vmax", 
    height: "120vmax", 
    duration: 1.0, 
    ease: "sine.inOut" 
  }, 0);

  // 3. Zoom out of the Neuron art and hide hint
  tl.to([neuronArt, neuronHint], { 
    scale: 0, 
    opacity: 0, 
    duration: 0.8, 
    ease: "power2.in" 
  }, 0);

  // 4. Switch scene under the soft glow
  tl.call(() => {
    phases.forEach(p => p.classList.remove("active"));
    phases[1].classList.add("active");
    current = 1;
    
    // Reset hologram scale to zoomed-in state for the zoom-out animation
    gsap.set(holoGroup.scale, { x: 8, y: 8, z: 8 });
    holoEl.style.opacity = 1;
    
    gsap.to("#celestial-stars", { opacity: 0, duration: 1.0 });
  }, [], 0.5);

  // 5. The Hologram "comes back" (zooms out)
  tl.to(holoGroup.scale, { x: 1, y: 1, z: 1, duration: 1.5, ease: "power3.out" }, 0.6);
  tl.to(holoGroup.rotation, { y: "-=1.5", duration: 1.5, ease: "power3.out" }, 0.6);

  // 6. Fade out the portal glow
  tl.to(sun, { opacity: 0, duration: 1.2, ease: "power2.out" }, 0.8);
  
  tl.call(() => {
    playPhaseReveal(1);
    gsap.to(animState, { speedMultiplier: 1, duration: 1.5, ease: "power2.out" });
    isAnimating = false;
  }, [], 2.0);
}

/* ============================================================
   [DEV 3] RETURN TO BRAIN  (Phase 2 → Phase 1) — GSAP + Three.js reset

   FIX 4: gsap.killTweensOf() on ALL animated targets BEFORE
   any manual property reset. This prevents any finishing
   GSAP tween from overwriting the reset values milliseconds
   later (the root cause of the invisible-on-return bug).
 ============================================================ */
function playReturnToBrainView() {
    gsap.to(animState, { speedMultiplier: 65, duration: 0.45, ease: "power3.in" });

    gsap.to("#flashbang", {
        opacity: 1,
        duration: 0.35,
        delay: 0.38,
        onComplete() {
            const holoEl  = document.getElementById('hologram-container');
            const brainEl = document.getElementById('three-container');

            /* Hide hologram and ANN */
            holoEl.style.display  = 'none';
            holoEl.style.opacity  = '0';
            const annCanvas = document.getElementById("neuron-canvas");
            if (annCanvas) annCanvas.style.display = "none";
            const tokenCanvas = document.getElementById("token-canvas");
            if (tokenCanvas) tokenCanvas.style.display = "none";

            /* Show brain */
            brainEl.style.display = 'block';
            brainEl.style.opacity = '1';

            /* Kill ALL in-flight tweens before resetting */
            gsap.killTweensOf(material);
            gsap.killTweensOf(camera3);
            gsap.killTweensOf(camera3.position);
            gsap.killTweensOf(brainGroup);
            gsap.killTweensOf(brainGroup.scale);

            /* Hard-reset camera to external position */
            camera3.position.set(0, 0, 16);
            camera3.rotation.set(0, 0, 0);
            camera3.fov = 45;
            camera3.updateProjectionMatrix();

            /* Hard-reset brain material — fully visible */
            material.opacity = 1.0;
            material.size    = 0.085;
            brainGroup.scale.set(1, 1, 1);

            /* Resume rotation */
            brainRotating = true;

            animState.speedMultiplier = 1;
            phases.forEach(p => p.classList.remove("active"));
            phases[0].classList.add("active");
            current = 0;

            gsap.to("#flashbang", { opacity: 0, duration: 0.75, ease: "power1.inOut" });
            playPhaseReveal(0);
        }
    });
}

/* ============================================================
   [DEV 3] PHASE REVEAL — GSAP bounce-in for text panels
 ============================================================ */
function playPhaseReveal(index) {
    const panels = phases[index].querySelectorAll(".text-wrapper");
    gsap.set(panels, { y: -85, opacity: 0 });

    if (index === 0) {
        /* Brain phase — ensure container is visible */
        const brainEl = document.getElementById("three-container");
        brainEl.style.display = "block";
        brainEl.style.opacity = "1";
        gsap.fromTo(camera3, 
            { fov: 55, onUpdate: () => camera3.updateProjectionMatrix() }, 
            { fov: 45, duration: 1.0, ease:"power3.out" }
        );
        gsap.fromTo(material, 
            { size: 0.07 }, 
            { size: 0.085, duration: 1.0, ease: "power2.out" }
        );
        gsap.to(panels, {
            y: 0, opacity: 1, duration: 1.1, delay: 0.2,
            ease: "bounce.out", stagger: 0.22,
            onComplete() { isAnimating = false; }
        });
    } else if (index === 1) {
        gsap.to(panels, {
            y: 0, opacity: 1, duration: 0.85,
            ease: "bounce.out", stagger: 0.18,
            onComplete() { isAnimating = false; }
        });
    } else if (index === 3) {
        /* Phase 4 — ANN scene: hide brain, trigger ANN init */
        gsap.to("#three-container", {
            opacity: 0, duration: 0.45,
            onComplete: () => {
                document.getElementById("three-container").style.display = "none";
            }
        });
        /* ANN info boxes slide up — driven by demo.js initPhase4() */
        if (!annInitialized && typeof window.initPhase4 === "function") {
            window.initPhase4();
            annInitialized = true;
        } else if (annInitialized && typeof window.reinitPhase4 === "function") {
            window.reinitPhase4();
        }
        /* isAnimating released after brief delay so phase feels snappy */
        gsap.to({}, { duration: 0.5, onComplete: () => { isAnimating = false; } });
    } else if (index === 4) {
        /* Phase 5 — Tokenization scene */
        gsap.to("#three-container", {
            opacity: 0, duration: 0.45,
            onComplete: () => {
                document.getElementById("three-container").style.display = "none";
            }
        });
        const isForwardCycle = navigatingForward && fullCycleCompleted;
        if (!tokenInitialized && typeof window.initPhase5 === "function") {
            window.initPhase5(isForwardCycle);
            tokenInitialized = true;
            if (isForwardCycle) fullCycleCompleted = false;
        } else if (tokenInitialized && typeof window.reinitPhase5 === "function") {
            window.reinitPhase5(isForwardCycle);
            if (isForwardCycle) fullCycleCompleted = false;
        }
        gsap.to({}, { duration: 0.5, onComplete: () => { isAnimating = false; } });
    } else if (index === 5) {
        /* Phase 6 — Embedding Matrix Lookup */
        gsap.to("#three-container", {
            opacity: 0, duration: 0.45,
            onComplete: () => {
                document.getElementById("three-container").style.display = "none";
            }
        });
        if (!embeddingInitialized && typeof window.initPhase6 === "function") {
            window.initPhase6();
            embeddingInitialized = true;
        } else if (embeddingInitialized && typeof window.reinitPhase6 === "function") {
            window.reinitPhase6();
        }
        gsap.to({}, { duration: 0.5, onComplete: () => { isAnimating = false; } });
    } else if (index === 6) {
        /* Phase 7 — Semantic Hub */
        gsap.to("#three-container", {
            opacity: 0, duration: 0.45,
            onComplete: () => {
                document.getElementById("three-container").style.display = "none";
            }
        });
        if (!semanticHubInitialized && typeof window.initPhase7 === "function") {
            window.initPhase7();
            semanticHubInitialized = true;
        } else if (semanticHubInitialized && typeof window.reinitPhase7 === "function") {
            window.reinitPhase7();
        }
        gsap.to({}, { duration: 0.5, onComplete: () => { isAnimating = false; } });
    } else {
        /* Other phases — hide brain, show CSS art */
        gsap.to("#three-container", {
            opacity: 0, duration: 0.45,
            onComplete: () => {
                document.getElementById("three-container").style.display = "none";
            }
        });
        gsap.to(panels, {
            y: 0, opacity: 1, duration: 0.85,
            ease: "bounce.out", stagger: 0.18,
            onComplete() { isAnimating = false; }
        });
    }
}

/* ============================================================
   [DEV 3] HOLOGRAM SCENE  (Phase 2) — Three.js + EffectComposer
   cameraHolo at (0,0,0) = inside the 50-unit sphere
 ============================================================ */
const holoContainer = document.getElementById('hologram-container');
const sceneHolo     = new THREE.Scene();

const cameraHolo = new THREE.PerspectiveCamera(
    75, window.innerWidth / window.innerHeight, 0.01, 2000
);
cameraHolo.position.set(0, 0, 0);

const rendererHolo = new THREE.WebGLRenderer({ antialias: true, alpha: true });
rendererHolo.setPixelRatio(Math.min(window.devicePixelRatio, 2));
rendererHolo.setSize(window.innerWidth, window.innerHeight);
rendererHolo.toneMapping         = THREE.ReinhardToneMapping;
rendererHolo.toneMappingExposure = 1.2;
holoContainer.appendChild(rendererHolo.domElement);

const composerHolo = new THREE.EffectComposer(rendererHolo);
composerHolo.addPass(new THREE.RenderPass(sceneHolo, cameraHolo));
const bloomPass = new THREE.UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    2.0, 0.8, 0.2
);
composerHolo.addPass(bloomPass);

const holoGroup = new THREE.Group();
sceneHolo.add(holoGroup);

const NEURON_COUNT = 900;
const SPHERE_R     = 50;

function gridLayers() {
    const pts = [];
    const layerIndices = [];
    // Scaled up layers to cover ~80% of the phase
    const layers = [
        { x: -80, rows: 7,  cols: 7,  spacing: 9 },     // Layer 0: Input (49)
        { x: -25, rows: 20, cols: 20, spacing: 4.5 }, // Layer 1: Dense Hidden (400)
        { x: 25,  rows: 20, cols: 20, spacing: 4.5 }, // Layer 2: Dense Hidden (400)
        { x: 80,  rows: 9,  cols: 9,  spacing: 8 }      // Layer 3: Output (81)
    ]; // Total = 930 neurons
    
    layers.forEach((layer, lIdx) => {
        const startY = -((layer.rows - 1) * layer.spacing) / 2;
        const startZ = -((layer.cols - 1) * layer.spacing) / 2;
        
        for (let r = 0; r < layer.rows; r++) {
            for (let c = 0; c < layer.cols; c++) {
                // Add tiny jitter so it's not a perfect sterile grid
                const jY = (Math.random() - 0.5) * 0.5;
                const jZ = (Math.random() - 0.5) * 0.5;
                pts.push(new THREE.Vector3(
                    layer.x,
                    startY + r * layer.spacing + jY,
                    startZ + c * layer.spacing + jZ
                ));
                layerIndices.push(lIdx);
            }
        }
    });
    return { pts, layerIndices };
}

const { pts: neuronPositions, layerIndices } = gridLayers();
const ACTUAL_COUNT = neuronPositions.length;

// 1. Inner Core (Solid glowing cyan/blue)
const coreGeo  = new THREE.SphereGeometry(1.0, 12, 12); // Scaled up
const coreMat  = new THREE.MeshBasicMaterial({ color: 0x00ffff });
const coreMesh = new THREE.InstancedMesh(coreGeo, coreMat, ACTUAL_COUNT);
coreMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
holoGroup.add(coreMesh);

// 2. Outer Shell (Glassy translucent bubble)
const shellGeo = new THREE.SphereGeometry(2.2, 16, 16); // Scaled up
const shellMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0.1,
    roughness: 0.1,
    transmission: 0.9,
    ior: 1.5,
    transparent: true,
    opacity: 1.0,
    side: THREE.DoubleSide
});
const shellMesh = new THREE.InstancedMesh(shellGeo, shellMat, ACTUAL_COUNT);
shellMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
holoGroup.add(shellMesh);

const dummy = new THREE.Object3D();

for (let i = 0; i < ACTUAL_COUNT; i++) {
    dummy.position.copy(neuronPositions[i]);
    dummy.scale.setScalar(1.0);
    dummy.updateMatrix();
    coreMesh.setMatrixAt(i, dummy.matrix);
    shellMesh.setMatrixAt(i, dummy.matrix);
}
coreMesh.instanceMatrix.needsUpdate = true;
shellMesh.instanceMatrix.needsUpdate = true;

const linePositions = [];
const lineColors    = [];

for (let i = 0; i < ACTUAL_COUNT; i++) {
    const lIdx = layerIndices[i];
    if (lIdx === 3) continue; // Output layer has no forward connections
    
    // Find all nodes in the next layer
    const nextLayerNodes = [];
    for (let j = i + 1; j < ACTUAL_COUNT; j++) {
        if (layerIndices[j] === lIdx + 1) nextLayerNodes.push(j);
        if (layerIndices[j] > lIdx + 1) break; // Optimization
    }
    
    // Create dense red web connecting to next layer (15 connections per node)
    const numConnections = Math.min(15, nextLayerNodes.length);
    for (let k = 0; k < numConnections; k++) {
        // Pick random target in next layer
        const targetJ = nextLayerNodes[Math.floor(Math.random() * nextLayerNodes.length)];
        const pi = neuronPositions[i];
        const pj = neuronPositions[targetJ];
        
        linePositions.push(pi.x, pi.y, pi.z, pj.x, pj.y, pj.z);
        // Intense bright red colors matching the reference
        const intensity = 0.5 + Math.random() * 0.5;
        lineColors.push(intensity, 0, 0, intensity, 0, 0); 
    }
}

const lineGeo = new THREE.BufferGeometry();
lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
lineGeo.setAttribute('color',    new THREE.Float32BufferAttribute(lineColors, 3));

const lineMat = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent:  true,
    opacity:      0.45,
    blending:     THREE.AdditiveBlending,
    depthWrite:   false,
    linewidth:    1
});
holoGroup.add(new THREE.LineSegments(lineGeo, lineMat));

// Orbit Controls for Interactive Zoom/Pan
const holoOrbit = new THREE.OrbitControls(cameraHolo, rendererHolo.domElement);
holoOrbit.enableDamping = true;
holoOrbit.dampingFactor = 0.05;
holoOrbit.autoRotate = true;
holoOrbit.autoRotateSpeed = 1.0;
// Pulled back slightly but framing a much larger object, covering ~80% of screen
cameraHolo.position.set(0, 0, 120);

function animateHolo() {
    requestAnimationFrame(animateHolo);
    if (current === 1) {
        holoOrbit.update();
        composerHolo.render();
    }
}
animateHolo();

window.addEventListener('resize', () => {
    const w = window.innerWidth, h = window.innerHeight;
    cameraHolo.aspect = w / h;
    cameraHolo.updateProjectionMatrix();
    rendererHolo.setSize(w, h);
    composerHolo.setSize(w, h);
});

/* ============================================================
   [DEV 2] ZOOM PREVENTION — keyboard/scroll accessibility
 ============================================================ */
document.addEventListener('wheel', e => {
    if (e.ctrlKey) e.preventDefault();
}, { passive: false });

document.addEventListener('keydown', e => {
    if (e.ctrlKey && ['=', '-', '+', '_'].includes(e.key)) e.preventDefault();
});

/* ============================================================
   [DEV 3] BOOT — show brain + trigger Phase 1 reveal
   Brain is already built (synchronous generation above).
   Just show the container and start the reveal.
 ============================================================ */
const bootBrainEl = document.getElementById("three-container");
bootBrainEl.style.display = "block";
bootBrainEl.style.opacity = "1";
playPhaseReveal(0);