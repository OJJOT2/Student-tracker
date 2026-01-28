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
export type EraserMode = 'area' | 'stroke' | 'whiteout'

export interface Stroke {
    id: string
    tool: 'pen' | 'highlighter' | 'whiteout'
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

// Component for a single PDF page with annotation layer
interface PDFPageWithAnnotationsProps {
    pageNumber: number
    pageWidth: number
    scale: number
    tool: DrawingTool
    eraserMode: EraserMode
    color: string
    size: number
    strokes: Stroke[]
    onAddStroke: (stroke: Stroke) => void
    onEraseStroke: (strokeId: string) => void
    onUpdateStrokes: (strokes: Stroke[]) => void
    isVisible: boolean
}

function PDFPageWithAnnotations({
    pageNumber,
    pageWidth,
    scale,
    tool,
    eraserMode,
    color,
    size,
    strokes,
    onAddStroke,
    onEraseStroke,
    onUpdateStrokes,
    isVisible
}: PDFPageWithAnnotationsProps) {
    const pageRef = useRef<HTMLDivElement>(null)
    const [pageHeight, setPageHeight] = useState(pageWidth * 1.414)

    const handlePageLoad = useCallback(({ height, width }: { height: number; width: number }) => {
        // Calculate actual page height based on rendered width
        const aspectRatio = height / width
        setPageHeight(pageWidth * aspectRatio)
    }, [pageWidth])

    if (!isVisible) {
        // Placeholder for non-visible pages
        return (
            <div
                className="pdf-page-placeholder"
                style={{
                    width: pageWidth * scale,
                    height: pageHeight * scale,
                    minWidth: pageWidth * scale
                }}
                data-page={pageNumber}
            >
                <span>Page {pageNumber}</span>
            </div>
        )
    }

    return (
        <div
            ref={pageRef}
            className="pdf-page-item"
            data-page={pageNumber}
            style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}
        >
            <Page
                pageNumber={pageNumber}
                width={pageWidth}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                onLoadSuccess={handlePageLoad}
            />
            <AnnotationLayer
                width={pageWidth}
                height={pageHeight}
                tool={tool}
                eraserMode={eraserMode}
                color={color}
                size={size}
                strokes={strokes}
                pageNumber={pageNumber}
                onAddStroke={onAddStroke}
                onEraseStroke={onEraseStroke}
                _onUpdateStrokes={onUpdateStrokes}
            />
        </div>
    )
}

export function PDFViewer({ data, title, onSave, initialAnnotations = {} }: PDFViewerProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const scrollContainerRef = useRef<HTMLDivElement>(null)
    const [numPages, setNumPages] = useState(0)
    const [currentPage, setCurrentPage] = useState(1)
    const [scale, setScale] = useState(1)
    const [pageWidth, setPageWidth] = useState(0)
    const [visiblePages, setVisiblePages] = useState<Set<number>>(new Set([1]))

    // Tool state
    const [currentTool, setCurrentTool] = useState<DrawingTool>('select')
    const [eraserMode, setEraserMode] = useState<EraserMode>('stroke')
    const [penColor, setPenColor] = useState('#000000')
    const [highlighterColor, setHighlighterColor] = useState('#ffff00')
    const [penSize, setPenSize] = useState(2)
    const [highlighterSize, setHighlighterSize] = useState(20)
    const [eraserSize, setEraserSize] = useState(20)

    // Annotations per page
    const [annotations, setAnnotations] = useState<Record<number, Stroke[]>>(initialAnnotations)
    const [history, setHistory] = useState<Array<Record<number, Stroke[]>>>([initialAnnotations])
    const [historyIndex, setHistoryIndex] = useState(0)

    // Loading state
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Memoize the file object to prevent unnecessary reloads
    const pdfFile = useMemo(() => {
        if (!data) return null
        const clonedData = data.slice(0)
        return { data: clonedData }
    }, [data])

    // Calculate fit width on mount
    useEffect(() => {
        if (containerRef.current) {
            const containerWidth = containerRef.current.clientWidth - 80
            setPageWidth(containerWidth)
        }
    }, [])

    // Handle document load
    const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
        setNumPages(numPages)
        setLoading(false)
        // Initialize visible pages (first few pages)
        setVisiblePages(new Set([1, 2, 3]))
    }, [])

    const onDocumentLoadError = useCallback((error: Error) => {
        setError(error.message)
        setLoading(false)
    }, [])

    // Track visible pages using IntersectionObserver
    useEffect(() => {
        if (!scrollContainerRef.current || numPages === 0) return

        const observer = new IntersectionObserver(
            (entries) => {
                setVisiblePages(prev => {
                    const next = new Set(prev)
                    entries.forEach(entry => {
                        const pageNum = parseInt(entry.target.getAttribute('data-page') || '0')
                        if (pageNum > 0) {
                            if (entry.isIntersecting) {
                                // Add page and adjacent pages for buffer
                                next.add(pageNum)
                                if (pageNum > 1) next.add(pageNum - 1)
                                if (pageNum < numPages) next.add(pageNum + 1)
                            }
                        }
                    })
                    return next
                })
            },
            {
                root: scrollContainerRef.current,
                rootMargin: '200px',
                threshold: 0.1
            }
        )

        // Observe all page elements
        const pageElements = scrollContainerRef.current.querySelectorAll('[data-page]')
        pageElements.forEach(el => observer.observe(el))

        return () => observer.disconnect()
    }, [numPages, loading])

    // Track current page from scroll position
    useEffect(() => {
        const scrollContainer = scrollContainerRef.current
        if (!scrollContainer) return

        const handleScroll = () => {
            const scrollLeft = scrollContainer.scrollLeft
            const pageWidthWithGap = (pageWidth * scale) + 20 // 20px gap
            const currentPageNum = Math.floor(scrollLeft / pageWidthWithGap) + 1
            if (currentPageNum !== currentPage && currentPageNum > 0 && currentPageNum <= numPages) {
                setCurrentPage(currentPageNum)
            }
        }

        scrollContainer.addEventListener('scroll', handleScroll)
        return () => scrollContainer.removeEventListener('scroll', handleScroll)
    }, [pageWidth, scale, currentPage, numPages])

    // Navigation
    const goToPage = useCallback((page: number) => {
        const targetPage = Math.max(1, Math.min(page, numPages))
        setCurrentPage(targetPage)

        // Scroll to page
        if (scrollContainerRef.current) {
            const pageWidthWithGap = (pageWidth * scale) + 20
            scrollContainerRef.current.scrollTo({
                left: (targetPage - 1) * pageWidthWithGap,
                behavior: 'smooth'
            })
        }
    }, [numPages, pageWidth, scale])

    const nextPage = useCallback(() => goToPage(currentPage + 1), [currentPage, goToPage])
    const prevPage = useCallback(() => goToPage(currentPage - 1), [currentPage, goToPage])

    // Zoom
    const zoomIn = useCallback(() => setScale(s => Math.min(3, s + 0.25)), [])
    const zoomOut = useCallback(() => setScale(s => Math.max(0.5, s - 0.25)), [])
    const resetZoom = useCallback(() => setScale(1), [])

    // Ctrl + Mouse wheel zoom
    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        const handleWheel = (e: WheelEvent) => {
            if (e.ctrlKey) {
                e.preventDefault()
                const delta = e.deltaY > 0 ? -0.1 : 0.1
                setScale(s => Math.max(0.5, Math.min(3, s + delta)))
            }
        }

        container.addEventListener('wheel', handleWheel, { passive: false })
        return () => container.removeEventListener('wheel', handleWheel)
    }, [])

    // Add stroke to specific page
    const addStrokeToPage = useCallback((pageNumber: number) => (stroke: Stroke) => {
        setAnnotations(prev => {
            const pageStrokes = prev[pageNumber] || []
            const newAnnotations = {
                ...prev,
                [pageNumber]: [...pageStrokes, stroke]
            }
            setHistory(h => [...h.slice(0, historyIndex + 1), newAnnotations])
            setHistoryIndex(i => i + 1)
            return newAnnotations
        })
    }, [historyIndex])

    // Erase stroke from specific page
    const eraseStrokeFromPage = useCallback((pageNumber: number) => (strokeId: string) => {
        setAnnotations(prev => {
            const pageStrokes = prev[pageNumber] || []
            const newAnnotations = {
                ...prev,
                [pageNumber]: pageStrokes.filter(s => s.id !== strokeId)
            }
            setHistory(h => [...h.slice(0, historyIndex + 1), newAnnotations])
            setHistoryIndex(i => i + 1)
            return newAnnotations
        })
    }, [historyIndex])

    // Update strokes for specific page (for area erase)
    const updateStrokesForPage = useCallback((pageNumber: number) => (strokes: Stroke[]) => {
        setAnnotations(prev => {
            const newAnnotations = {
                ...prev,
                [pageNumber]: strokes
            }
            setHistory(h => [...h.slice(0, historyIndex + 1), newAnnotations])
            setHistoryIndex(i => i + 1)
            return newAnnotations
        })
    }, [historyIndex])

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

            // Eraser modes (1, 2, 3 when eraser is selected)
            else if (currentTool === 'eraser' && key === '1') {
                e.preventDefault()
                setEraserMode('area')
            } else if (currentTool === 'eraser' && key === '2') {
                e.preventDefault()
                setEraserMode('stroke')
            } else if (currentTool === 'eraser' && key === '3') {
                e.preventDefault()
                setEraserMode('whiteout')
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
    }, [prevPage, nextPage, goToPage, numPages, zoomIn, zoomOut, resetZoom, undo, redo, handleSave, currentTool])

    const currentColor = currentTool === 'highlighter' ? highlighterColor : penColor
    const currentSize = currentTool === 'eraser' ? eraserSize : (currentTool === 'highlighter' ? highlighterSize : penSize)

    // Generate page numbers array
    const pageNumbers = useMemo(() =>
        Array.from({ length: numPages }, (_, i) => i + 1),
        [numPages]
    )

    return (
        <div ref={containerRef} className="pdf-viewer" tabIndex={0}>
            {/* Toolbar */}
            <PDFToolbar
                currentPage={currentPage}
                numPages={numPages}
                scale={scale}
                currentTool={currentTool}
                eraserMode={eraserMode}
                penColor={penColor}
                highlighterColor={highlighterColor}
                penSize={penSize}
                highlighterSize={highlighterSize}
                eraserSize={eraserSize}
                canUndo={historyIndex > 0}
                canRedo={historyIndex < history.length - 1}
                onPageChange={goToPage}
                onPrevPage={prevPage}
                onNextPage={nextPage}
                onZoomIn={zoomIn}
                onZoomOut={zoomOut}
                onResetZoom={resetZoom}
                onToolChange={setCurrentTool}
                onEraserModeChange={setEraserMode}
                onPenColorChange={setPenColor}
                onHighlighterColorChange={setHighlighterColor}
                onPenSizeChange={setPenSize}
                onHighlighterSizeChange={setHighlighterSize}
                onEraserSizeChange={setEraserSize}
                onUndo={undo}
                onRedo={redo}
                onSave={handleSave}
            />

            {/* Title */}
            {title && <div className="pdf-title">{title}</div>}

            {/* PDF Container with horizontal scroll */}
            <div className="pdf-container" ref={scrollContainerRef}>
                {loading && <div className="pdf-loading">Loading PDF...</div>}
                {error && <div className="pdf-error">Error: {error}</div>}

                <Document
                    file={pdfFile}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={onDocumentLoadError}
                    loading=""
                >
                    <div className="pdf-pages-horizontal">
                        {pageNumbers.map(pageNum => (
                            <PDFPageWithAnnotations
                                key={pageNum}
                                pageNumber={pageNum}
                                pageWidth={pageWidth}
                                scale={scale}
                                tool={currentTool}
                                eraserMode={eraserMode}
                                color={currentColor}
                                size={currentSize}
                                strokes={annotations[pageNum] || []}
                                onAddStroke={addStrokeToPage(pageNum)}
                                onEraseStroke={eraseStrokeFromPage(pageNum)}
                                onUpdateStrokes={updateStrokesForPage(pageNum)}
                                isVisible={visiblePages.has(pageNum)}
                            />
                        ))}
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
