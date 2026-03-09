/**
 * @package @xy-editor/core
 *
 * Public API surface. Always import from here, not from internal paths.
 *
 * @example
 * ```typescript
 * import {
 *   createEmptyState,
 *   applyTransaction,
 *   addMark, removeMark, toggleMark,
 *   undo, redo,
 * } from '@xy-editor/core';
 * ```
 */

// ─── Types ────────────────────────────────────────────────────────────────────
export type {
    // Primitives
    Mark,
    MarkType,
    NodeType,
    EditorNode,
    // Selection
    Selection,
    SelectionPoint,
    // State
    EditorState,
    HistoryEntry,
    HistoryStack,
    // Transactions
    Transaction,
    TransformStep,
    TransformStepType,
    // Plugins
    EditorPlugin,
} from './state/types';

// ─── State ────────────────────────────────────────────────────────────────────
export { createEmptyState } from './state/createEmptyState';
export { applyTransaction } from './state/applyTransaction';

// ─── Transforms ───────────────────────────────────────────────────────────────
export { addMark, removeMark, toggleMark, isMarkActiveInSelection } from './transforms/marks';
export { undo, redo } from './transforms/history';

// ─── Plugins ──────────────────────────────────────────────────────────────────
export { PluginRegistry } from './plugins/PluginRegistry';

// ─── Utils ────────────────────────────────────────────────────────────────────
export { generateId } from './utils/generateId';