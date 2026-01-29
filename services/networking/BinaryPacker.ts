
export const PacketType = {
    TRANSFORM_UPDATE: 1
};

export class BinaryPacker {
    private static _buffer = new ArrayBuffer(4096 * 32); // 128KB buffer
    private static _view = new DataView(BinaryPacker._buffer);
    private static _u8 = new Uint8Array(BinaryPacker._buffer);

    static packTransforms(
        entities: { id: string, x: number, y: number, vx: number, vy: number }[],
        timestamp: number
    ): ArrayBuffer {
        let offset = 0;
        const view = this._view;
        const u8 = this._u8;

        // Header: Type (1) + Time (4) + Count (2)
        u8[offset++] = PacketType.TRANSFORM_UPDATE;
        view.setFloat32(offset, timestamp, true); offset += 4;
        view.setUint16(offset, entities.length, true); offset += 2;

        for (const ent of entities) {
            // ID (Length + Bytes)
            const idLen = ent.id.length;
            u8[offset++] = idLen;
            for (let i = 0; i < idLen; i++) {
                u8[offset++] = ent.id.charCodeAt(i);
            }

            // Transform (4x4 = 16 bytes)
            view.setFloat32(offset, ent.x, true); offset += 4;
            view.setFloat32(offset, ent.y, true); offset += 4;
            view.setFloat32(offset, ent.vx, true); offset += 4;
            view.setFloat32(offset, ent.vy, true); offset += 4;
        }

        // Slice used portion (or copy)
        return this._buffer.slice(0, offset);
    }

    // EIDOLON ARCHITECT: Zero-Allocation Callback Interface
    // Pre-allocated buffers to eliminate runtime allocations
    private static _textDecoder = new TextDecoder('utf-8');
    private static _idBuffer = new Uint8Array(64); // Max ID length = 64 bytes

    /**
     * Zero-allocation binary unpacker using visitor pattern.
     * @param buffer ArrayBuffer containing packed transform data
     * @param callback Invoked for each entity with primitive values (no object creation)
     * @returns timestamp if valid packet, null otherwise
     */
    static unpackAndApply(
        buffer: ArrayBuffer,
        callback: (id: string, x: number, y: number, vx: number, vy: number) => void
    ): number | null {
        const view = new DataView(buffer);
        const u8 = new Uint8Array(buffer);
        let offset = 0;

        // Validate packet type
        if (u8[offset++] !== PacketType.TRANSFORM_UPDATE) return null;

        const timestamp = view.getFloat32(offset, true); offset += 4;
        const count = view.getUint16(offset, true); offset += 2;

        // CRITICAL: Zero-allocation loop - no arrays, no objects
        for (let k = 0; k < count; k++) {
            const idLen = u8[offset++];

            // OPTIMIZATION: Use TextDecoder + pre-allocated buffer instead of string concat
            // String concatenation creates intermediate strings per character
            this._idBuffer.set(u8.subarray(offset, offset + idLen));
            const id = this._textDecoder.decode(this._idBuffer.subarray(0, idLen));
            offset += idLen;

            const x = view.getFloat32(offset, true); offset += 4;
            const y = view.getFloat32(offset, true); offset += 4;
            const vx = view.getFloat32(offset, true); offset += 4;
            const vy = view.getFloat32(offset, true); offset += 4;

            // VISITOR PATTERN: Direct callback invocation with primitives
            // No object creation, no array push, data flows directly to consumer
            callback(id, x, y, vx, vy);
        }

        return timestamp;
    }

    // DEPRECATED: Legacy API kept for backwards compatibility - will be removed
    // @deprecated Use unpackAndApply with callback instead
    static unpackTransforms(buffer: ArrayBuffer): { timestamp: number, updates: { id: string, x: number, y: number, vx: number, vy: number }[] } | null {
        const updates: { id: string, x: number, y: number, vx: number, vy: number }[] = [];
        const timestamp = this.unpackAndApply(buffer, (id, x, y, vx, vy) => {
            updates.push({ id, x, y, vx, vy });
        });
        if (timestamp === null) return null;
        return { timestamp, updates };
    }
}
