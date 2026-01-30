import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/esm/Page/AnnotationLayer.css'
import 'react-pdf/dist/esm/Page/TextLayer.css'
import { AnnotationLayer } from './AnnotationLayer'
import { PDFToolbar } from './PDFToolbar'
import { ResizableImage } from './ResizableImage'
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

export interface ImageAnnotation {
    id: string
    x: number
    y: number
    width: number
    height: number
    data: ArrayBuffer
    mimeType: 'image/png' | 'image/jpeg'
    page: number
}

interface PDFViewerProps {
    data: ArrayBuffer
    title?: string
    onSave?: (annotations: Record<number, Stroke[]>, images: Record<number, ImageAnnotation[]>, items: { pageWidth: number }) => void
    initialAnnotations?: Record<number, Stroke[]>
    initialImages?: Record<number, ImageAnnotation[]>
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
    images: ImageAnnotation[]
    selectedImageId: string | null
    onAddStroke: (stroke: Stroke) => void
    onEraseStroke: (strokeId: string) => void
    onUpdateStrokes: (strokes: Stroke[]) => void
    onImageSelect: (id: string) => void
    onImageUpdate: (id: string, updates: { x: number; y: number; width: number; height: number }) => void
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
    images,
    selectedImageId,
    onAddStroke,
    onEraseStroke,
    onUpdateStrokes,
    onImageSelect,
    onImageUpdate,
    isVisible
}: PDFPageWithAnnotationsProps) {
    const pageRef = useRef<HTMLDivElement>(null)
    const [pageHeight, setPageHeight] = useState(pageWidth * 1.414)

    const handlePageLoad = useCallback(({ height, width }: { height: number; width: number }) => {
        // Calculate actual page height based on rendered width
        // Width and height here are already scaled if we pass scaled width to Page
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
            className="pdf-page-container"
            style={{
                width: pageWidth * scale,
                height: pageHeight * scale,
                flexShrink: 0
            }}
            data-page={pageNumber}
        >
            <div
                ref={pageRef}
                className="pdf-page-item"
                style={{ transformOrigin: 'top left' }}
                onPointerDown={() => {
                    // Deselect image if clicking on empty space (but not if tool is select?)
                    if (selectedImageId) onImageSelect('')
                }}
            >
                <Page
                    pageNumber={pageNumber}
                    width={pageWidth * scale} // Native scaling
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                    onLoadSuccess={handlePageLoad}
                />

                {/* Images Layer */}
                {/* Images Layer - z-index 15 to be above PDF but below Annotations (z-index 10?? AnnotationLayer is z-index 10 in CSS) */}
                {/* Actually, if we want images to be interactive, they must be above AnnotationLayer when in Select mode, or AnnotationLayer must be pointer-events: none */}
                <div className="pdf-images-layer" style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none', // Allow children (images) to catch events
                    zIndex: tool === 'select' ? 20 : 5 // Above annotations when selecting, below when drawing?
                }}>
                    {images.map(img => {
                        // Create object URL for the image data
                        // Note: In production we should revoke these URLs
                        const blob = new Blob([img.data], { type: img.mimeType })
                        const url = URL.createObjectURL(blob)

                        return (
                            <ResizableImage
                                key={img.id}
                                id={img.id}
                                src={url}
                                x={img.x}
                                y={img.y}
                                width={img.width}
                                height={img.height}
                                scale={scale}
                                isSelected={selectedImageId === img.id}
                                onSelect={onImageSelect}
                                onChange={onImageUpdate}
                                pointerEvents={tool === 'select' ? 'auto' : 'none'}
                            />
                        )
                    })}
                </div>

                <AnnotationLayer
                    width={pageWidth * scale}
                    height={pageHeight * scale}
                    scale={scale}
                    tool={tool}
                    eraserMode={eraserMode}
                    color={color}
                    size={size}
                    strokes={strokes}
                    pageNumber={pageNumber}
                    onAddStroke={onAddStroke}
                    onEraseStroke={onEraseStroke}
                    onUpdateStrokes={onUpdateStrokes}
                />
            </div>
        </div>
    )
}

export function PDFViewer({ data, title, onSave, initialAnnotations = {}, initialImages = {} }: PDFViewerProps) {
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
    const [images, setImages] = useState<Record<number, ImageAnnotation[]>>(initialImages)
    const [selectedImageId, setSelectedImageId] = useState<string | null>(null)

    // History (combined for simplicity, though ideally separate)
    // For now, only undo/redo strokes. Images actions won't be in history to keep it simple first.
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

    // Calculate fit width on mount and resize
    useEffect(() => {
        if (!containerRef.current) return

        const updateWidth = () => {
            if (containerRef.current) {
                const containerWidth = containerRef.current.clientWidth - 40 // Reduced padding
                setPageWidth(containerWidth)
            }
        }

        updateWidth()

        const observer = new ResizeObserver(updateWidth)
        observer.observe(containerRef.current)

        return () => observer.disconnect()
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
            const scrollTop = scrollContainer.scrollTop
            // Estimate page height (assuming A4 aspect ratio 1.414) plus gap
            const pageHeightWithGap = (pageWidth * scale * 1.414) + 20
            const currentPageNum = Math.floor(scrollTop / pageHeightWithGap) + 1
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
            const pageHeightWithGap = (pageWidth * scale * 1.414) + 20
            scrollContainerRef.current.scrollTo({
                top: (targetPage - 1) * pageHeightWithGap,
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

    // Image handlers
    const handleImageUpdate = useCallback((id: string, updates: { x: number; y: number; width: number; height: number }) => {
        setImages(prev => {
            const newImages = { ...prev }

            // Find in all pages
            for (const pageNumStr of Object.keys(newImages)) {
                const pageNum = parseInt(pageNumStr)
                const pageImages = newImages[pageNum] || []
                const imgIndex = pageImages.findIndex(img => img.id === id)

                if (imgIndex !== -1) {
                    const updatedImages = [...pageImages]
                    updatedImages[imgIndex] = {
                        ...updatedImages[imgIndex],
                        ...updates
                    }
                    newImages[pageNum] = updatedImages
                    // We found it, no need to check other pages
                    // Assuming ID is unique across all pages
                    return newImages
                }
            }
            return newImages
        })
    }, [])

    // Add image handler
    const handleAddImage = useCallback(async (file: File) => {
        // ... same content as before ...
        try {
            const buffer = await file.arrayBuffer()
            const id = crypto.randomUUID()

            // Default placement centered (or top-left with offset)
            // Ideally we'd measure image dimensions first. 
            // For now, default to 200px width, aspect ratio maintained?
            // We can't know aspect ratio without loading it as image first.
            // Let's create an ObjectURL to measure it.
            const url = URL.createObjectURL(file)
            const img = new Image()
            img.onload = () => {
                const aspectRatio = img.width / img.height
                const defaultWidth = 200
                const defaultHeight = defaultWidth / aspectRatio

                const newImage: ImageAnnotation = {
                    id,
                    x: 100, // Default X
                    y: 100, // Default Y
                    width: defaultWidth, // Unscaled units
                    height: defaultHeight, // Unscaled units
                    data: buffer,
                    mimeType: file.type as 'image/png' | 'image/jpeg',
                    page: currentPage
                }

                setImages(prev => ({
                    ...prev,
                    [currentPage]: [...(prev[currentPage] || []), newImage]
                }))

                URL.revokeObjectURL(url)
            }
            img.src = url
        } catch (err) {
            console.error('Failed to add image:', err)
        }
    }, [currentPage])

    // Save
    const handleSave = useCallback(() => {
        onSave?.(annotations, images, { pageWidth })
    }, [annotations, images, pageWidth, onSave])

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
                onInsertImage={handleAddImage}
            />

            {/* Title */}
            {title && <div className="pdf-title">{title}</div>}

            {/* PDF Container with vertical scroll */}
            <div className="pdf-container" ref={scrollContainerRef}>
                {loading && <div className="pdf-loading">Loading PDF...</div>}
                {error && <div className="pdf-error">Error: {error}</div>}

                <Document
                    file={pdfFile}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={onDocumentLoadError}
                    loading=""
                >
                    <div className="pdf-pages-vertical">
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
                                images={images[pageNum] || []}
                                selectedImageId={selectedImageId}
                                onAddStroke={addStrokeToPage(pageNum)}
                                onEraseStroke={eraseStrokeFromPage(pageNum)}
                                onUpdateStrokes={updateStrokesForPage(pageNum)}
                                onImageSelect={setSelectedImageId}
                                onImageUpdate={handleImageUpdate}
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
