import { useState } from 'react'
import type { DrawingTool, EraserMode } from './PDFViewer'
import './PDFViewer.css'

interface PDFToolbarProps {
    currentPage: number
    numPages: number
    scale: number
    currentTool: DrawingTool
    eraserMode: EraserMode
    penColor: string
    highlighterColor: string
    penSize: number
    highlighterSize: number
    eraserSize: number
    canUndo: boolean
    canRedo: boolean
    onPageChange: (page: number) => void
    onPrevPage: () => void
    onNextPage: () => void
    onZoomIn: () => void
    onZoomOut: () => void
    onResetZoom: () => void
    onToolChange: (tool: DrawingTool) => void
    onEraserModeChange: (mode: EraserMode) => void
    onPenColorChange: (color: string) => void
    onHighlighterColorChange: (color: string) => void
    onPenSizeChange: (size: number) => void
    onHighlighterSizeChange: (size: number) => void
    onEraserSizeChange: (size: number) => void
    onUndo: () => void
    onRedo: () => void
    onSave: () => void
}

const COLORS = ['#000000', '#ff0000', '#0000ff', '#00aa00', '#ff6600', '#9900ff']
const HIGHLIGHTER_COLORS = ['#ffff00', '#00ff00', '#00ffff', '#ff00ff', '#ff9900']

const ERASER_MODE_ICONS: Record<EraserMode, string> = {
    'area': '⬚',
    'stroke': '⚡',
    'whiteout': '▢'
}

const ERASER_MODE_TOOLTIPS: Record<EraserMode, string> = {
    'area': 'Erase pixels touched (1)',
    'stroke': 'Delete entire strokes (2)',
    'whiteout': 'Draw white over (3)'
}

export function PDFToolbar({
    currentPage,
    numPages,
    scale,
    currentTool,
    eraserMode,
    penColor,
    highlighterColor,
    penSize,
    highlighterSize,
    eraserSize,
    canUndo,
    canRedo,
    onPageChange,
    onPrevPage,
    onNextPage,
    onZoomIn,
    onZoomOut,
    onResetZoom,
    onToolChange,
    onEraserModeChange,
    onPenColorChange,
    onHighlighterColorChange,
    onPenSizeChange,
    onHighlighterSizeChange,
    onEraserSizeChange,
    onUndo,
    onRedo,
    onSave
}: PDFToolbarProps) {
    const [showToolOptions, setShowToolOptions] = useState(false)

    const getCurrentSize = () => {
        switch (currentTool) {
            case 'pen': return penSize
            case 'highlighter': return highlighterSize
            case 'eraser': return eraserSize
            default: return 0
        }
    }

    const handleSizeChange = (size: number) => {
        switch (currentTool) {
            case 'pen': onPenSizeChange(size); break
            case 'highlighter': onHighlighterSizeChange(size); break
            case 'eraser': onEraserSizeChange(size); break
        }
    }

    const getSizeRange = () => {
        switch (currentTool) {
            case 'pen': return { min: 1, max: 10 }
            case 'highlighter': return { min: 10, max: 40 }
            case 'eraser': return { min: 5, max: 50 }
            default: return { min: 1, max: 10 }
        }
    }

    return (
        <div className="pdf-toolbar compact">
            {/* Navigation - compact */}
            <div className="toolbar-group">
                <button
                    className="toolbar-btn-sm"
                    onClick={onPrevPage}
                    disabled={currentPage <= 1}
                    title="Previous (←)"
                >◀</button>

                <div className="page-input-compact">
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
                    className="toolbar-btn-sm"
                    onClick={onNextPage}
                    disabled={currentPage >= numPages}
                    title="Next (→)"
                >▶</button>
            </div>

            <div className="toolbar-separator-sm" />

            {/* Zoom - compact */}
            <div className="toolbar-group">
                <button className="toolbar-btn-sm" onClick={onZoomOut} title="Zoom out">−</button>
                <button
                    className="toolbar-btn-sm zoom-compact"
                    onClick={onResetZoom}
                    title="Reset zoom"
                >
                    {Math.round(scale * 100)}%
                </button>
                <button className="toolbar-btn-sm" onClick={onZoomIn} title="Zoom in">+</button>
            </div>

            <div className="toolbar-separator-sm" />

            {/* Drawing Tools - grouped with dropdown */}
            <div
                className="toolbar-group tool-dropdown-container"
                onMouseEnter={() => setShowToolOptions(true)}
                onMouseLeave={() => setShowToolOptions(false)}
            >
                {/* Main tool buttons */}
                <button
                    className={`toolbar-btn-sm ${currentTool === 'select' ? 'active' : ''}`}
                    onClick={() => onToolChange('select')}
                    title="Select (V)"
                >👆</button>
                <button
                    className={`toolbar-btn-sm ${currentTool === 'pen' ? 'active' : ''}`}
                    onClick={() => onToolChange('pen')}
                    title="Pen (P)"
                >✏️</button>
                <button
                    className={`toolbar-btn-sm ${currentTool === 'highlighter' ? 'active' : ''}`}
                    onClick={() => onToolChange('highlighter')}
                    title="Highlighter (H)"
                >🖍️</button>
                <button
                    className={`toolbar-btn-sm ${currentTool === 'eraser' ? 'active' : ''}`}
                    onClick={() => onToolChange('eraser')}
                    title="Eraser (E)"
                >🧹</button>

                {/* Tool options dropdown */}
                {showToolOptions && currentTool !== 'select' && (
                    <div className="tool-options-dropdown">
                        {/* Pen options */}
                        {currentTool === 'pen' && (
                            <div className="dropdown-section">
                                <div className="dropdown-row">
                                    {COLORS.map(color => (
                                        <button
                                            key={color}
                                            className={`color-dot ${penColor === color ? 'active' : ''}`}
                                            style={{ backgroundColor: color }}
                                            onClick={() => onPenColorChange(color)}
                                        />
                                    ))}
                                    <input
                                        type="color"
                                        value={penColor}
                                        onChange={e => onPenColorChange(e.target.value)}
                                        className="color-input-sm"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Highlighter options */}
                        {currentTool === 'highlighter' && (
                            <div className="dropdown-section">
                                <div className="dropdown-row">
                                    {HIGHLIGHTER_COLORS.map(color => (
                                        <button
                                            key={color}
                                            className={`color-dot ${highlighterColor === color ? 'active' : ''}`}
                                            style={{ backgroundColor: color }}
                                            onClick={() => onHighlighterColorChange(color)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Eraser mode options */}
                        {currentTool === 'eraser' && (
                            <div className="dropdown-section">
                                <div className="dropdown-row eraser-modes">
                                    {(['area', 'stroke', 'whiteout'] as EraserMode[]).map(mode => (
                                        <button
                                            key={mode}
                                            className={`eraser-mode-sm ${eraserMode === mode ? 'active' : ''}`}
                                            onClick={() => onEraserModeChange(mode)}
                                            title={ERASER_MODE_TOOLTIPS[mode]}
                                        >
                                            {ERASER_MODE_ICONS[mode]}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Size slider for all drawing tools */}
                        <div className="dropdown-section">
                            <div className="dropdown-row size-row">
                                <span className="size-label">Size:</span>
                                <input
                                    type="range"
                                    min={getSizeRange().min}
                                    max={getSizeRange().max}
                                    value={getCurrentSize()}
                                    onChange={e => handleSizeChange(parseInt(e.target.value))}
                                    className="size-slider-sm"
                                />
                                <span className="size-value-sm">{getCurrentSize()}px</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="toolbar-spacer" />

            {/* Actions - compact */}
            <div className="toolbar-group">
                <button
                    className="toolbar-btn-sm"
                    onClick={onUndo}
                    disabled={!canUndo}
                    title="Undo (Ctrl+Z)"
                >↩</button>
                <button
                    className="toolbar-btn-sm"
                    onClick={onRedo}
                    disabled={!canRedo}
                    title="Redo (Ctrl+Y)"
                >↪</button>
                <button
                    className="toolbar-btn-sm save-btn-sm"
                    onClick={onSave}
                    title="Save (Ctrl+S)"
                >💾</button>
            </div>
        </div>
    )
}
