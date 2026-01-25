
export class PhysicsWorld {
    public capacity: number;
    public count: number;

    // Structure of Arrays (SoA)
    // 0: x, 1: y
    public positions: Float32Array;
    public velocities: Float32Array;
    public forces: Float32Array;

    // Scalars
    public radii: Float32Array;
    public invMass: Float32Array; // 1/mass for faster mult
    public flags: Uint8Array; // 1 = Active, 2 = Solid, 4 = Static

    // ID Mapping (EntityID string -> Index)
    public idToIndex: Map<string, number>;
    public indexToId: string[];
    public freeIndices: number[];

    constructor(capacity: number = 5000) {
        this.capacity = capacity;
        this.count = 0;

        this.positions = new Float32Array(capacity * 2);
        this.velocities = new Float32Array(capacity * 2);
        this.forces = new Float32Array(capacity * 2);
        this.radii = new Float32Array(capacity);
        this.invMass = new Float32Array(capacity);
        this.flags = new Uint8Array(capacity);

        this.idToIndex = new Map();
        this.indexToId = new Array(capacity).fill('');
        this.freeIndices = [];
        for (let i = capacity - 1; i >= 0; i--) this.freeIndices.push(i);
    }

    addBody(id: string, x: number, y: number, radius: number, mass: number, isSolid: boolean = true) {
        if (this.idToIndex.has(id)) return this.idToIndex.get(id)!;
        if (this.freeIndices.length === 0) return -1; // Full

        const idx = this.freeIndices.pop()!;
        this.idToIndex.set(id, idx);
        this.indexToId[idx] = id;

        this.positions[idx * 2] = x;
        this.positions[idx * 2 + 1] = y;
        this.velocities[idx * 2] = 0;
        this.velocities[idx * 2 + 1] = 0;
        this.radii[idx] = radius;
        this.invMass[idx] = mass > 0 ? 1 / mass : 0;

        if (isSolid) this.flags[idx] |= 2;
        this.flags[idx] |= 1; // Active

        return idx;
    }

    removeBody(id: string) {
        const idx = this.idToIndex.get(id);
        if (idx === undefined) return;

        this.flags[idx] = 0; // Inactive
        this.idToIndex.delete(id);
        this.indexToId[idx] = '';
        this.freeIndices.push(idx);
    }

    // Helper to sync from Entity object
    syncBody(id: string, x: number, y: number, vx: number, vy: number) {
        const idx = this.idToIndex.get(id);
        if (idx !== undefined) {
            this.positions[idx * 2] = x;
            this.positions[idx * 2 + 1] = y;
            this.velocities[idx * 2] = vx;
            this.velocities[idx * 2 + 1] = vy;
        }
    }
}
