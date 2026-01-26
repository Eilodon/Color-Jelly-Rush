import { Component } from '../Component';

export type TattooSynergyEffect = {
    id: string;
    synergyId: string;
    elapsed: number;
    duration: number;
    tier: 'basic' | 'advanced' | 'master' | 'legendary';
};

export class SynergyComponent extends Component {
    public activeEffects: TattooSynergyEffect[] = [];
    public cooldowns: Map<string, number> = new Map();
    public stats: Map<string, number> = new Map();
    public discovered: Set<string> = new Set();

    // Pre-load common discoveries?
    constructor(entityId: string) {
        super(entityId);
        this.discovered.add('purification_mastery');
        this.discovered.add('explosive_speed');
    }
}
