import { useRef, useState, useCallback } from 'react'
import { Page } from 'react-pdf'
import { usePDF } from './PDFContext'
import { AnnotationLayer } from './AnnotationLayer'
import { ResizableImage } from './ResizableImage'
import { useInView } from 'react-intersection-observer'
import type { Stroke } from './types'

interface PDFPageProps {
    pageNumber: number
    pageWidth: number // The available width in the container
}

export function PDFPage({ pageNumber, pageWidth }: PDFPageProps) {
    const { state, dispatch } = usePDF()
    const { scale, tool, eraserMode, penColor, highlighterColor, penSize, highlighterSize, eraserSize, annotations, images } = state

    // Local state for page dimensions
    const [pageHeight, setPageHeight] = useState(pageWidth * 1.414)


    // Visibility tracking
    const { ref: inViewRef, inView } = useInView({
        threshold: 0.1,    // Trigger when 10% visible
        rootMargin: '200px 0px', // Pre-load 200px before
        triggerOnce: false
    })

    // Combine refs
    const pageContainerRef = useRef<HTMLDivElement | null>(null)
    const setRefs = useCallback(
        (node: HTMLDivElement | null) => {
            pageContainerRef.current = node
            inViewRef(node)
        },
        [inViewRef]
    )

    // Update dimensions when page loads
    const onPageLoadSuccess = useCallback(({ originalWidth, originalHeight }: any) => {
        // react-pdf 'width' is the rendered width (original * scale) if scale prop is passed
        // We pass 'width' prop to Page, so it renders at that width.
        // We need to determine the aspect ratio.

        // If we provide 'width={pageWidth * scale}', react-pdf renders at that width.
        // The aspect ratio = originalHeight / originalWidth
        const aspectRatio = originalHeight / originalWidth
        setPageHeight(pageWidth * aspectRatio)
    }, [pageWidth])

    // Update current page when in view (simple logic: if in view, set as current page? 
    // This might oscillate if multiple pages are in view. 
    // Better logic: intersection observer in parent or just "first visible". 
    // For now, let's just let the parent handle "Current Page" or do it here with debounce?
    // Let's do it here: if >50% visible, set current page.
    // Actually, 'useInView' is boolean.
    // Moving logic to parent (PDFViewer) is cleaner for "scrolling updates current page".
    // So here we primarily handle rendering.

    // Tools
    const currentColor = tool === 'highlighter' ? highlighterColor : penColor
    const currentSize = tool === 'eraser' ? eraserSize : (tool === 'highlighter' ? highlighterSize : penSize)

    const pageStrokes = annotations[pageNumber] || []
    const pageImages = images[pageNumber] || []

    const [selectedImageId, setSelectedImageId] = useState<string | null>(null)

    // Handlers
    const handleAddStroke = (stroke: Stroke) => {
        dispatch({ type: 'ADD_STROKE', payload: { page: pageNumber, stroke } })
    }

    const handleEraseStroke = (strokeId: string) => {
        dispatch({
            type: 'UPDATE_STROKES', payload: {
                page: pageNumber,
                strokes: pageStrokes.filter(s => s.id !== strokeId)
            }
        }) // Or simpler ERASE action? reducer handles generics.
    }

    const handleUpdateStrokes = (strokes: Stroke[]) => {
        dispatch({ type: 'UPDATE_STROKES', payload: { page: pageNumber, strokes } })
    }

    const handleImageUpdate = (id: string, updates: any) => {
        dispatch({ type: 'UPDATE_IMAGE', payload: { id, updates } })
    }

    const handleImageSelect = (id: string) => {
        setSelectedImageId(id)
    }

    // Styles
    const widthPx = pageWidth * scale
    const heightPx = pageHeight * scale

    return (
        <div
            ref={setRefs}
            className="pdf-page-wrapper"
            style={{
                width: widthPx,
                height: heightPx, // Reserve space
                margin: '0 auto 20px auto', // Centered with bottom gap
                position: 'relative',
                backgroundColor: 'white',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
            }}
            data-page-number={pageNumber} // For parent to find
        >
            {inView ? (
                <>
                    <Page
                        pageNumber={pageNumber}
                        width={widthPx}
                        renderTextLayer={true}
                        renderAnnotationLayer={false} // We typically don't need standard annotations if we just draw? Or true if we want links.
                        onLoadSuccess={onPageLoadSuccess}
                        loading={<div style={{ height: heightPx, width: widthPx, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>Loading...</div>}
                    />

                    {/* Images Layer */}
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: tool === 'select' ? 20 : 5 }}>
                        {pageImages.map(img => {
                            const blob = new Blob([img.data], { type: img.mimeType }) // Optim: reduce blob creation?
                            const url = URL.createObjectURL(blob)
                            // Note: URL revocation is missing here, might leak. In a real app, useMemo or cache for URLs.

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
                                    onSelect={handleImageSelect}
                                    onChange={handleImageUpdate}
                                    pointerEvents={tool === 'select' ? 'auto' : 'none'}
                                />
                            )
                        })}
                    </div>

                    <AnnotationLayer
                        width={widthPx}
                        height={heightPx}
                        scale={scale}
                        tool={tool}
                        eraserMode={eraserMode}
                        color={currentColor}
                        size={currentSize}
                        strokes={pageStrokes}
                        pageNumber={pageNumber}
                        onAddStroke={handleAddStroke}
                        onEraseStroke={handleEraseStroke}
                        onUpdateStrokes={handleUpdateStrokes}
                    />
                </>
            ) : (
                <div className="pdf-page-placeholder" style={{ width: '100%', height: '100%' }}>
                    {/* Placeholder content */}
                    Page {pageNumber}
                </div>
            )}
        </div>
    )
}
