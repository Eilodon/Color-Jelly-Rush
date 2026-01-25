import { PigmentVec3 } from "./cjrTypes";

export const getColorHint = (current: PigmentVec3, target: PigmentVec3): string => {
    // Simple heuristic for now
    // Diff
    const rDiff = target.r - current.r;
    const gDiff = target.g - current.g;
    const bDiff = target.b - current.b;

    // Find max need
    if (Math.abs(rDiff) > 0.2 || Math.abs(gDiff) > 0.2 || Math.abs(bDiff) > 0.2) {
        if (rDiff > 0.2) return "Need RED";
        if (gDiff > 0.2) return "Need GREEN";
        if (bDiff > 0.2) return "Need BLUE";
        if (rDiff < -0.2) return "Less RED";
        if (gDiff < -0.2) return "Less GREEN";
        if (bDiff < -0.2) return "Less BLUE";
    }

    return "Perfect!";
};

export const calcMatchPercent = (p1: PigmentVec3, p2: PigmentVec3): number => {
    // EIDOLON-V: Gaussian Dopamine Curve (The "Bell of Flow")
    // Formula: e^(-k * dist^2)
    // Matches "Forgiving Start" -> "Sharp Drop" which is better for Flow State.
    // k = 2.5
    // Dist 0.00 -> 1.00 (Perfect)
    // Dist 0.14 -> 0.95 (Super Forgiving)
    // Dist 0.30 -> 0.80 (Good)
    // Dist 0.50 -> 0.53 (The "Mid" Point)
    // Dist 1.00 -> 0.08 (Trash)

    const dr = p1.r - p2.r;
    const dg = p1.g - p2.g;
    const db = p1.b - p2.b;
    const distSq = dr * dr + dg * dg + db * db;

    // Low K means wider bell = more forgiving.
    const k = 2.5;

    return Math.exp(-k * distSq);
};

export const mixPigment = (current: PigmentVec3, added: PigmentVec3, ratio: number): PigmentVec3 => {
    return {
        r: current.r + (added.r - current.r) * ratio,
        g: current.g + (added.g - current.g) * ratio,
        b: current.b + (added.b - current.b) * ratio
    };
};

export const pigmentToHex = (p: PigmentVec3): string => {
    const toHex = (c: number) => {
        const hex = Math.floor(c * 255).toString(16);
        return hex.length === 1 ? "0" + hex : hex;
    };
    return "#" + toHex(p.r) + toHex(p.g) + toHex(p.b);
};

// Snap to closest 10% if close
export const getSnapAlpha = (currentMatch: number, baseRatio: number): number => {
    // Bonus for high match players?
    return baseRatio * 1.2;
};
