/**
 * @xy-editor/core - Core editor functionality
 * 
 * This package provides the core state management, transforms, and plugin
 * system for the xy-editor. It is designed to run in Node.js and browser
 * workers without any UI dependencies.
 * 
 * @package @xy-editor/core
 * @module index
 */

// Re-export state types
export type {
    EditorNode,
    Mark,
    MarkType,
    NodeType,
    Selection,
    Position,
    HistoryStack,
    HistoryEntry,
    EditorState,
    Transaction,
    TransformStep,
} from './state/types';

// Re-export state functions
export { createEmptyState } from './state/createEmptyState';
export { applyTransaction } from './state/applyTransaction';

export { generateId } from './utils/generateId';

// Re-export transform functions
export { addMark, removeMark, toggleMark } from './transforms/marks';
export { undo, redo } from './transforms/history';

// Re-export plugins
export { PluginRegistry } from './plugins/PluginRegistry';
export type { EditorPlugin } from './plugins/PluginRegistry';
