let scene, camera, renderer, controls;
let surfaceMesh, wireframeMesh;

function init() {
    const container = document.getElementById('canvas-container');

    // 1. Scene Setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color('#0f172a');
    // Fog has been removed to keep the view clear to the edges

    // 2. Camera
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(12, 10, 15);

    // 3. Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // optimize for high DPI
    container.appendChild(renderer.domElement);

    // 4. Controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(20, 30, 10);
    scene.add(dirLight);

    const backLight = new THREE.DirectionalLight(0xffffff, 0.3);
    backLight.position.set(-20, 10, -20);
    scene.add(backLight);

    // 6. Grid and Axes
    const gridHelper = new THREE.GridHelper(50, 50, 0x334155, 0x1e293b);
    gridHelper.position.y = -0.01; // slightly below 0 to avoid z-fighting
    scene.add(gridHelper);

    // Custom thick axes
    const axesHelper = new THREE.AxesHelper(15);
    // Red=X(A), Green=Y(Output), Blue=Z(B)
    scene.add(axesHelper);

    // 7. Initial Plot
    updatePlot();

    // 8. Event Listeners
    window.addEventListener('resize', onWindowResize);
    setupUI();

    // 9. Start Loop
    animate();
}

function updatePlot() {
    const equationStr = document.getElementById('equation-input').value;
    const errorMsg = document.getElementById('error-msg');
    const range = parseFloat(document.getElementById('grid-range').value) || 5;
    const yLimit = parseFloat(document.getElementById('y-limit').value) || 10;
    const gridSegments = parseInt(document.getElementById('grid-resolution').value) || 120;

    let compiledExpr;

    // 1. Parse Mathematical Equation
    try {
        // Ensure variables A and B are used, or fallback if user types x and y
        compiledExpr = math.compile(equationStr);
        // Test evaluation to catch syntax errors early
        compiledExpr.evaluate({ A: 0, B: 0, x: 0, y: 0 });
        errorMsg.innerText = ''; // Clear errors
        document.querySelector('.math-input-wrapper').style.borderColor = '#38bdf8';
    } catch (err) {
        errorMsg.innerText = "Invalid equation: " + err.message;
        document.querySelector('.math-input-wrapper').style.borderColor = '#ef4444';
        return; // Stop if invalid
    }

    // 2. Clear old meshes
    if (surfaceMesh) {
        scene.remove(surfaceMesh);
        surfaceMesh.geometry.dispose();
        surfaceMesh.material.dispose();
    }
    if (wireframeMesh) {
        scene.remove(wireframeMesh);
        wireframeMesh.geometry.dispose();
        wireframeMesh.material.dispose();
    }

    // 3. Create new Geometry
    // PlaneGeometry creates a flat grid in XY. We will rotate it to XZ.
    const geometry = new THREE.PlaneGeometry(range * 2, range * 2, gridSegments, gridSegments);
    geometry.rotateX(-Math.PI / 2); // Lay flat on X-Z plane

    const positions = geometry.attributes.position;
    const colors = [];
    const colorObj = new THREE.Color();

    // Variables for color mapping
    let minY = Infinity;
    let maxY = -Infinity;
    const yValues = [];

    // 4. Evaluate Equation for every vertex
    for (let i = 0; i < positions.count; i++) {
        let x = positions.getX(i); // This is A
        let z = positions.getZ(i); // This is B
        let y = 0;

        try {
            // Evaluate equation giving it A, B (and x, y as fallbacks)
            let result = compiledExpr.evaluate({ A: x, B: z, x: x, y: z, a: x, b: z });

            // Handle Complex numbers (e.g. square roots of negatives)
            if (result && typeof result === 'object' && result.re !== undefined) {
                y = result.re; // Just take the real part for visualization
            } else if (typeof result === 'number') {
                y = result;
            } else {
                y = 0;
            }

            // Handle undefined/NaN
            if (!Number.isFinite(y)) y = 0;

        } catch (err) {
            y = 0;
        }

        // CLAMPING to prevent asymptotes (like tan) from breaking the camera view
        if (y > yLimit) y = yLimit;
        if (y < -yLimit) y = -yLimit;

        yValues.push(y);
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
    }

    // 5. Apply Heights and Colors
    for (let i = 0; i < positions.count; i++) {
        let y = yValues[i];
        positions.setY(i, y);

        // Color gradient based on height
        // Normalize height between 0 and 1
        let normalizedY = (maxY === minY) ? 0.5 : (y - minY) / (maxY - minY);

        // HSL: Hue goes from 0.7 (Purple/Blue) at bottom to 0.0 (Red) at top
        let hue = 0.7 - (normalizedY * 0.7);
        colorObj.setHSL(hue, 1.0, 0.5);
        colors.push(colorObj.r, colorObj.g, colorObj.b);
    }

    // Update geometry attributes
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    positions.needsUpdate = true;
    geometry.computeVertexNormals(); // Crucial for lighting to reflect off hills/valleys

    // 6. Create Materials and Meshes
    const material = new THREE.MeshStandardMaterial({
        vertexColors: true,     // Use the colors we just generated
        side: THREE.DoubleSide, // Viewable from below
        roughness: 0.4,
        metalness: 0.1,
        flatShading: false      // Smooth shading
    });

    surfaceMesh = new THREE.Mesh(geometry, material);
    scene.add(surfaceMesh);

    // Add a subtle wireframe overlaid on top to show the 3D topology better
    const wireframeMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        wireframe: true,
        transparent: true,
        opacity: 0.05
    });
    wireframeMesh = new THREE.Mesh(geometry, wireframeMaterial);
    // Offset slightly to prevent z-fighting with the solid surface
    wireframeMesh.position.y += 0.02;
    scene.add(wireframeMesh);
}

function setupUI() {
    const input = document.getElementById('equation-input');
    const rangeInput = document.getElementById('grid-range');
    const limitInput = document.getElementById('y-limit');
    const resInput = document.getElementById('grid-resolution');
    const resVal = document.getElementById('res-val');
    const examples = document.querySelectorAll('.example-btn');

    // Debounce function to prevent re-calculating on every single keystroke instantly
    let timeout = null;
    function debouncedUpdate() {
        clearTimeout(timeout);
        timeout = setTimeout(updatePlot, 300);
    }

    input.addEventListener('input', debouncedUpdate);
    rangeInput.addEventListener('input', debouncedUpdate);
    limitInput.addEventListener('input', debouncedUpdate);

    // Update the text label instantly, but debounce the heavy 3D rendering
    resInput.addEventListener('input', (e) => {
        resVal.innerText = e.target.value;
        debouncedUpdate();
    });

    // Example buttons
    examples.forEach(btn => {
        btn.addEventListener('click', (e) => {
            input.value = e.target.innerText;
            updatePlot();
        });
    });
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    controls.update(); // required if controls.enableDamping is true
    renderer.render(scene, camera);
}

// Initialize everything when the window loads
window.onload = init;
