import type { DrawingTool } from './PDFViewer'
import './PDFViewer.css'

interface PDFToolbarProps {
    currentPage: number
    numPages: number
    scale: number
    currentTool: DrawingTool
    penColor: string
    highlighterColor: string
    penSize: number
    highlighterSize: number
    canUndo: boolean
    canRedo: boolean
    onPageChange: (page: number) => void
    onPrevPage: () => void
    onNextPage: () => void
    onZoomIn: () => void
    onZoomOut: () => void
    onResetZoom: () => void
    onToolChange: (tool: DrawingTool) => void
    onPenColorChange: (color: string) => void
    onHighlighterColorChange: (color: string) => void
    onPenSizeChange: (size: number) => void
    onHighlighterSizeChange: (size: number) => void
    onUndo: () => void
    onRedo: () => void
    onSave: () => void
}

const COLORS = ['#000000', '#ff0000', '#0000ff', '#00aa00', '#ff6600', '#9900ff']
const HIGHLIGHTER_COLORS = ['#ffff00', '#00ff00', '#00ffff', '#ff00ff', '#ff9900']

export function PDFToolbar({
    currentPage,
    numPages,
    scale,
    currentTool,
    penColor,
    highlighterColor,
    penSize,
    highlighterSize,
    canUndo,
    canRedo,
    onPageChange,
    onPrevPage,
    onNextPage,
    onZoomIn,
    onZoomOut,
    onResetZoom,
    onToolChange,
    onPenColorChange,
    onHighlighterColorChange,
    onPenSizeChange,
    onHighlighterSizeChange,
    onUndo,
    onRedo,
    onSave
}: PDFToolbarProps) {
    return (
        <div className="pdf-toolbar">
            {/* Navigation */}
            <div className="toolbar-group">
                <button
                    className="toolbar-btn"
                    onClick={onPrevPage}
                    disabled={currentPage <= 1}
                    title="Previous page (←)"
                >
                    ◀
                </button>

                <div className="page-input-group">
                    <input
                        type="number"
                        className="page-input"
                        value={currentPage}
                        min={1}
                        max={numPages}
                        onChange={e => onPageChange(parseInt(e.target.value) || 1)}
                    />
                    <span className="page-divider">/</span>
                    <span className="page-total">{numPages}</span>
                </div>

                <button
                    className="toolbar-btn"
                    onClick={onNextPage}
                    disabled={currentPage >= numPages}
                    title="Next page (→)"
                >
                    ▶
                </button>
            </div>

            <div className="toolbar-separator" />

            {/* Zoom */}
            <div className="toolbar-group">
                <button
                    className="toolbar-btn"
                    onClick={onZoomOut}
                    title="Zoom out (Ctrl+-)"
                >
                    −
                </button>
                <button
                    className="toolbar-btn zoom-indicator"
                    onClick={onResetZoom}
                    title="Reset zoom (Ctrl+0)"
                >
                    {Math.round(scale * 100)}%
                </button>
                <button
                    className="toolbar-btn"
                    onClick={onZoomIn}
                    title="Zoom in (Ctrl++)"
                >
                    +
                </button>
            </div>

            <div className="toolbar-separator" />

            {/* Tools */}
            <div className="toolbar-group">
                <button
                    className={`toolbar-btn ${currentTool === 'select' ? 'active' : ''}`}
                    onClick={() => onToolChange('select')}
                    title="Select (V)"
                >
                    👆
                </button>
                <button
                    className={`toolbar-btn ${currentTool === 'pen' ? 'active' : ''}`}
                    onClick={() => onToolChange('pen')}
                    title="Pen (P)"
                >
                    ✏️
                </button>
                <button
                    className={`toolbar-btn ${currentTool === 'highlighter' ? 'active' : ''}`}
                    onClick={() => onToolChange('highlighter')}
                    title="Highlighter (H)"
                >
                    🖍️
                </button>
                <button
                    className={`toolbar-btn ${currentTool === 'eraser' ? 'active' : ''}`}
                    onClick={() => onToolChange('eraser')}
                    title="Eraser (E)"
                >
                    🗑️
                </button>
            </div>

            {/* Pen Options */}
            {currentTool === 'pen' && (
                <>
                    <div className="toolbar-separator" />
                    <div className="toolbar-group">
                        <span className="toolbar-label">Color:</span>
                        <div className="color-picker">
                            {COLORS.map(color => (
                                <button
                                    key={color}
                                    className={`color-btn ${penColor === color ? 'active' : ''}`}
                                    style={{ backgroundColor: color }}
                                    onClick={() => onPenColorChange(color)}
                                />
                            ))}
                            <input
                                type="color"
                                value={penColor}
                                onChange={e => onPenColorChange(e.target.value)}
                                className="color-input"
                            />
                        </div>
                        <span className="toolbar-label">Size:</span>
                        <input
                            type="range"
                            min="1"
                            max="10"
                            value={penSize}
                            onChange={e => onPenSizeChange(parseInt(e.target.value))}
                            className="size-slider"
                        />
                        <span className="size-value">{penSize}px</span>
                    </div>
                </>
            )}

            {/* Highlighter Options */}
            {currentTool === 'highlighter' && (
                <>
                    <div className="toolbar-separator" />
                    <div className="toolbar-group">
                        <span className="toolbar-label">Color:</span>
                        <div className="color-picker">
                            {HIGHLIGHTER_COLORS.map(color => (
                                <button
                                    key={color}
                                    className={`color-btn ${highlighterColor === color ? 'active' : ''}`}
                                    style={{ backgroundColor: color }}
                                    onClick={() => onHighlighterColorChange(color)}
                                />
                            ))}
                        </div>
                        <span className="toolbar-label">Size:</span>
                        <input
                            type="range"
                            min="10"
                            max="40"
                            value={highlighterSize}
                            onChange={e => onHighlighterSizeChange(parseInt(e.target.value))}
                            className="size-slider"
                        />
                        <span className="size-value">{highlighterSize}px</span>
                    </div>
                </>
            )}

            <div className="toolbar-spacer" />

            {/* Actions */}
            <div className="toolbar-group">
                <button
                    className="toolbar-btn"
                    onClick={onUndo}
                    disabled={!canUndo}
                    title="Undo (Ctrl+Z)"
                >
                    ↩️
                </button>
                <button
                    className="toolbar-btn"
                    onClick={onRedo}
                    disabled={!canRedo}
                    title="Redo (Ctrl+Shift+Z)"
                >
                    ↪️
                </button>
            </div>

            <div className="toolbar-separator" />

            <div className="toolbar-group">
                <button
                    className="toolbar-btn save-btn"
                    onClick={onSave}
                    title="Save annotations (Ctrl+S)"
                >
                    💾 Save
                </button>
            </div>
        </div>
    )
}
