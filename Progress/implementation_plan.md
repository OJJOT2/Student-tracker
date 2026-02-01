# PDF Viewer Rebuild Plan

## Goal
Completely rewrite the `PDFViewer` component to establish a robust, vertical scrolling architecture with correct page virtualization, reliable navigation, and full feature parity with the previous version.

## The Problem
The previous implementation suffered from mixed scrolling metaphors (horizontal vs. vertical), broken page tracking, and spaghetti code causing "missing function" errors. The resize/scroll logic was fragile.

## Architecture Change
- **Layout**: Native Vertical Scroll (Standard CSS `overflow-y: auto`).
- **Rendering**: **Virtualized List** approach. We will use a custom robust virtualization or just standard lazy loading with `IntersectionObserver` but simplified.
  - *Key*: Pages are independent blocks stacked vertically.
- **State Management**: Consolidate complex state (annotations, history, tools) into a `usePDFStore` (local context or Zustand) or use a `useReducer` to avoid the "too many `useState` hooks" mess. **Decision**: Use a dedicated `PDFContext` and Reducer for cleaner separation of logic from UI.

## Phase 1: Cleanup & Foundation
1.  **Backup**: Ensure current code is safe (git or copy).
2.  **Clear**: Reset `PDFViewer.tsx` and `PDFViewer.css`.
3.  **Foundation**: Create a clean `PDFViewer` shell that accepts `data` (ArrayBuffer).

## Phase 2: Vertical Rendering & Navigation (The Core Fix)
1.  **PDF Document Wrapper**: Setup `react-pdf` Document.
2.  **Layout Engine**:
    - Implement a `VirtualScrollContainer` that handles the scroll events.
    - **Page Registry**: A ref-map to track page Y-positions for accurate "Go to Page" scrolling.
    - **Intersection Observer**: robustly detect `visiblePages` to trigger rendering and update "Current Page" counter.
3.  **Zoom Logic**: CSS transform or width-based scaling?
    - *Decision*: Width-based scaling (changing the container width/page width prop) for crisp text.

## Phase 3: Feature Restoration
*Restore features one by one on the new foundation.*

### 3.1 Toolbar & Controls
- Re-integrate `PDFToolbar` (existing component is mostly fine, might need prop simplifications).
- Wire up Zoom, Page Nav, Undo/Redo actions to the new State.

### 3.2 Annotation Layer
- **Layering**: Ensure `AnnotationLayer` sits strictly on top of the PDF Page Canvas.
- **Coordinate System**: Normalize coordinates to be resolution-independent (0-1 space or PDF point space) if possible, or stick to current "pixels at scale 1" logic but ensure scaling is applied consistently.
- **Drawing**: Re-implement Pen/Highlighter using existing `Freehand` logic but clean up event handlers.

### 3.3 Images
- Re-integrate `ResizableImage`.
- Ensure Z-Index logic: Images must be interactable in "Select" mode.

## Phase 4: Interactions & Polish
- **Keyboard Shortcuts**: Re-bind keys (P, H, E, V, Arrows, Ctrl+Z).
- **History**: Re-implement Undo/Redo stack.
- **Save**: Export function (`onSave`).

## File Plan

### `src/components/PDFViewer/`
- **[MODIFY] `PDFViewer.tsx`**: The main entry point. Will wrap content in `PDFProvider`.
- **[NEW] `PDFContext.tsx`**: Handle all state (tool, color, history, page num).
- **[NEW] `PDFPage.tsx`**: Isolated component for a single page. Handles its own sizing and visibility.
- **[MODIFY] `PDFViewer.css`**: Simplified structural CSS. Flexbox column.

## Verification
1.  **Scroll Test**: Load large PDF. Scroll fast. Verify page counter updates correctly.
2.  **Zoom Test**: Zoom in/out. Verify scroll position remains stable(ish) and resolution is sharp.
3.  **Draw Test**: Draw on Page 1. Scroll to Page 10. Draw. Scroll back. Verify Page 1 strokes persist.
