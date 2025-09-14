let WINDOW_WIDTH = window.innerWidth;
let WINDOW_HEIGHT = window.innerHeight;
let PARTICLE_COUNT = 150;

const BLACK = 'rgb(0, 0, 0)';
const WHITE = 'rgb(255, 255, 255)';
const R = 287.05;
const TOP_MARGIN = 150;

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

ctx.globalCompositeOperation = 'source-over';

const engine = new Engine(WINDOW_WIDTH, WINDOW_HEIGHT);

let particles = [];
let previousStats = new Map();
const STATS_SMOOTHING_FACTOR = 0.2;

function smoothStats(newStats, sectionName) {
    if (!previousStats.has(sectionName)) {
        previousStats.set(sectionName, newStats);
        return newStats;
    }

    const oldStats = previousStats.get(sectionName);
    const smoothedStats = {
        pressure: parseFloat(oldStats.pressure) * (1 - STATS_SMOOTHING_FACTOR) + parseFloat(newStats.pressure) * STATS_SMOOTHING_FACTOR,
        enthalpy: parseFloat(oldStats.enthalpy) * (1 - STATS_SMOOTHING_FACTOR) + parseFloat(newStats.enthalpy) * STATS_SMOOTHING_FACTOR,
        velocity: parseFloat(oldStats.velocity) * (1 - STATS_SMOOTHING_FACTOR) + parseFloat(newStats.velocity) * STATS_SMOOTHING_FACTOR,
        temperature: parseFloat(oldStats.temperature) * (1 - STATS_SMOOTHING_FACTOR) + parseFloat(newStats.temperature) * STATS_SMOOTHING_FACTOR
    };

    smoothedStats.pressure = smoothedStats.pressure.toFixed(1);
    smoothedStats.enthalpy = smoothedStats.enthalpy.toFixed(1);
    smoothedStats.velocity = smoothedStats.velocity.toFixed(1);
    smoothedStats.temperature = smoothedStats.temperature.toFixed(1);

    previousStats.set(sectionName, smoothedStats);
    return smoothedStats;
}

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

function calculateSectionStats(particles, startX, endX, engine, sectionName) {
    const sectionParticles = particles.filter(p => p.x >= startX && p.x < endX);

    if (sectionParticles.length === 0 && previousStats.has(sectionName)) {
        return previousStats.get(sectionName);
    }

    if (sectionParticles.length === 0) {
        const defaultStats = {
            pressure: "2.0",
            enthalpy: "1200.0",
            velocity: "10.0",
            temperature: "800.0"
        };
        previousStats.set(sectionName, defaultStats);
        return defaultStats;
    }

    const area = engine.getLocalArea((startX + endX) / 2);
    const volume = area * 1;
    const density = (sectionParticles.length / PARTICLE_COUNT) * FLUID_DENSITY;

    let avgTemp = 0;
    let avgVelocity = 0;
    let totalEnthalpy = 0;

    sectionParticles.forEach(p => {
        avgTemp += p.temperature;
        const velocity = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        avgVelocity += velocity;

        const kineticEnergy = 0.5 * velocity * velocity;
        const thermalEnergy = SPECIFIC_HEAT_RATIO * p.temperature;
        const energy = kineticEnergy + thermalEnergy;

        const enthalpy = SPECIFIC_HEAT_RATIO * p.temperature + 0.5 * velocity * velocity;
        totalEnthalpy += enthalpy;
    });

    avgTemp /= sectionParticles.length;
    avgVelocity /= sectionParticles.length;

    const pressure = density * R * avgTemp;
    const avgEnthalpy = totalEnthalpy / sectionParticles.length;

    return {
        pressure: (pressure / 1000).toFixed(1),
        enthalpy: avgEnthalpy.toFixed(1),
        velocity: avgVelocity.toFixed(1),
        temperature: avgTemp.toFixed(1)
    };
}

function drawStats(ctx, stats, x, y, width) {
    if (!stats) return;

    const padding = 10;
    const lineHeight = 20;
    const totalHeight = lineHeight * 4 + padding * 2;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(x - padding, y - padding, width + padding * 2, totalHeight);

    ctx.font = '14px monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.textAlign = 'left';

    ctx.fillText(`P: ${stats.pressure} kPa`, x, y + lineHeight);
    ctx.fillText(`h: ${stats.enthalpy} J/kg`, x, y + lineHeight * 2);
    ctx.fillText(`T: ${stats.temperature} K`, x, y + lineHeight * 3);
    ctx.fillText(`v: ${stats.velocity} m/s`, x, y + lineHeight * 4);
}

function drawEngine(ctx) {
    ctx.save();
    ctx.translate(0, TOP_MARGIN);

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

    const sections = [
        {
            name: 'Inlet',
            start: engine.inlet_start,
            end: engine.combustion_start,
            gradient: ['rgba(100, 100, 255, 0)', 'rgba(100, 100, 255, 0.1)', 'rgba(100, 100, 255, 0)'],
            showStats: true
        },
        {
            name: 'Compression (P↑)',
            start: engine.combustion_start,
            end: engine.nozzle_start,
            gradient: ['rgba(100, 100, 255, 0)', 'rgba(100, 100, 255, 0.2)', 'rgba(100, 100, 255, 0)'],
            showStats: true
        },
        {
            name: 'Energy Addition (h↑)',
            start: engine.nozzle_start,
            end: engine.nozzle_start + 20,
            gradient: ['rgba(255, 100, 0, 0)', 'rgba(255, 100, 0, 0.3)', 'rgba(255, 100, 0, 0)'],
            showStats: false
        },
        {
            name: 'Nozzle (P→v)',
            start: engine.nozzle_start + 20,
            end: engine.outlet,
            gradient: ['rgba(100, 255, 100, 0)', 'rgba(100, 255, 100, 0.2)', 'rgba(100, 255, 100, 0)'],
            showStats: true
        }
    ];

    sections.forEach(section => {
        const gradient = ctx.createLinearGradient(section.start, 0, section.end, 0);
        gradient.addColorStop(0, section.gradient[0]);
        gradient.addColorStop(0.5, section.gradient[1]);
        gradient.addColorStop(1, section.gradient[2]);

        ctx.fillStyle = gradient;
        ctx.fillRect(
            section.start,
            engine.getTop(section.start),
            section.end - section.start,
            engine.getBottom(section.start) - engine.getTop(section.start)
        );
    });

    ctx.restore();

    sections.forEach((section, index) => {
        const midX = (section.start + section.end) / 2;
        const sectionWidth = section.end - section.start;
        const statsWidth = Math.min(150, sectionWidth - 20);
        const statsX = midX - statsWidth / 2;

        ctx.font = '16px Arial';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.textAlign = 'center';
        ctx.fillText(section.name, midX, 40);

        if (section.showStats) {
            const rawStats = calculateSectionStats(particles, section.start, section.end, engine, section.name);
            const stats = smoothStats(rawStats, section.name);
            drawStats(ctx, stats, statsX, 50, statsWidth);
        }
    });
}

handleResize();

window.addEventListener('resize', handleResize);

function animate() {
    ctx.fillStyle = BLACK;
    ctx.fillRect(0, 0, WINDOW_WIDTH, WINDOW_HEIGHT);

    drawEngine(ctx);

    // Apply the same translation as the engine for particle rendering
    ctx.save();
    ctx.translate(0, TOP_MARGIN);
    particles.forEach(particle => {
        particle.update(engine);
        particle.draw(ctx);
    });
    ctx.restore();

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