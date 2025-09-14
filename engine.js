let INLET_VELOCITY = 2;
const PARTICLE_RADIUS = 3;

let FLUID_DENSITY = 1.225;
let ATMOSPHERIC_PRESSURE = 101325;
const SCALE_FACTOR = 0.1;
let SPECIFIC_HEAT_RATIO = 1.4;
let COMBUSTION_TEMPERATURE_RATIO = 3.0;
let COMBUSTION_ENERGY = 1.1;

function updatePhysicsParams(params) {
    INLET_VELOCITY = params.inletVelocity;
    FLUID_DENSITY = params.fluidDensity;
    ATMOSPHERIC_PRESSURE = params.atmosphericPressure * 1000;
    SPECIFIC_HEAT_RATIO = params.specificHeatRatio;
    COMBUSTION_TEMPERATURE_RATIO = params.combustionTempRatio;
    COMBUSTION_ENERGY = params.combustionEnergy;
}

class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = INLET_VELOCITY + (Math.random() - 0.5);
        this.vy = (Math.random() - 0.5);
        this.pressure = ATMOSPHERIC_PRESSURE;
        this.temperature = 288;
        this.energy = this.calculateEnergy();
        this.pressure_color = 'rgb(50, 50, 255)';
        this.hasCombusted = false;
        this.ignitionTime = 0;
        this.flameSize = 0;
    }

    calculateEnergy() {
        const velocity = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        return 0.5 * velocity * velocity +
               this.pressure / FLUID_DENSITY +
               SPECIFIC_HEAT_RATIO * this.temperature;
    }

    update(engine) {
        const section = engine.getSection(this.x);
        const area = engine.getLocalArea(this.x);
        const nextArea = engine.getLocalArea(this.x + this.vx);

        if (section === 'combustion' && !this.hasCombusted) {
            this.temperature *= COMBUSTION_TEMPERATURE_RATIO;
            this.energy *= COMBUSTION_ENERGY;
            this.hasCombusted = true;
            this.ignitionTime = performance.now();
            this.flameSize = PARTICLE_RADIUS * 4;
        }

        if (this.hasCombusted) {
            const timeSinceIgnition = performance.now() - this.ignitionTime;
            if (timeSinceIgnition < 1000) {
                this.flameSize = PARTICLE_RADIUS * 4 * (1 - timeSinceIgnition / 1000);
            } else {
                this.flameSize = 0;
            }
        }

        if (area && nextArea) {
            const areaRatio = nextArea / area;

            if (section === 'nozzle' && this.hasCombusted) {
                const machNumber = Math.sqrt(2 * (this.energy - this.calculateEnergy()) /
                                          (SPECIFIC_HEAT_RATIO * this.temperature));

                const newVelocity = machNumber * Math.sqrt(SPECIFIC_HEAT_RATIO * this.temperature);

                this.vx += (Math.sign(this.vx) * newVelocity - this.vx) * 0.1;

                this.pressure = this.pressure * Math.pow(areaRatio, SPECIFIC_HEAT_RATIO);
            } else {
                const velocityMagnitude = Math.abs(this.vx);
                const nextVelocity = (area / nextArea) * velocityMagnitude;
                this.vx += (Math.sign(this.vx) * nextVelocity - this.vx) * 0.1;
            }
        }

        this.vx += (Math.random() - 0.5) * 0.1;
        this.vy += (Math.random() - 0.5) * 0.1;

        if (!engine.isInside(this.x, this.y)) {
            this.vy *= -0.8;
            if (this.y < engine.getTop(this.x)) {
                this.y = engine.getTop(this.x);
            } else if (this.y > engine.getBottom(this.x)) {
                this.y = engine.getBottom(this.x);
            }
        }

        this.x += this.vx;
        this.y += this.vy;

        if (this.x > engine.width) {
            this.x = 0;
            this.vx = INLET_VELOCITY + (Math.random() - 0.5);
            this.pressure = ATMOSPHERIC_PRESSURE;
            this.temperature = 288;
            this.hasCombusted = false;
            this.energy = this.calculateEnergy();
            this.flameSize = 0;
        } else if (this.x < 0) {
            this.x = engine.width;
            this.vx = INLET_VELOCITY + (Math.random() - 0.5);
            this.pressure = ATMOSPHERIC_PRESSURE;
            this.temperature = 288;
            this.hasCombusted = false;
            this.energy = this.calculateEnergy();
            this.flameSize = 0;
        }

        const maxEnergy = this.energy * COMBUSTION_ENERGY;
        const energyRatio = this.calculateEnergy() / maxEnergy;

        if (this.hasCombusted) {
            const r = 255;
            const g = Math.max(0, 255 * (1 - energyRatio));
            const b = 0;
            this.pressure_color = `rgb(${r}, ${g}, ${b})`;
        } else {
            const intensity = Math.max(50, 255 * (1 - energyRatio));
            this.pressure_color = `rgb(${intensity}, ${intensity}, 255)`;
        }
    }

    draw(ctx) {
        ctx.fillStyle = this.pressure_color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, PARTICLE_RADIUS, 0, Math.PI * 2);
        ctx.fill();

        if (this.flameSize > 0) {
            const gradient = ctx.createRadialGradient(
                this.x, this.y, 0,
                this.x, this.y, this.flameSize
            );
            gradient.addColorStop(0, 'rgba(255, 200, 0, 0.8)');
            gradient.addColorStop(0.5, 'rgba(255, 100, 0, 0.5)');
            gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.flameSize, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

class Engine {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.updateDimensions();
    }

    updateDimensions() {
        this.inlet_width = this.height * 0.25;
        this.throat_width = this.height * 0.15;
        this.outlet_width = this.height * 0.2;

        this.inlet_start = this.width * 0.125;
        this.combustion_start = this.width * 0.375;
        this.nozzle_start = this.width * 0.625;
        this.outlet = this.width * 0.875;
    }

    getSection(x) {
        if (x < this.inlet_start) return 'pre-inlet';
        if (x < this.combustion_start) return 'inlet';
        if (x < this.nozzle_start) return 'combustion';
        if (x < this.outlet) return 'nozzle';
        return 'post-nozzle';
    }

    getLocalArea(x) {
        const height = this.getBottom(x) - this.getTop(x);
        return height * SCALE_FACTOR;
    }

    getTop(x) {
        const center = this.height / 2;
        if (x < this.inlet_start) {
            return center - this.inlet_width;
        } else if (x < this.combustion_start) {
            return center - this.inlet_width;
        } else if (x < this.nozzle_start) {
            return center - this.throat_width;
        } else {
            return center - this.outlet_width;
        }
    }

    getBottom(x) {
        return this.height - this.getTop(x);
    }

    isInside(x, y) {
        return this.getTop(x) <= y && y <= this.getBottom(x);
    }
}