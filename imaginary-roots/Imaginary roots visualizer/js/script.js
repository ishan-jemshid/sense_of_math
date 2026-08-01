window.onload = function () {
    // --- Scene Setup ---
    const container = document.getElementById('canvas-container');
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#111827');

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 5000);
    camera.position.set(6, 5, 8);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    // Enable clipping so the surface doesn't block the view
    renderer.localClippingEnabled = true;
    container.appendChild(renderer.domElement);

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 0, 0);
    // Allow zooming in close and pulling far back out
    controls.minDistance = 0.5;
    controls.maxDistance = 2000;

    // --- Lighting ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    scene.add(directionalLight);

    // --- Axes and Grid --- 100x100 grid, one unit per cell
    const gridHelper = new THREE.GridHelper(100, 100, 0x4b5563, 0x374151);
    gridHelper.position.y = 0;
    scene.add(gridHelper);

    const axesHelper = new THREE.AxesHelper(50);
    scene.add(axesHelper);

    // Base properties — curve & surface both stretch to the grid's edge (±50)
    const curveRange = 50;
    const surfaceRange = 50;
    const segments = 300;

    // Clip planes keep the curves/surface from rocketing off into empty space
    const clipPlaneTop = new THREE.Plane(new THREE.Vector3(0, -1, 0), 20); // Clip above y=20
    const clipPlaneBottom = new THREE.Plane(new THREE.Vector3(0, 1, 0), 20); // Clip below y=-20

    // Reusable Geometries/Materials
    const realCurveMaterial = new THREE.LineBasicMaterial({
        color: 0xef4444, linewidth: 3, clippingPlanes: [clipPlaneTop, clipPlaneBottom]
    });
    const imagCurveMaterial = new THREE.LineBasicMaterial({
        color: 0x3b82f6, linewidth: 3, clippingPlanes: [clipPlaneTop, clipPlaneBottom]
    });

    const realCurveGeometry = new THREE.BufferGeometry();
    const imagCurveGeometry = new THREE.BufferGeometry();

    const realCurve = new THREE.Line(realCurveGeometry, realCurveMaterial);
    const imagCurve = new THREE.Line(imagCurveGeometry, imagCurveMaterial);
    scene.add(realCurve);
    scene.add(imagCurve);

    // Fast Surface via PlaneGeometry vertex manipulation
    const surfaceGeometry = new THREE.PlaneGeometry(surfaceRange * 2, surfaceRange * 2, 100, 100);
    surfaceGeometry.rotateX(-Math.PI / 2); // Lay flat on XZ

    const surfaceMaterial = new THREE.MeshPhongMaterial({
        color: 0x8b5cf6,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
        flatShading: true,
        clippingPlanes: [clipPlaneTop, clipPlaneBottom]
    });
    const surface = new THREE.Mesh(surfaceGeometry, surfaceMaterial);
    scene.add(surface);

    // Roots
    const rootGeometry = new THREE.SphereGeometry(0.06, 32, 32);
    const rootMaterial = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    const glowMaterial = new THREE.MeshBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.3 });

    const root1 = new THREE.Mesh(rootGeometry, rootMaterial);
    const root2 = new THREE.Mesh(rootGeometry, rootMaterial);
    const glow1 = new THREE.Mesh(new THREE.SphereGeometry(0.12, 32, 32), glowMaterial);
    const glow2 = new THREE.Mesh(new THREE.SphereGeometry(0.12, 32, 32), glowMaterial);

    scene.add(root1); scene.add(root2);
    scene.add(glow1); scene.add(glow2);

    // --- Math Logic & Update ---
    function updateGraph() {
        // Get slider values
        let a = parseFloat(document.getElementById('slider-a').value);
        let b = parseFloat(document.getElementById('slider-b').value);
        let c = parseFloat(document.getElementById('slider-c').value);

        // Prevent a from being exactly 0 to maintain quadratic properties
        if(Math.abs(a) < 0.01) a = a >= 0 ? 0.01 : -0.01;

        // Format Equation
        let eq = "f(x) = ";
        if (a === 1) eq += "x²";
            else if (a === -1) eq += "-x²";
            else eq += a + "x²";

            if (b > 0) eq += " + " + b + "x";
            else if (b < 0) eq += " - " + Math.abs(b) + "x";

            if (c > 0) eq += " + " + c;
            else if (c < 0) eq += " - " + Math.abs(c);

            document.getElementById('equation-display').innerText = eq;

            const xv = -b / (2 * a); // Vertex X position

            // 1. Update Real Curve (z = 0)
            const realPts = [];
            for (let i = 0; i <= segments; i++) {
                let x = -curveRange + (i / segments) * (curveRange * 2);
                let y = a * (x * x) + b * x + c;
                realPts.push(new THREE.Vector3(x, y, 0));
            }
            realCurveGeometry.setFromPoints(realPts);

            // 2. Update Imaginary Curve (slice through vertex x = xv)
            const imagPts = [];
            for (let i = 0; i <= segments; i++) {
                let z = -curveRange + (i / segments) * (curveRange * 2);
                // Output is purely real when passing exactly through the vertex in the Z direction
                let y = a * (xv * xv - z * z) + b * xv + c;
                imagPts.push(new THREE.Vector3(xv, y, z));
            }
            imagCurveGeometry.setFromPoints(imagPts);

            // 3. Update Surface
            const pos = surfaceGeometry.attributes.position;
            for (let i = 0; i < pos.count; i++) {
                let x = pos.getX(i);
                let z = pos.getZ(i);
                // Real part of f(x + iz)
                let y = a * (x * x - z * z) + b * x + c;
                pos.setY(i, y);
            }
            pos.needsUpdate = true;
            surfaceGeometry.computeVertexNormals();

            // 4. Update Roots
            const discriminant = (b * b) - (4 * a * c);

            const solutionsDisplay = document.getElementById('solutions-display');
            if (discriminant >= 0) {
                // Real Roots (on X axis)
                let r1 = (-b + Math.sqrt(discriminant)) / (2 * a);
                let r2 = (-b - Math.sqrt(discriminant)) / (2 * a);
                root1.position.set(r1, 0, 0);
                root2.position.set(r2, 0, 0);
                solutionsDisplay.innerText = `x₁ = ${r1.toFixed(2)}, x₂ = ${r2.toFixed(2)}`;
            } else {
                // Complex Roots (on Z axis, offset by vertex X)
                let zVal = Math.sqrt(-discriminant) / (2 * a);
                root1.position.set(xv, 0, zVal);
                root2.position.set(xv, 0, -zVal);
                solutionsDisplay.innerText = `x = ${xv.toFixed(2)} ± ${zVal.toFixed(2)}i`;
            }

            // Snap glows to roots
        glow1.position.copy(root1.position);
        glow2.position.copy(root2.position);
    }

    // --- Input Synchronization & Event Listeners ---
    function setupInputSync(sliderId, inputId) {
        const slider = document.getElementById(sliderId);
        const numberInput = document.getElementById(inputId);

        slider.addEventListener('input', () => {
            numberInput.value = slider.value;
            updateGraph();
        });

        numberInput.addEventListener('input', () => {
            // Update slider when manual input changes
            slider.value = numberInput.value;
            updateGraph();
        });
    }

    setupInputSync('slider-a', 'input-a');
    setupInputSync('slider-b', 'input-b');
    setupInputSync('slider-c', 'input-c');

    // --- UI Toggle Logic ---
    document.getElementById('toggle-ui-btn').addEventListener('click', function() {
        const content = document.getElementById('ui-content');
        if (content.classList.contains('hidden')) {
            content.classList.remove('hidden');
            this.innerText = '−';
        } else {
            content.classList.add('hidden');
            this.innerText = '+';
        }
    });

    // Initial Draw
    updateGraph();

    // --- Labels for Axes ---
        function createTextSprite(message, color) {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = 256;
            canvas.height = 128;
            context.font = 'Bold 40px Arial';
            context.fillStyle = color;
            context.textAlign = 'center';
            context.fillText(message, 128, 64);

            const texture = new THREE.CanvasTexture(canvas);
            const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
            const sprite = new THREE.Sprite(spriteMaterial);
            sprite.scale.set(1.5, 0.75, 1);
            return sprite;
        }

        const labelX = createTextSprite('Real Input (X)', '#ef4444');
        labelX.position.set(5.5, 0, 0);
        scene.add(labelX);

        const labelZ = createTextSprite('Imag Input (Z)', '#3b82f6');
        labelZ.position.set(0, 0, 5.5);
        scene.add(labelZ);

        const labelY = createTextSprite('Output = 0', '#9ca3af');
        labelY.position.set(-3, 0, -3);
        scene.add(labelY);


        // --- Animation Loop ---
        window.addEventListener('resize', onWindowResize, false);

        function onWindowResize() {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        }

        let autoRotate = true;
        controls.addEventListener('start', () => { autoRotate = false; });

        function animate() {
            requestAnimationFrame(animate);
            if (autoRotate) {
                scene.rotation.y += 0.0015;
            }
            controls.update();
            renderer.render(scene, camera);
        }

        animate();
};
