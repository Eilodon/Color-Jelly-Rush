import React from 'react';
import { GameState } from '../types';

interface PixiGameCanvasProps {
    gameStateRef: React.MutableRefObject<GameState | null>;
    inputEnabled: boolean;
    alphaRef: React.MutableRefObject<number>;
}

const PixiGameCanvas: React.FC<PixiGameCanvasProps> = () => {
    return (
        <div className="absolute inset-0 flex items-center justify-center text-white">
            PixiJS Renderer Placeholder (Not Implemented)
        </div>
    );
};

export default PixiGameCanvas;
