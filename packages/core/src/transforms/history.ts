/**
 * Transform functions for undo/redo operations.
 * @package @xy-editor/core
 * @module transforms/history
 */

import type { EditorState } from '../state/types';

/**
 * Deep clones an object using structuredClone (with fallback).
 * Ensures immutability of the state.
 */
function deepClone<T>(obj: T): T {
    return structuredClone(obj);
}

/**
 * Reverts the editor state to the previous state in history.
 * 
 * This function:
 * 1. Takes the last entry from history.past
 * 2. Moves the current state to history.future
 * 3. Returns the previous state
 * 
 * @param state - The current editor state
 * @returns The previous editor state, or null if there's nothing to undo
 * 
 * @example
 * ```typescript
 * const previousState = undo(state);
 * if (previousState) {
 *   // Successfully undone
 * }
 * ```
 */
export function undo(state: EditorState): EditorState | null {
    const { history } = state;

    // Check if there's anything to undo
    if (history.past.length === 0) {
        return null;
    }

    // Get the last entry from the past stack
    const lastEntry = history.past[history.past.length - 1];

    if (!lastEntry) {
        return null;
    }

    // Create a new state:
    // - The previous state becomes the current state
    // - Current state goes to the future stack
    const newPast = history.past.slice(0, -1); // Remove the last entry
    const newFuture = [
        {
            state: deepClone(state),
            timestamp: Date.now(),
        },
        ...history.future,
    ];

    // Return the new state with the previous state restored
    return {
        ...lastEntry.state,
        history: {
            past: newPast,
            future: newFuture,
        },
        meta: {
            ...lastEntry.state.meta,
            action: 'undo',
            timestamp: Date.now(),
        },
    };
}

/**
 * Re-applies a previously undone state from history.
 * 
 * This function:
 * 1. Takes the last entry from history.future
 * 2. Moves the current state to history.past
 * 3. Returns the future state
 * 
 * @param state - The current editor state
 * @returns The next editor state from history, or null if there's nothing to redo
 * 
 * @example
 * ```typescript
 * const nextState = redo(state);
 * if (nextState) {
 *   // Successfully redone
 * }
 * ```
 */
export function redo(state: EditorState): EditorState | null {
    const { history } = state;

    // Check if there's anything to redo
    if (history.future.length === 0) {
        return null;
    }

    // Get the last entry from the future stack
    const nextEntry = history.future[0];

    if (!nextEntry) {
        return null;
    }

    // Create a new state:
    // - The next state becomes the current state
    // - Current state goes to the past stack
    const newPast = [
        ...history.past,
        {
            state: deepClone(state),
            timestamp: Date.now(),
        },
    ];
    const newFuture = history.future.slice(1); // Remove the first entry

    // Return the new state with the next state restored
    return {
        ...nextEntry.state,
        history: {
            past: newPast,
            future: newFuture,
        },
        meta: {
            ...nextEntry.state.meta,
            action: 'redo',
            timestamp: Date.now(),
        },
    };
}
