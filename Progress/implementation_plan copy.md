# Stage 8 — Split Screen System

## Goal
Implement a flexible split-screen system that allows users to view and interact with the Video Player and PDF Viewer simultaneously. This is crucial for the "Study Mode" where a user watches a lecture while reading or annotating slides/notes.

## User Review Required
> [!IMPORTANT]
> **Layout Persistence**: I plan to save the split position and open panes in a new `layoutStore` so the user's setup is preserved between sessions.

## Proposed Changes

### New Components

#### [NEW] `src/components/SplitScreen/`
- **`SplitScreenLayout.tsx`**: Main container that manages the two panes (Left/Right).
- **`ResizablePane.tsx`**: A wrapper component that handles the drag-to-resize functionality.
- **`PaneHandle.tsx`**: The visual grabber bar between panes.

### State Management

#### [NEW] `src/stores/layoutStore.ts`
- Store for managing:
  - `splitRatio`: number (default 0.5)
  - `leftPane`: 'video' | 'pdf' | 'browser'
  - `rightPane`: 'pdf' | 'video' | 'notes'
  - `isVertical`: boolean (video on top, PDF on bottom?)
  
### Routing & Integration

#### [MODIFY] `src/App.tsx`
- Add new route `/study` (or `/split`) that renders the `SplitScreenLayout`.
- This route will likely replace the standalone `/player` route for the main study session experience, or exist alongside it.

#### [MODIFY] `src/pages/Sessions/SessionCard.tsx`
- Add "Open in Split View" button/action.

#### [MODIFY] `src/components/VideoPlayer/VideoPlayer.tsx`
- Ensure it resizes gracefully (it likely does via CSS, but might need `ResizeObserver` for specific UI elements).

#### [MODIFY] `src/components/PDFViewer/PDFViewer.tsx`
- Ensure the `PDFPageWithAnnotations` correctly updates `pageWidth` when the pane is resized. This is critical for drawing coordinates.

## Detailed Component Design

### `SplitScreenLayout`
```tsx
<div className="split-screen-container">
  <div className="pane left" style={{ width: `${splitRatio}%` }}>
    {renderLeftComponent()}
  </div>
  <PaneHandle onDrag={handleDrag} />
  <div className="pane right" style={{ width: `${100 - splitRatio}%` }}>
    {renderRightComponent()}
  </div>
</div>
```

## Verification Plan

### Automated Tests
- None currently existing for UI components.

### Manual Verification
1.  **Resize Functionality**:
    - Drag the handle between Video and PDF.
    - Verify that both components resize smoothly.
    - Verify that PDF annotations remain accurate after resize (coordinate system check).
2.  **Video Player Constraints**:
    - shrinking the video pane should resize the video player controls appropriately.
3.  **Persistence**:
    - Change split ratio -> Refresh app -> Check if ratio is restored.
4.  **Routing**:
    - Navigate to `/study` with a specific session and PDF loaded.
    - Verify correct resources are displayed.
