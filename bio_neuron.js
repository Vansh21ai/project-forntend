/* ============================================================
   [DEV 3] [PHASE 3] PROCEDURAL 3D BIOLOGICAL NEURON
   Three.js scene: soma, dendrites, axon, myelin sheaths, terminals
   GSAP: interaction hint fade-out
 ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("phase3-3d-container");
    if (!container) return;

    // SCENE SETUP
    const scene = new THREE.Scene();
    scene.background = null; // transparent to show stars

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 35);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // CONTROLS
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.0;
    controls.enablePan = false;
    controls.enableZoom = true;
    controls.minDistance = 10;
    controls.maxDistance = 60;

    // Hide hint on interaction
    controls.addEventListener('start', () => {
        const hint = document.getElementById('phase3-interaction-hint');
        if (hint) {
            gsap.to(hint, { opacity: 0, duration: 0.5, onComplete: () => hint.style.display = 'none' });
        }
    });

    // LIGHTING
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(ambientLight);

    const blueLight = new THREE.PointLight(0x00d4ff, 1.5, 50);
    blueLight.position.set(5, 5, 10);
    scene.add(blueLight);

    const purpleLight = new THREE.PointLight(0xcc00ff, 1.2, 50);
    purpleLight.position.set(-5, -5, -10);
    scene.add(purpleLight);

    const rimLight = new THREE.PointLight(0xffffff, 0.8, 100);
    rimLight.position.set(0, 10, -20);
    scene.add(rimLight);

    // MAIN GROUP
    const neuronGroup = new THREE.Group();
    scene.add(neuronGroup);

    // MATERIALS
    const blueSomaMat = new THREE.MeshPhysicalMaterial({
        color: 0x0088ff,
        emissive: 0x0044aa,
        emissiveIntensity: 0.6,
        roughness: 0.1,
        metalness: 0.1,
        transparent: true,
        opacity: 0.85,
        transmission: 0.5, // glass-like
        clearcoat: 1.0,
        clearcoatRoughness: 0.1
    });

    const blueAxonMat = new THREE.MeshStandardMaterial({
        color: 0x00aaff,
        emissive: 0x002288,
        emissiveIntensity: 0.8,
        roughness: 0.3,
        metalness: 0.2
    });

    const nucleusMat = new THREE.MeshStandardMaterial({
        color: 0xff00ff,
        emissive: 0xff00ff,
        emissiveIntensity: 0.9,
        roughness: 0.2,
        metalness: 0.1
    });

    const myelinMat = new THREE.MeshPhysicalMaterial({
        color: 0xffaa00,
        emissive: 0x6600aa,
        emissiveIntensity: 0.5,
        roughness: 0.3,
        metalness: 0.4,
        transparent: true,
        opacity: 0.9,
        clearcoat: 0.5
    });

    // 1. SOMA (Cell Body)
    const somaGeo = new THREE.SphereGeometry(3, 64, 64);
    // Add some noise to soma to make it organic
    const posAttribute = somaGeo.attributes.position;
    const vertex = new THREE.Vector3();
    for (let i = 0; i < posAttribute.count; i++) {
        vertex.fromBufferAttribute(posAttribute, i);
        const noise = Math.sin(vertex.x * 2) * Math.cos(vertex.y * 2) * Math.sin(vertex.z * 2) * 0.2;
        vertex.add(vertex.clone().normalize().multiplyScalar(noise));
        posAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
    somaGeo.computeVertexNormals();
    const soma = new THREE.Mesh(somaGeo, blueSomaMat);
    neuronGroup.add(soma);

    // 2. NUCLEUS
    const nucleusGeo = new THREE.SphereGeometry(1.2, 32, 32);
    const nucleus = new THREE.Mesh(nucleusGeo, nucleusMat);
    nucleus.position.set(0, 0, 0);
    neuronGroup.add(nucleus);

    // Helper: Create a curve tube
    function createTube(points, thickness, material) {
        const curve = new THREE.CatmullRomCurve3(points);
        const tubeGeo = new THREE.TubeGeometry(curve, 20, thickness, 8, false);
        return new THREE.Mesh(tubeGeo, material);
    }

    // 3. DENDRITES (Branching out from Soma)
    const numDendrites = 8;
    for (let i = 0; i < numDendrites; i++) {
        const angle = (i / numDendrites) * Math.PI * 2;
        const radius = 2.8;
        // Don't put dendrites exactly where the axon goes (right side, angle ~0)
        if (angle > -0.5 && angle < 0.5) continue;

        const startX = Math.cos(angle) * radius;
        const startY = Math.sin(angle) * radius;
        
        // Base branch
        const p1 = new THREE.Vector3(startX, startY, (Math.random() - 0.5) * 2);
        const p2 = new THREE.Vector3(startX * 2, startY * 2, p1.z + (Math.random() - 0.5) * 3);
        const p3 = new THREE.Vector3(startX * 3, startY * 3, p2.z + (Math.random() - 0.5) * 4);
        
        neuronGroup.add(createTube([p1, p2, p3], 0.4, blueAxonMat));

        // Sub-branches
        for (let j = 0; j < 2; j++) {
            const bp2 = new THREE.Vector3(p2.x + (Math.random() - 0.5)*3, p2.y + (Math.random() - 0.5)*3, p2.z + (Math.random() - 0.5)*3);
            const bp3 = new THREE.Vector3(bp2.x * 1.2, bp2.y * 1.2, bp2.z * 1.2);
            neuronGroup.add(createTube([p2, bp2, bp3], 0.2, blueAxonMat));
        }
    }

    // 4. AXON
    const axonLength = 22;
    const axonStart = 2.5;
    const axonPoints = [
        new THREE.Vector3(axonStart, 0, 0),
        new THREE.Vector3(axonStart + 5, -1, 0),
        new THREE.Vector3(axonStart + 12, -0.5, 1),
        new THREE.Vector3(axonStart + axonLength, 0, 0)
    ];
    const axonCurve = new THREE.CatmullRomCurve3(axonPoints);
    const axonGeo = new THREE.TubeGeometry(axonCurve, 64, 0.5, 16, false);
    const axon = new THREE.Mesh(axonGeo, blueAxonMat);
    neuronGroup.add(axon);

    // 5. MYELIN SHEATHS
    const numSheaths = 5;
    const sheathSpacing = 0.15; // proportion along curve
    const sheathLength = 0.12;
    
    for (let i = 0; i < numSheaths; i++) {
        const uStart = 0.1 + i * sheathSpacing;
        const uEnd = uStart + sheathLength;
        if (uEnd > 0.95) break;

        const sheathPoints = [];
        for (let t = uStart; t <= uEnd; t += 0.01) {
            sheathPoints.push(axonCurve.getPoint(t));
        }
        const sheathCurve = new THREE.CatmullRomCurve3(sheathPoints);
        const sheathGeo = new THREE.TubeGeometry(sheathCurve, 16, 0.75, 16, false);
        const sheath = new THREE.Mesh(sheathGeo, myelinMat);
        neuronGroup.add(sheath);
    }

    // 6. AXON TERMINALS
    const termBase = axonCurve.getPoint(1.0);
    for (let i = 0; i < 3; i++) {
        const branchAngle = (i - 1) * 0.5; // Spread out
        const p1 = termBase;
        const p2 = new THREE.Vector3(
            termBase.x + Math.cos(branchAngle) * 2,
            termBase.y + Math.sin(branchAngle) * 2,
            termBase.z + (Math.random() - 0.5) * 2
        );
        const p3 = new THREE.Vector3(
            p2.x + Math.cos(branchAngle) * 2 + Math.random(),
            p2.y + Math.sin(branchAngle) * 2 + Math.random(),
            p2.z + (Math.random() - 0.5) * 2
        );
        neuronGroup.add(createTube([p1, p2, p3], 0.25, blueAxonMat));
        
        // Terminal button (synapse)
        const btnGeo = new THREE.SphereGeometry(0.5, 16, 16);
        const btn = new THREE.Mesh(btnGeo, blueAxonMat);
        btn.position.copy(p3);
        neuronGroup.add(btn);
        
        // Tiny sub-branch
        const sp3 = new THREE.Vector3(p2.x + 1, p2.y - 1, p2.z + 1);
        neuronGroup.add(createTube([p2, sp3], 0.15, blueAxonMat));
        const sBtn = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 16), blueAxonMat);
        sBtn.position.copy(sp3);
        neuronGroup.add(sBtn);
    }

    // Center the neuron group nicely
    neuronGroup.position.x = -8;

    // RESIZE EVENT
    window.addEventListener("resize", () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // RENDER LOOP
    const clock = new THREE.Clock();

    function animate() {
        requestAnimationFrame(animate);
        
        // Only render if container is visible (saves GPU)
        if (container.style.display !== "none") {
            const elapsed = clock.getElapsedTime();
            
            // Subtle floating effect if not dragging
            if (controls.autoRotate) {
                neuronGroup.position.y = Math.sin(elapsed * 1.5) * 0.5;
            }
            
            controls.update();
            renderer.render(scene, camera);
        }
    }
    
    animate();
});