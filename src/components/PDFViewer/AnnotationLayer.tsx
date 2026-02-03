import { useRef, useEffect, useCallback, useState } from 'react'
import type { DrawingTool, Stroke, EraserMode } from './types'
import { drawSmoothStroke, drawQuickStroke, eraseArea, drawWhiteOut } from './SmoothPath'

interface AnnotationLayerProps {
    width: number
    height: number
    scale: number
    tool: DrawingTool
    eraserMode: EraserMode
    color: string
    size: number
    strokes: Stroke[]
    pageNumber: number
    onAddStroke: (stroke: Stroke) => void
    onEraseStroke: (strokeId: string) => void
    onUpdateStrokes: (strokes: Stroke[]) => void
}

export function AnnotationLayer({
    width,
    height,
    scale,
    tool,
    eraserMode,
    color,
    size,
    strokes,
    pageNumber,
    onAddStroke,
    onEraseStroke,
    onUpdateStrokes
}: AnnotationLayerProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [isDrawing, setIsDrawing] = useState(false)
    const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null)
    const lastPointRef = useRef<{ x: number; y: number } | null>(null)
    const eraserPointsRef = useRef<Array<{ x: number; y: number }>>([])

    // Redraw all strokes using smooth rendering
    const redrawStrokes = useCallback(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // Clear canvas with identity transform (clearing the whole pixel buffer)
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        // Apply scale for drawing (so 1 unit = 1 page unit)
        ctx.scale(scale, scale)

        // Separate highlighter strokes from other strokes
        const highlighterStrokes = strokes.filter(s => s.tool === 'highlighter')
        const otherStrokes = strokes.filter(s => s.tool !== 'highlighter')

        // Draw highlighters to an off-screen canvas first to prevent intensity stacking
        if (highlighterStrokes.length > 0) {
            const offscreenCanvas = document.createElement('canvas')
            offscreenCanvas.width = canvas.width
            offscreenCanvas.height = canvas.height
            const offCtx = offscreenCanvas.getContext('2d')

            if (offCtx) {
                offCtx.scale(scale, scale)

                // Draw all highlighter strokes at FULL opacity on the off-screen canvas
                // Using 'max' composite operation to prevent overlapping areas from intensifying
                highlighterStrokes.forEach((stroke, index) => {
                    if (stroke.points.length < 2) return

                    offCtx.save()
                    offCtx.lineCap = 'round'
                    offCtx.lineJoin = 'round'
                    offCtx.strokeStyle = stroke.color
                    offCtx.globalAlpha = 1.0
                    // Use 'lighter' for first stroke, then 'darken' to prevent stacking
                    if (index === 0) {
                        offCtx.globalCompositeOperation = 'source-over'
                    } else {
                        // 'darken' keeps the darker color, preventing lightening from overlaps
                        offCtx.globalCompositeOperation = 'darken'
                    }

                    // Draw the stroke path
                    for (let i = 0; i < stroke.points.length - 1; i++) {
                        const p0 = stroke.points[Math.max(0, i - 1)]
                        const p1 = stroke.points[i]
                        const p2 = stroke.points[i + 1]
                        const p3 = stroke.points[Math.min(stroke.points.length - 1, i + 2)]

                        const segmentPressure = (p1.pressure + p2.pressure) / 2
                        offCtx.lineWidth = stroke.size * segmentPressure * 2

                        const t = 1.0
                        const cp1 = {
                            x: p1.x + (p2.x - p0.x) / 6 * t,
                            y: p1.y + (p2.y - p0.y) / 6 * t
                        }
                        const cp2 = {
                            x: p2.x - (p3.x - p1.x) / 6 * t,
                            y: p2.y - (p3.y - p1.y) / 6 * t
                        }

                        offCtx.beginPath()
                        offCtx.moveTo(p1.x, p1.y)
                        offCtx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, p2.x, p2.y)
                        offCtx.stroke()
                    }
                    offCtx.restore()
                })

                // Now composite the entire highlighter layer onto main canvas with desired alpha
                ctx.save()
                ctx.setTransform(1, 0, 0, 1, 0, 0) // Reset transform for compositing
                ctx.globalAlpha = 0.3
                ctx.globalCompositeOperation = 'multiply'
                ctx.drawImage(offscreenCanvas, 0, 0)
                ctx.restore()

                // Re-apply scale for remaining strokes
                ctx.scale(scale, scale)
            }
        }

        // Draw all other saved strokes with smooth rendering
        otherStrokes.forEach(stroke => {
            if (stroke.points.length < 2) return

            if (stroke.tool === 'whiteout') {
                // White-out strokes
                drawWhiteOut(ctx, stroke.points, stroke.size)
            } else {
                // Pen strokes
                drawSmoothStroke(
                    ctx,
                    stroke.points,
                    stroke.size,
                    stroke.color,
                    false // not highlighter
                )
            }
        })

        // Draw current stroke in progress (quick rendering for responsiveness)
        if (currentStroke && currentStroke.points.length >= 2) {
            // Context is already scaled from above
            if (currentStroke.tool === 'whiteout') {
                drawWhiteOut(ctx, currentStroke.points, currentStroke.size)
            } else {
                drawQuickStroke(
                    ctx,
                    currentStroke.points,
                    currentStroke.size,
                    currentStroke.color,
                    currentStroke.tool === 'highlighter'
                )
            }
        }
    }, [strokes, currentStroke, scale])

    // Redraw when strokes change
    useEffect(() => {
        redrawStrokes()
    }, [redrawStrokes])

    // Get pointer position relative to canvas, accounting for CSS transform scale
    const getPointerPosition = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current
        if (!canvas) return { x: 0, y: 0, pressure: 0.5 }

        const rect = canvas.getBoundingClientRect()
        // Map screen coordinates to canvas internal coordinates
        const scaleX = canvas.width / rect.width
        const scaleY = canvas.height / rect.height

        // Convert to "Page Space" (unscaled coordinates)
        // We divide by 'scale' because the canvas pixel dimensions are now scaled up
        return {
            x: ((e.clientX - rect.left) * scaleX) / scale,
            y: ((e.clientY - rect.top) * scaleY) / scale,
            pressure: e.pressure > 0 ? e.pressure : 0.5
        }
    }, [scale])

    // Check if point is near a stroke (for stroke eraser)
    const findStrokeAtPoint = useCallback((x: number, y: number): string | null => {
        const threshold = 10

        for (const stroke of strokes) {
            for (const point of stroke.points) {
                const dx = x - point.x
                const dy = y - point.y
                if (Math.sqrt(dx * dx + dy * dy) < threshold + stroke.size / 2) {
                    return stroke.id
                }
            }
        }
        return null
    }, [strokes])

    // Handle area erase - visual feedback during erase
    const handleAreaEraseVisual = useCallback((x: number, y: number, eraserSize: number) => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // Visual feedback - erase on canvas immediately
        // We need to apply the scale here too because eraseArea expects the context to be set up or handles it
        // Since eraseArea draws directly, we need to transform the context
        ctx.save()
        ctx.scale(scale, scale)
        eraseArea(ctx, x, y, eraserSize)
        ctx.restore()
    }, [scale])

    // Commit area erase - actually modify stroke data
    const commitAreaErase = useCallback((eraserPath: Array<{ x: number; y: number }>, eraserSize: number) => {
        if (eraserPath.length === 0) return

        // Filter stroke points that intersect with eraser path
        const newStrokes: Stroke[] = []

        for (const stroke of strokes) {
            // Check each point in the stroke against the eraser path
            let currentSegment: Array<{ x: number; y: number; pressure: number }> = []

            for (const point of stroke.points) {
                let shouldErase = false

                // Check if this point intersects with any point in the eraser path
                for (const eraserPoint of eraserPath) {
                    const dx = point.x - eraserPoint.x
                    const dy = point.y - eraserPoint.y
                    const distance = Math.sqrt(dx * dx + dy * dy)

                    if (distance < eraserSize + stroke.size / 2) {
                        shouldErase = true
                        break
                    }
                }

                if (!shouldErase) {
                    currentSegment.push(point)
                } else {
                    // End current segment if we have points
                    if (currentSegment.length >= 2) {
                        newStrokes.push({
                            ...stroke,
                            id: crypto.randomUUID(),
                            points: [...currentSegment]
                        })
                    }
                    currentSegment = []
                }
            }

            // Add remaining segment
            if (currentSegment.length >= 2) {
                newStrokes.push({
                    ...stroke,
                    id: crypto.randomUUID(),
                    points: currentSegment
                })
            }
        }

        // Only update if strokes actually changed
        if (newStrokes.length !== strokes.length ||
            newStrokes.some((s, i) => !strokes[i] || s.points.length !== strokes[i].points.length)) {
            onUpdateStrokes(newStrokes)
        }
    }, [strokes, onUpdateStrokes])

    // Pointer event handlers
    const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
        if (tool === 'select') return

        e.preventDefault()
        const canvas = canvasRef.current
        if (canvas) {
            canvas.setPointerCapture(e.pointerId)
        }

        const pos = getPointerPosition(e)

        if (tool === 'eraser') {
            if (eraserMode === 'stroke') {
                // Stroke erase mode - delete entire stroke
                const strokeId = findStrokeAtPoint(pos.x, pos.y)
                if (strokeId) {
                    onEraseStroke(strokeId)
                }
            } else if (eraserMode === 'area') {
                // Area erase mode - start collecting erase points
                eraserPointsRef.current = [{ x: pos.x, y: pos.y }]
                handleAreaEraseVisual(pos.x, pos.y, size)
                setIsDrawing(true)
            } else if (eraserMode === 'whiteout') {
                // White-out mode - create white stroke
                setIsDrawing(true)
                const newStroke: Stroke = {
                    id: crypto.randomUUID(),
                    tool: 'whiteout',
                    points: [pos],
                    color: '#FFFFFF',
                    size: size,
                    page: pageNumber
                }
                setCurrentStroke(newStroke)
                lastPointRef.current = pos
            }
        } else if (tool === 'pen' || tool === 'highlighter') {
            setIsDrawing(true)
            const newStroke: Stroke = {
                id: crypto.randomUUID(),
                tool: tool,
                points: [pos],
                color: color,
                size: size,
                page: pageNumber
            }
            setCurrentStroke(newStroke)
            lastPointRef.current = pos
        }
    }, [tool, eraserMode, color, size, pageNumber, getPointerPosition, findStrokeAtPoint, onEraseStroke, handleAreaEraseVisual])

    const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
        const pos = getPointerPosition(e)

        if (tool === 'eraser' && e.buttons > 0) {
            if (eraserMode === 'stroke') {
                const strokeId = findStrokeAtPoint(pos.x, pos.y)
                if (strokeId) {
                    onEraseStroke(strokeId)
                }
            } else if (eraserMode === 'area' && isDrawing) {
                eraserPointsRef.current.push({ x: pos.x, y: pos.y })
                handleAreaEraseVisual(pos.x, pos.y, size)
            }
            // White-out handled below with other drawing tools
        }

        if (!isDrawing || !currentStroke) return

        // Reduced minimum distance for smoother strokes
        const lastPoint = lastPointRef.current
        if (lastPoint) {
            const dx = pos.x - lastPoint.x
            const dy = pos.y - lastPoint.y
            const dist = Math.sqrt(dx * dx + dy * dy)

            // Lower threshold for smoother curves (was 2, now 1)
            if (dist < 1) return
        }

        setCurrentStroke((prev: Stroke | null) => {
            if (!prev) return null
            return {
                ...prev,
                points: [...prev.points, pos]
            }
        })
        lastPointRef.current = pos
    }, [tool, eraserMode, isDrawing, currentStroke, getPointerPosition, findStrokeAtPoint, onEraseStroke, handleAreaEraseVisual, size])

    const handlePointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current
        if (canvas) {
            canvas.releasePointerCapture(e.pointerId)
        }

        if (tool === 'eraser' && eraserMode === 'area' && isDrawing) {
            // Area erase complete - commit the changes to stroke data
            commitAreaErase(eraserPointsRef.current, size)
        }

        if (isDrawing && currentStroke && currentStroke.points.length >= 2) {
            onAddStroke(currentStroke)
        }

        setIsDrawing(false)
        setCurrentStroke(null)
        lastPointRef.current = null
        eraserPointsRef.current = []
    }, [tool, eraserMode, isDrawing, currentStroke, onAddStroke, commitAreaErase, size])

    // Cursor style based on tool
    const getCursor = () => {
        switch (tool) {
            case 'pen':
                return 'crosshair'
            case 'highlighter':
                return 'crosshair'
            case 'eraser':
                return eraserMode === 'whiteout' ? 'crosshair' : 'cell'
            default:
                return 'default'
        }
    }

    return (
        <canvas
            ref={canvasRef}
            className="annotation-layer"
            width={width}
            height={height}
            style={{
                cursor: getCursor(),
                touchAction: 'none' // Important for tablet support
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
        />
    )
}
