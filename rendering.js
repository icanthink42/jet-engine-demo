let WINDOW_WIDTH = window.innerWidth;
let WINDOW_HEIGHT = window.innerHeight;
let PARTICLE_COUNT = 150;

const BLACK = 'rgb(0, 0, 0)';
const WHITE = 'rgb(255, 255, 255)';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

ctx.globalCompositeOperation = 'source-over';

const engine = new Engine(WINDOW_WIDTH, WINDOW_HEIGHT);

let particles = [];
function createParticles() {
    particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const x = Math.random() * WINDOW_WIDTH;
        const y = engine.getTop(x) + Math.random() * (engine.getBottom(x) - engine.getTop(x));
        particles.push(new Particle(x, y));
    }
}

function handleResize() {
    WINDOW_WIDTH = window.innerWidth;
    WINDOW_HEIGHT = window.innerHeight;
    canvas.width = WINDOW_WIDTH;
    canvas.height = WINDOW_HEIGHT;
    engine.width = WINDOW_WIDTH;
    engine.height = WINDOW_HEIGHT;
    engine.updateDimensions();
    createParticles();
}

function drawEngine(ctx) {
    ctx.strokeStyle = WHITE;
    ctx.lineWidth = 2;

    ctx.beginPath();
    for (let x = 0; x < WINDOW_WIDTH; x += 5) {
        const y = engine.getTop(x);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.beginPath();
    for (let x = 0; x < WINDOW_WIDTH; x += 5) {
        const y = engine.getBottom(x);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Draw compression region (where area decreases)
    const compressionStart = engine.combustion_start;
    const compressionEnd = engine.nozzle_start;
    const compressionGradient = ctx.createLinearGradient(
        compressionStart, 0,
        compressionEnd, 0
    );
    compressionGradient.addColorStop(0, 'rgba(100, 100, 255, 0)');
    compressionGradient.addColorStop(0.5, 'rgba(100, 100, 255, 0.2)');
    compressionGradient.addColorStop(1, 'rgba(100, 100, 255, 0)');

    ctx.fillStyle = compressionGradient;
    ctx.fillRect(
        compressionStart,
        engine.getTop(compressionStart),
        compressionEnd - compressionStart,
        engine.getBottom(compressionStart) - engine.getTop(compressionStart)
    );

    // Draw combustion region (where energy is added)
    const combustionX = engine.nozzle_start;
    const combustionWidth = 20;
    const combustionGradient = ctx.createLinearGradient(
        combustionX, 0,
        combustionX + combustionWidth, 0
    );
    combustionGradient.addColorStop(0, 'rgba(255, 100, 0, 0)');
    combustionGradient.addColorStop(0.5, 'rgba(255, 100, 0, 0.3)');
    combustionGradient.addColorStop(1, 'rgba(255, 100, 0, 0)');

    ctx.fillStyle = combustionGradient;
    ctx.fillRect(
        combustionX,
        engine.getTop(combustionX),
        combustionWidth,
        engine.getBottom(combustionX) - engine.getTop(combustionX)
    );

    // Draw section labels
    ctx.font = '16px Arial';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.textAlign = 'center';

    // Label compression region
    const compressionMidX = (compressionStart + compressionEnd) / 2;
    const compressionY = engine.getTop(compressionMidX) - 10;
    ctx.fillText('Compression (P↑, v↓)', compressionMidX, compressionY);

    // Label combustion region
    const combustionY = engine.getTop(combustionX) - 10;
    ctx.fillText('Energy Addition (h↑)', combustionX + combustionWidth/2, combustionY);

    // Label nozzle region
    const nozzleX = (engine.nozzle_start + engine.outlet) / 2;
    const nozzleY = engine.getTop(nozzleX) - 10;
    ctx.fillText('Nozzle (P→v)', nozzleX, nozzleY);
}

handleResize();

window.addEventListener('resize', handleResize);

function animate() {
    ctx.fillStyle = BLACK;
    ctx.fillRect(0, 0, WINDOW_WIDTH, WINDOW_HEIGHT);

    drawEngine(ctx);

    particles.forEach(particle => {
        particle.update(engine);
        particle.draw(ctx);
    });

    requestAnimationFrame(animate);
}

animate();

function setupSlider(id, valueId, callback) {
    const slider = document.getElementById(id);
    const valueDisplay = document.getElementById(valueId);

    slider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        valueDisplay.textContent = value.toFixed(3);
        if (callback) callback(value);
    });
}

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