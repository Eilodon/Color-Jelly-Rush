import { Application, Container, Sprite, Texture, BLEND_MODES } from 'pixi.js';

// Cấu hình Pool
const POOL_SIZE = 3000;

class Particle {
    sprite: Sprite;
    vx: number = 0;
    vy: number = 0;
    life: number = 0;
    maxLife: number = 1;
    scaleSpeed: number = 0;
    alphaSpeed: number = 0;
    active: boolean = false;

    constructor(texture: Texture) {
        this.sprite = new Sprite(texture);
        this.sprite.anchor.set(0.5);
        this.sprite.visible = false;
        // Blend mode ADD giúp particle trông sáng và "magic" hơn trên nền tối
        this.sprite.blendMode = 'add';
    }
}

export class CrystalVFX {
    private container: Container;
    private pool: Particle[] = [];
    private activeParticles: Particle[] = [];
    private texture: Texture;

    constructor(app: Application) {
        this.container = new Container();

        // Tạo texture soft glow bằng Canvas (tốt hơn hình tròn cứng)
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d')!;
        const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
        grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
        grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.5)');
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 32, 32);
        this.texture = Texture.from(canvas);

        // Pre-warm pool
        for (let i = 0; i < POOL_SIZE; i++) {
            const p = new Particle(this.texture);
            this.container.addChild(p.sprite);
            this.pool.push(p);
        }
    }

    public getContainer() {
        return this.container;
    }

    // --- PRESETS (Logic vẽ hình nằm ở đây, không nằm ở Server) ---

    public explode(x: number, y: number, color: number, count: number = 20) {
        this.spawn(x, y, count, color, (p, i) => {
            const angle = Math.random() * Math.PI * 2;
            const speed = 100 + Math.random() * 200;
            p.vx = Math.cos(angle) * speed;
            p.vy = Math.sin(angle) * speed;
            p.life = 0.5 + Math.random() * 0.5;
            p.sprite.scale.set(0.5 + Math.random() * 0.5);
            p.scaleSpeed = -p.sprite.scale.x / p.life;
        });
    }

    public spiral(x: number, y: number, color: number, count: number = 30) {
        this.spawn(x, y, count, color, (p, i) => {
            const angle = (i / count) * Math.PI * 4; // 2 vòng xoắn
            const speed = 50 + Math.random() * 50;
            p.vx = Math.cos(angle) * speed;
            p.vy = Math.sin(angle) * speed;
            p.life = 1.0 + Math.random() * 0.5;
            p.sprite.scale.set(0.3);
            p.scaleSpeed = 0; // Giữ nguyên kích thước hoặc to dần
            p.alphaSpeed = -1.0 / p.life;
        });
    }

    public shockwave(x: number, y: number, color: number) {
        // Shockwave dùng nhiều hạt xếp thành vòng tròn mở rộng
        const count = 40;
        this.spawn(x, y, count, color, (p, i) => {
            const angle = (i / count) * Math.PI * 2;
            const speed = 300;
            p.vx = Math.cos(angle) * speed;
            p.vy = Math.sin(angle) * speed;
            p.life = 0.4;
            p.sprite.scale.set(0.8);
            p.scaleSpeed = 1.0; // Phóng to ra
        });
    }

    // --- CORE ENGINE ---

    private spawn(x: number, y: number, count: number, color: number, setupFn: (p: Particle, i: number) => void) {
        for (let i = 0; i < count; i++) {
            const p = this.getPooledParticle();
            if (!p) return;

            p.active = true;
            p.sprite.visible = true;
            p.sprite.tint = color;
            p.sprite.x = x;
            p.sprite.y = y;
            p.sprite.alpha = 1;
            p.maxLife = 1;
            p.scaleSpeed = 0;
            p.alphaSpeed = 0;

            setupFn(p, i);
        }
    }

    public update(dt: number) {
        for (let i = this.activeParticles.length - 1; i >= 0; i--) {
            const p = this.activeParticles[i];

            p.life -= dt;
            if (p.life <= 0) {
                this.returnToPool(p, i);
                continue;
            }

            p.sprite.x += p.vx * dt;
            p.sprite.y += p.vy * dt;

            // Drag nhẹ để tự nhiên
            p.vx *= 0.95;
            p.vy *= 0.95;

            const s = p.sprite.scale.x + p.scaleSpeed * dt;
            p.sprite.scale.set(Math.max(0, s));

            if (p.alphaSpeed !== 0) {
                p.sprite.alpha = Math.max(0, p.sprite.alpha + p.alphaSpeed * dt);
            }
        }
    }

    private getPooledParticle(): Particle | null {
        if (this.pool.length > 0) {
            const p = this.pool.pop()!;
            this.activeParticles.push(p);
            return p;
        }
        return null;
    }

    private returnToPool(p: Particle, index: number) {
        p.active = false;
        p.sprite.visible = false;
        this.activeParticles.splice(index, 1);
        this.pool.push(p);
    }
}
