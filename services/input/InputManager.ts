export const inputManager = {
    // State hiện tại (được Engine đọc mỗi tick)
    state: {
        move: { x: 0, y: 0 },
        actions: {
            skill: false,
            eject: false,
        },
        // Event queue cho những hành động "bấm một lần" (skill)
        events: [] as Array<{ type: 'skill' | 'eject', id: string }>
    },

    // --- Keyboard Handling ---
    keys: new Set<string>(),

    init() {
        if (typeof window === 'undefined') return;
        // Bind listeners
        // Helper to bind context or just use arrow functions
        window.addEventListener('keydown', (e) => this.onKey(e.code, true));
        window.addEventListener('keyup', (e) => this.onKey(e.code, false));
    },

    onKey(code: string, isDown: boolean) {
        if (isDown) this.keys.add(code); else this.keys.delete(code);
        this.updateMoveVector();

        // Skill Trigger (Space)
        if (code === 'Space') {
            this.state.actions.skill = isDown;
            if (isDown) this.pushEvent('skill');
        }
        // Eject Trigger (W)
        if (code === 'KeyW') {
            this.state.actions.eject = isDown;
            if (isDown) this.pushEvent('eject');
        }
    },

    // --- Virtual Joystick Handling ---
    joystickVector: { x: 0, y: 0 },

    setJoystick(x: number, y: number) {
        this.joystickVector.x = x;
        this.joystickVector.y = y;
        this.updateMoveVector();
    },

    setButton(btn: 'skill' | 'eject', isDown: boolean) {
        this.state.actions[btn] = isDown;
        if (isDown) this.pushEvent(btn);
    },

    // --- Core Logic ---
    updateMoveVector() {
        // Ưu tiên Joystick nếu có input
        if (Math.abs(this.joystickVector.x) > 0.1 || Math.abs(this.joystickVector.y) > 0.1) {
            this.state.move = { ...this.joystickVector };
            return;
        }

        // Fallback Keyboard (WASD / Arrows)
        let dx = 0, dy = 0;
        if (this.keys.has('ArrowUp') || this.keys.has('KeyW')) dy -= 1;
        if (this.keys.has('ArrowDown') || this.keys.has('KeyS')) dy += 1;
        if (this.keys.has('ArrowLeft') || this.keys.has('KeyA')) dx -= 1;
        if (this.keys.has('ArrowRight') || this.keys.has('KeyD')) dx += 1;

        // Normalize
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > 0) {
            this.state.move = { x: dx / len, y: dy / len };
        } else {
            this.state.move = { x: 0, y: 0 };
        }
    },

    pushEvent(type: 'skill' | 'eject') {
        this.state.events.push({ type, id: Math.random().toString(36).slice(2) });
    },

    // Engine gọi hàm này để lấy và xóa queue
    popEvents() {
        const evts = [...this.state.events];
        this.state.events = [];
        return evts;
    },

    // Engine gọi hàm này để lấy move vector
    getMoveTarget(currentPos: { x: number, y: number }) {
        // Target = Current + Vector * Offset
        const OFFSET = 250;
        return {
            x: currentPos.x + this.state.move.x * OFFSET,
            y: currentPos.y + this.state.move.y * OFFSET
        };
    }
};
