import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/esm/Page/AnnotationLayer.css'
import 'react-pdf/dist/esm/Page/TextLayer.css'
import { AnnotationLayer } from './AnnotationLayer'
import { PDFToolbar } from './PDFToolbar'
import './PDFViewer.css'

// Set up PDF.js worker - use local worker from node_modules
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
).toString()

export type DrawingTool = 'select' | 'pen' | 'highlighter' | 'eraser'

export interface Stroke {
    id: string
    tool: 'pen' | 'highlighter'
    points: Array<{ x: number; y: number; pressure: number }>
    color: string
    size: number
    page: number
}

interface PDFViewerProps {
    data: ArrayBuffer
    title?: string
    onSave?: (annotations: Record<number, Stroke[]>) => void
    initialAnnotations?: Record<number, Stroke[]>
}

export function PDFViewer({ data, title, onSave, initialAnnotations = {} }: PDFViewerProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const [numPages, setNumPages] = useState(0)
    const [currentPage, setCurrentPage] = useState(1)
    const [scale, setScale] = useState(1)
    const [pageWidth, setPageWidth] = useState(0)

    // Tool state
    const [currentTool, setCurrentTool] = useState<DrawingTool>('select')
    const [penColor, setPenColor] = useState('#000000')
    const [highlighterColor, setHighlighterColor] = useState('#ffff00')
    const [penSize, setPenSize] = useState(2)
    const [highlighterSize, setHighlighterSize] = useState(20)

    // Annotations per page
    const [annotations, setAnnotations] = useState<Record<number, Stroke[]>>(initialAnnotations)
    const [history, setHistory] = useState<Array<Record<number, Stroke[]>>>([initialAnnotations])
    const [historyIndex, setHistoryIndex] = useState(0)

    // Loading state
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Memoize the file object to prevent unnecessary reloads
    // Clone the ArrayBuffer to avoid "detached ArrayBuffer" errors when the Worker transfers ownership
    const pdfFile = useMemo(() => {
        if (!data) return null
        // Clone the ArrayBuffer to create a fresh copy
        const clonedData = data.slice(0)
        return { data: clonedData }
    }, [data])

    // Calculate fit width on mount
    useEffect(() => {
        if (containerRef.current) {
            const containerWidth = containerRef.current.clientWidth - 80 // padding
            setPageWidth(containerWidth)
        }
    }, [])

    // Handle document load
    const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
        setNumPages(numPages)
        setLoading(false)
    }, [])

    const onDocumentLoadError = useCallback((error: Error) => {
        setError(error.message)
        setLoading(false)
    }, [])

    // Navigation
    const goToPage = useCallback((page: number) => {
        const targetPage = Math.max(1, Math.min(page, numPages))
        setCurrentPage(targetPage)
    }, [numPages])

    const nextPage = useCallback(() => goToPage(currentPage + 1), [currentPage, goToPage])
    const prevPage = useCallback(() => goToPage(currentPage - 1), [currentPage, goToPage])

    // Zoom
    const zoomIn = useCallback(() => setScale(s => Math.min(3, s + 0.25)), [])
    const zoomOut = useCallback(() => setScale(s => Math.max(0.5, s - 0.25)), [])
    const resetZoom = useCallback(() => setScale(1), [])

    // Add stroke to current page
    const addStroke = useCallback((stroke: Stroke) => {
        setAnnotations(prev => {
            const pageStrokes = prev[currentPage] || []
            const newAnnotations = {
                ...prev,
                [currentPage]: [...pageStrokes, stroke]
            }
            // Add to history
            setHistory(h => [...h.slice(0, historyIndex + 1), newAnnotations])
            setHistoryIndex(i => i + 1)
            return newAnnotations
        })
    }, [currentPage, historyIndex])

    // Erase stroke
    const eraseStroke = useCallback((strokeId: string) => {
        setAnnotations(prev => {
            const pageStrokes = prev[currentPage] || []
            const newAnnotations = {
                ...prev,
                [currentPage]: pageStrokes.filter(s => s.id !== strokeId)
            }
            setHistory(h => [...h.slice(0, historyIndex + 1), newAnnotations])
            setHistoryIndex(i => i + 1)
            return newAnnotations
        })
    }, [currentPage, historyIndex])

    // Undo/Redo
    const undo = useCallback(() => {
        if (historyIndex > 0) {
            setHistoryIndex(i => i - 1)
            setAnnotations(history[historyIndex - 1])
        }
    }, [historyIndex, history])

    const redo = useCallback(() => {
        if (historyIndex < history.length - 1) {
            setHistoryIndex(i => i + 1)
            setAnnotations(history[historyIndex + 1])
        }
    }, [historyIndex, history])

    // Save
    const handleSave = useCallback(() => {
        onSave?.(annotations)
    }, [annotations, onSave])

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't handle if typing
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

            const key = e.key.toLowerCase()

            // Navigation
            if (key === 'arrowleft' || key === 'pageup') {
                e.preventDefault()
                prevPage()
            } else if (key === 'arrowright' || key === 'pagedown') {
                e.preventDefault()
                nextPage()
            } else if (key === 'home') {
                e.preventDefault()
                goToPage(1)
            } else if (key === 'end') {
                e.preventDefault()
                goToPage(numPages)
            }

            // Zoom
            else if ((e.ctrlKey || e.metaKey) && (key === '=' || key === '+')) {
                e.preventDefault()
                zoomIn()
            } else if ((e.ctrlKey || e.metaKey) && key === '-') {
                e.preventDefault()
                zoomOut()
            } else if ((e.ctrlKey || e.metaKey) && key === '0') {
                e.preventDefault()
                resetZoom()
            }

            // Tools
            else if (key === 'p' && !e.ctrlKey) {
                e.preventDefault()
                setCurrentTool('pen')
            } else if (key === 'h' && !e.ctrlKey) {
                e.preventDefault()
                setCurrentTool('highlighter')
            } else if (key === 'e' && !e.ctrlKey) {
                e.preventDefault()
                setCurrentTool('eraser')
            } else if (key === 'v' || key === 'escape') {
                e.preventDefault()
                setCurrentTool('select')
            }

            // Undo/Redo
            else if ((e.ctrlKey || e.metaKey) && key === 'z' && !e.shiftKey) {
                e.preventDefault()
                undo()
            } else if ((e.ctrlKey || e.metaKey) && key === 'z' && e.shiftKey) {
                e.preventDefault()
                redo()
            } else if ((e.ctrlKey || e.metaKey) && key === 'y') {
                e.preventDefault()
                redo()
            }

            // Save
            else if ((e.ctrlKey || e.metaKey) && key === 's') {
                e.preventDefault()
                handleSave()
            }
        }

        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [prevPage, nextPage, goToPage, numPages, zoomIn, zoomOut, resetZoom, undo, redo, handleSave])

    const currentColor = currentTool === 'highlighter' ? highlighterColor : penColor
    const currentSize = currentTool === 'highlighter' ? highlighterSize : penSize

    return (
        <div ref={containerRef} className="pdf-viewer" tabIndex={0}>
            {/* Toolbar */}
            <PDFToolbar
                currentPage={currentPage}
                numPages={numPages}
                scale={scale}
                currentTool={currentTool}
                penColor={penColor}
                highlighterColor={highlighterColor}
                penSize={penSize}
                highlighterSize={highlighterSize}
                canUndo={historyIndex > 0}
                canRedo={historyIndex < history.length - 1}
                onPageChange={goToPage}
                onPrevPage={prevPage}
                onNextPage={nextPage}
                onZoomIn={zoomIn}
                onZoomOut={zoomOut}
                onResetZoom={resetZoom}
                onToolChange={setCurrentTool}
                onPenColorChange={setPenColor}
                onHighlighterColorChange={setHighlighterColor}
                onPenSizeChange={setPenSize}
                onHighlighterSizeChange={setHighlighterSize}
                onUndo={undo}
                onRedo={redo}
                onSave={handleSave}
            />

            {/* Title */}
            {title && <div className="pdf-title">{title}</div>}

            {/* PDF Container */}
            <div className="pdf-container">
                {loading && <div className="pdf-loading">Loading PDF...</div>}
                {error && <div className="pdf-error">Error: {error}</div>}

                <Document
                    file={pdfFile}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={onDocumentLoadError}
                    loading=""
                >
                    <div className="pdf-page-wrapper" style={{ transform: `scale(${scale})` }}>
                        <Page
                            pageNumber={currentPage}
                            width={pageWidth}
                            renderTextLayer={true}
                            renderAnnotationLayer={true}
                        />

                        {/* Annotation Layer */}
                        <AnnotationLayer
                            width={pageWidth}
                            height={pageWidth * 1.414} // A4 ratio approximation
                            tool={currentTool}
                            color={currentColor}
                            size={currentSize}
                            strokes={annotations[currentPage] || []}
                            pageNumber={currentPage}
                            onAddStroke={addStroke}
                            onEraseStroke={eraseStroke}
                        />
                    </div>
                </Document>
            </div>

            {/* Page indicator */}
            <div className="pdf-page-indicator">
                Page {currentPage} of {numPages}
            </div>
        </div>
    )
}
