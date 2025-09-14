// Rendering constants
let WINDOW_WIDTH = window.innerWidth;
let WINDOW_HEIGHT = window.innerHeight;
let PARTICLE_COUNT = 150;

// Colors
const BLACK = 'rgb(0, 0, 0)';
const WHITE = 'rgb(255, 255, 255)';

// Setup canvas
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Enable alpha blending for flame effects
ctx.globalCompositeOperation = 'source-over';

// Create engine
const engine = new Engine(WINDOW_WIDTH, WINDOW_HEIGHT);

// Create particles
let particles = [];
function createParticles() {
    particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const x = Math.random() * WINDOW_WIDTH;
        const y = engine.getTop(x) + Math.random() * (engine.getBottom(x) - engine.getTop(x));
        particles.push(new Particle(x, y));
    }
}

// Handle window resizing
function handleResize() {
    WINDOW_WIDTH = window.innerWidth;
    WINDOW_HEIGHT = window.innerHeight;
    canvas.width = WINDOW_WIDTH;
    canvas.height = WINDOW_HEIGHT;
    engine.width = WINDOW_WIDTH;
    engine.height = WINDOW_HEIGHT;
    engine.updateDimensions();
    createParticles(); // Recreate particles to fit new dimensions
}

// Drawing functions
function drawEngine(ctx) {
    ctx.strokeStyle = WHITE;
    ctx.lineWidth = 2;

    // Draw top line
    ctx.beginPath();
    for (let x = 0; x < WINDOW_WIDTH; x += 5) {
        const y = engine.getTop(x);
        if (x === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    ctx.stroke();

    // Draw bottom line
    ctx.beginPath();
    for (let x = 0; x < WINDOW_WIDTH; x += 5) {
        const y = engine.getBottom(x);
        if (x === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    ctx.stroke();

    // Draw combustion chamber indicator
    const chamberStart = engine.combustion_start;
    const chamberEnd = engine.nozzle_start;

    const gradient = ctx.createLinearGradient(chamberStart, 0, chamberEnd, 0);
    gradient.addColorStop(0, 'rgba(255, 100, 0, 0)');
    gradient.addColorStop(0.2, 'rgba(255, 100, 0, 0.2)');
    gradient.addColorStop(0.8, 'rgba(255, 100, 0, 0.2)');
    gradient.addColorStop(1, 'rgba(255, 100, 0, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(chamberStart, engine.getTop(chamberStart),
                chamberEnd - chamberStart,
                engine.getBottom(chamberStart) - engine.getTop(chamberStart));
}

// Set initial canvas size
handleResize();

// Add resize event listener
window.addEventListener('resize', handleResize);

// Animation loop
function animate() {
    // Clear canvas
    ctx.fillStyle = BLACK;
    ctx.fillRect(0, 0, WINDOW_WIDTH, WINDOW_HEIGHT);

    // Draw engine
    drawEngine(ctx);

    // Update and draw particles
    particles.forEach(particle => {
        particle.update(engine);
        particle.draw(ctx);
    });

    requestAnimationFrame(animate);
}

// Start animation
animate();

// Setup sliders
function setupSlider(id, valueId, callback) {
    const slider = document.getElementById(id);
    const valueDisplay = document.getElementById(valueId);

    slider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        valueDisplay.textContent = value.toFixed(3);
        if (callback) callback(value);
    });
}

// Setup all sliders
setupSlider('particleCount', 'particleCountValue', (value) => {
    PARTICLE_COUNT = value;
    createParticles();
});

setupSlider('inletVelocity', 'inletVelocityValue', () => updatePhysicsParams(getPhysicsParams()));
setupSlider('fluidDensity', 'fluidDensityValue', () => updatePhysicsParams(getPhysicsParams()));
setupSlider('atmosphericPressure', 'atmosphericPressureValue', () => updatePhysicsParams(getPhysicsParams()));
setupSlider('specificHeatRatio', 'specificHeatRatioValue', () => updatePhysicsParams(getPhysicsParams()));
setupSlider('combustionTempRatio', 'combustionTempRatioValue', () => updatePhysicsParams(getPhysicsParams()));
setupSlider('combustionEnergy', 'combustionEnergyValue', () => updatePhysicsParams(getPhysicsParams()));

function getPhysicsParams() {
    return {
        inletVelocity: parseFloat(document.getElementById('inletVelocity').value),
        fluidDensity: parseFloat(document.getElementById('fluidDensity').value),
        atmosphericPressure: parseFloat(document.getElementById('atmosphericPressure').value),
        specificHeatRatio: parseFloat(document.getElementById('specificHeatRatio').value),
        combustionTempRatio: parseFloat(document.getElementById('combustionTempRatio').value),
        combustionEnergy: parseFloat(document.getElementById('combustionEnergy').value)
    };
}