// EIDOLON-V: Single Source of Truth for Input State
export interface InputActions {
    space: boolean;
    w: boolean;
}

export interface InputMove {
    x: number;
    y: number;
}

// EIDOLON-V WARNING: High Frequency Allocation
// InputManager should pool these events instead of creating new objects per frame.
export interface InputEvent {
    type: 'skill' | 'boost' | 'eject';
    timestamp: number;
}

export interface InputState {
    actions: InputActions;
    move: InputMove;
    // Warning: Keep array length check in Manager to prevent unbound growth
    events: InputEvent[];
}

export const createDefaultInputState = (): InputState => ({
    actions: { space: false, w: false },
    move: { x: 0, y: 0 },
    events: []
});
