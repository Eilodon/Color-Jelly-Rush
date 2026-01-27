// EIDOLON-V: Zero-allocation array utilities

/**
 * In-place filter using swap-remove algorithm
 * Modifies array in place, returns new length
 * O(n) time, O(1) space
 * 
 * @param array The array to filter
 * @param predicate Function that returns true if item should be kept
 */
export function filterInPlace<T>(
    array: T[],
    predicate: (item: T) => boolean
): number {
    let writeIndex = 0;

    for (let readIndex = 0; readIndex < array.length; readIndex++) {
        const item = array[readIndex];
        if (predicate(item)) {
            if (writeIndex !== readIndex) {
                array[writeIndex] = item;
            }
            writeIndex++;
        }
    }

    // Truncate array to new length
    array.length = writeIndex;
    return writeIndex;
}

/**
 * Swap-remove: O(1) removal, doesn't preserve order
 * Use when order doesn't matter
 */
export function swapRemove<T>(array: T[], index: number): T | undefined {
    if (index < 0 || index >= array.length) return undefined;

    const removed = array[index];
    const last = array.pop();

    if (index < array.length && last !== undefined) {
        array[index] = last;
    }

    return removed;
}
