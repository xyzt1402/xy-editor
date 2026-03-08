import { nanoid } from 'nanoid';

/**
 * Generates a unique ID for nodes.
 * Uses a nanoid for better uniqueness and performance compared to a simple counter.
 * @returns A unique string ID
 * @example
 * const id1 = generateId(); // e.g. 'V1StGXR8_Z5jdHi6B-myT'
 * const id2 = generateId(); // e.g. 'mJ9s8fX9a2b3c4d5e6f7g'
 * console.log(id1 !== id2); // true
 */

export function generateId(): string {
    return nanoid();
}