/**
 * @xy-editor/react - React components and hooks for xy-editor
 * @package @xy-editor/react
 * @module index
 */

// Context
export { EditorContext, EditorProvider, useEditorContext } from './context/EditorContext';
export type { EditorContextValue, EditorProviderProps, } from './context/EditorContext';

// Hooks
export { useEditorState } from './hooks/useEditorState';
export { useSelection } from './hooks/useSelection';
export { useHistory } from './hooks/useHistory';
export { useEditor } from './hooks/useEditor';
export { useFileIngest } from './hooks/useFileIngest';

// Components - Editor
export { Editor, EditorContent, UncontrolledEditor } from './components/Editor';
export type { EditorProps, EditorContentProps, EditorHandle, UncontrolledEditorProps } from './components/Editor';
export { renderNode, marksToStyle } from './components/Editor';

// Components - DropZone
export { DropZone } from './components/DropZone';
export type { DropZoneProps } from './components/DropZone';
export { FileAttacher } from './components/DropZone';
export type { FileAttacherProps } from './components/DropZone';
export { FileTypeChip } from './components/DropZone';
export type { FileTypeChipProps } from './components/DropZone';
