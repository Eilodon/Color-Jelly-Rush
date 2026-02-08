/**
 * @eidolon/engine - ISnapshotReceiver
 * 
 * Interface for receiving unpacked network data.
 * Decouples deserialization from state application to allow buffering.
 */

export interface ISnapshotReceiver {
    /**
     * Receive a transform update (Fast Lane)
     */
    onTransform(id: number, x: number, y: number): void;

    /**
     * Receive a physics update (Fast Lane)
     */
    onPhysics(id: number, vx: number, vy: number, radius: number): void;

    /**
     * Receive a component delta (Smart Lane)
     * NOTE: The receiver is responsible for calling NetworkDeserializer later
     */
    onComponent(id: number, componentId: number, view: DataView, offset: number): void;
}
