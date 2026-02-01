import { useRef, useEffect, useMemo, useState } from 'react'
import { Document, pdfjs } from 'react-pdf'
import { PDFProvider, usePDF } from './PDFContext'
import { PDFPage } from './PDFPage'
import { PDFToolbar } from './PDFToolbar'
import type { DrawingTool, EraserMode, Stroke, ImageAnnotation } from './types'
import './PDFViewer.css'

// Worker setup
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
).toString()

interface PDFViewerProps {
    data: ArrayBuffer
    title?: string
    onSave?: (annotations: Record<number, Stroke[]>, images: Record<number, ImageAnnotation[]>, items: { pageWidth: number }) => void
    initialAnnotations?: Record<number, Stroke[]>
    initialImages?: Record<number, ImageAnnotation[]>
}

function InnerPDFViewer({ data, title, onSave }: PDFViewerProps) {
    const { state, dispatch } = usePDF()
    const containerRef = useRef<HTMLDivElement>(null)
    const [containerWidth, setContainerWidth] = useState(800)

    // Derived state
    const { numPages, scale, currentPage, tool, eraserMode, penColor, highlighterColor, penSize, highlighterSize, eraserSize, annotations, images } = state

    // 1. Setup Document
    const file = useMemo(() => ({ data }), [data])

    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
        dispatch({ type: 'SET_NUM_PAGES', payload: numPages })
    }

    // 2. Measure Container
    useEffect(() => {
        if (!containerRef.current) return
        const observer = new ResizeObserver(entries => {
            const width = entries[0].contentRect.width
            if (width > 0) setContainerWidth(width - 48) // Subtract padding
        })
        observer.observe(containerRef.current)
        return () => observer.disconnect()
    }, [])

    // 3. Scroll Tracking for "Current Page"
    const scrollRef = useRef<HTMLDivElement>(null)
    useEffect(() => {
        const el = scrollRef.current
        if (!el) return

        const handleScroll = () => {
            // Simple estimation or use elements
            // For robustness with variable page heights, we should find the center element.
            // We can query elements with data-page-number
            const center = el.scrollTop + el.clientHeight / 2
            const pages = Array.from(el.querySelectorAll('[data-page-number]'))

            // Find page closest to center
            let closestPage = 1
            let minDiff = Infinity

            for (const page of pages) {
                const rect = (page as HTMLElement).getBoundingClientRect()
                const parentRect = el.getBoundingClientRect()
                const pageCenter = (rect.top - parentRect.top) + el.scrollTop + rect.height / 2
                const diff = Math.abs(pageCenter - center)
                if (diff < minDiff) {
                    minDiff = diff
                    closestPage = parseInt(page.getAttribute('data-page-number') || '1')
                }
            }

            if (closestPage !== currentPage) {
                dispatch({ type: 'SET_CURRENT_PAGE', payload: closestPage })
            }
        }

        // Debounce scroll?
        let timeout: number
        const onScroll = () => {
            if (timeout) cancelAnimationFrame(timeout)
            timeout = requestAnimationFrame(handleScroll)
        }

        el.addEventListener('scroll', onScroll)
        return () => el.removeEventListener('scroll', onScroll)
    }, [currentPage]) // Dep on currentPage? No, just closure.

    // 4. Navigation Handlers
    const goToPage = (page: number) => {
        // Find element and scroll
        const el = scrollRef.current
        if (!el) return
        const pageEl = el.querySelector(`[data-page-number="${page}"]`) as HTMLElement
        if (pageEl) {
            // Calculate position
            // pageEl.scrollIntoView({ behavior: 'smooth' }) // Sometimes flaky with custom scrolling containers
            // Manual validation
            const top = pageEl.offsetTop
            el.scrollTo({ top: top - 20, behavior: 'smooth' }) // 20px padding top

            // We also dispatch so UI updates immediately
            dispatch({ type: 'SET_CURRENT_PAGE', payload: page })
        }
    }

    // 5. Toolbar Actions
    // Mapping dispatch actions to toolbar props
    const actions = {
        onPageChange: goToPage,
        onPrevPage: () => goToPage(Math.max(1, currentPage - 1)),
        onNextPage: () => goToPage(Math.min(numPages, currentPage + 1)),
        onZoomIn: () => dispatch({ type: 'SET_SCALE', payload: scale + 0.1 }),
        onZoomOut: () => dispatch({ type: 'SET_SCALE', payload: scale - 0.1 }),
        onResetZoom: () => dispatch({ type: 'SET_SCALE', payload: 1 }),
        onToolChange: (tool: DrawingTool) => dispatch({ type: 'SET_TOOL', payload: tool }),
        onEraserModeChange: (mode: EraserMode) => dispatch({ type: 'SET_ERASER_MODE', payload: mode }),
        onPenColorChange: (c: string) => dispatch({ type: 'SET_PEN_COLOR', payload: c }),
        onHighlighterColorChange: (c: string) => dispatch({ type: 'SET_HIGHLIGHTER_COLOR', payload: c }),
        onPenSizeChange: (s: number) => dispatch({ type: 'SET_PEN_SIZE', payload: s }),
        onHighlighterSizeChange: (s: number) => dispatch({ type: 'SET_HIGHLIGHTER_SIZE', payload: s }),
        onEraserSizeChange: (s: number) => dispatch({ type: 'SET_ERASER_SIZE', payload: s }),
        onUndo: () => dispatch({ type: 'UNDO' }),
        onRedo: () => dispatch({ type: 'REDO' }),
        onSave: () => onSave?.(annotations, images, { pageWidth: containerWidth }),
        onInsertImage: async (file: File) => {
            const buffer = await file.arrayBuffer()
            const id = crypto.randomUUID()
            // Create temporary img to get aspect ratio
            const url = URL.createObjectURL(file)
            const img = new Image()
            img.onload = () => {
                const aspect = img.width / img.height
                dispatch({
                    type: 'ADD_IMAGE',
                    payload: {
                        page: currentPage,
                        image: {
                            id, x: 50, y: 50, width: 200, height: 200 / aspect,
                            data: buffer, mimeType: file.type as any, page: currentPage
                        }
                    }
                })
                URL.revokeObjectURL(url)
            }
            img.src = url
        }
    }

    return (
        <div className="pdf-viewer-root" tabIndex={0} onKeyDown={(e) => {
            // Basic Key Handlers
            if (e.key === 'p') dispatch({ type: 'SET_TOOL', payload: 'pen' })
            if (e.key === 'h') dispatch({ type: 'SET_TOOL', payload: 'highlighter' })
            if (e.key === 'e') dispatch({ type: 'SET_TOOL', payload: 'eraser' })
            if (e.key === 'v') dispatch({ type: 'SET_TOOL', payload: 'select' })
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                e.preventDefault()
                if (e.shiftKey) dispatch({ type: 'REDO' })
                else dispatch({ type: 'UNDO' })
            }
        }}>
            <div className="pdf-header">
                <PDFToolbar
                    currentPage={currentPage}
                    numPages={numPages}
                    scale={scale}
                    currentTool={tool}
                    eraserMode={eraserMode}
                    penColor={penColor}
                    highlighterColor={highlighterColor}
                    penSize={penSize}
                    highlighterSize={highlighterSize}
                    eraserSize={eraserSize}
                    canUndo={state.historyIndex > 0}
                    canRedo={state.historyIndex < state.history.length - 1}
                    {...actions}
                />
            </div>

            <div className="pdf-scroll-container" ref={scrollRef}>
                <div ref={containerRef} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Document
                        file={file}
                        onLoadSuccess={onDocumentLoadSuccess}
                        className="pdf-document"
                        loading={<div className="pdf-loading-overlay">Loading Document...</div>}
                    >
                        {Array.from({ length: numPages }, (_, i) => i + 1).map(page => (
                            <PDFPage
                                key={page}
                                pageNumber={page}
                                pageWidth={containerWidth}
                            />
                        ))}
                    </Document>
                </div>
            </div>

            {title && <div style={{ position: 'absolute', bottom: 10, right: 20, background: 'rgba(0,0,0,0.7)', color: 'white', padding: '4px 8px', borderRadius: 4, fontSize: 12, pointerEvents: 'none', zIndex: 100 }}>
                {title} | {currentPage} / {numPages}
            </div>}
        </div>
    )
}

export function PDFViewer(props: PDFViewerProps) {
    return (
        <PDFProvider initialAnnotations={props.initialAnnotations} initialImages={props.initialImages}>
            <InnerPDFViewer {...props} />
        </PDFProvider>
    )
}
