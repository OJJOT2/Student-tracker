import { useRef, useEffect, useCallback, useState } from 'react'
import type { DrawingTool, Stroke } from './PDFViewer'

interface AnnotationLayerProps {
    width: number
    height: number
    tool: DrawingTool
    color: string
    size: number
    strokes: Stroke[]
    pageNumber: number
    onAddStroke: (stroke: Stroke) => void
    onEraseStroke: (strokeId: string) => void
}

export function AnnotationLayer({
    width,
    height,
    tool,
    color,
    size,
    strokes,
    pageNumber,
    onAddStroke,
    onEraseStroke
}: AnnotationLayerProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [isDrawing, setIsDrawing] = useState(false)
    const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null)
    const lastPointRef = useRef<{ x: number; y: number } | null>(null)

    // Redraw all strokes
    const redrawStrokes = useCallback(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        // Draw all strokes
        strokes.forEach(stroke => {
            if (stroke.points.length < 2) return

            ctx.beginPath()
            ctx.lineCap = 'round'
            ctx.lineJoin = 'round'

            if (stroke.tool === 'highlighter') {
                ctx.globalAlpha = 0.3
                ctx.strokeStyle = stroke.color
                ctx.lineWidth = stroke.size
            } else {
                ctx.globalAlpha = 1
                ctx.strokeStyle = stroke.color
                ctx.lineWidth = stroke.size
            }

            // Draw path with pressure sensitivity
            const points = stroke.points
            ctx.moveTo(points[0].x, points[0].y)

            for (let i = 1; i < points.length; i++) {
                const p1 = points[i]

                // Interpolate line width based on pressure
                const pressure = p1.pressure || 0.5
                ctx.lineWidth = stroke.size * pressure * 2

                ctx.lineTo(p1.x, p1.y)
            }

            ctx.stroke()
            ctx.globalAlpha = 1
        })

        // Draw current stroke
        if (currentStroke && currentStroke.points.length >= 2) {
            const points = currentStroke.points
            ctx.beginPath()
            ctx.lineCap = 'round'
            ctx.lineJoin = 'round'

            if (currentStroke.tool === 'highlighter') {
                ctx.globalAlpha = 0.3
            } else {
                ctx.globalAlpha = 1
            }
            ctx.strokeStyle = currentStroke.color
            ctx.lineWidth = currentStroke.size

            ctx.moveTo(points[0].x, points[0].y)
            for (let i = 1; i < points.length; i++) {
                const pressure = points[i].pressure || 0.5
                ctx.lineWidth = currentStroke.size * pressure * 2
                ctx.lineTo(points[i].x, points[i].y)
            }
            ctx.stroke()
            ctx.globalAlpha = 1
        }
    }, [strokes, currentStroke])

    // Redraw when strokes change
    useEffect(() => {
        redrawStrokes()
    }, [redrawStrokes])

    // Get pointer position relative to canvas
    const getPointerPosition = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current
        if (!canvas) return { x: 0, y: 0, pressure: 0.5 }

        const rect = canvas.getBoundingClientRect()
        return {
            x: (e.clientX - rect.left) * (canvas.width / rect.width),
            y: (e.clientY - rect.top) * (canvas.height / rect.height),
            pressure: e.pressure || 0.5
        }
    }, [])

    // Check if point is near a stroke (for eraser)
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
            const strokeId = findStrokeAtPoint(pos.x, pos.y)
            if (strokeId) {
                onEraseStroke(strokeId)
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
    }, [tool, color, size, pageNumber, getPointerPosition, findStrokeAtPoint, onEraseStroke])

    const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
        const pos = getPointerPosition(e)

        if (tool === 'eraser' && e.buttons > 0) {
            const strokeId = findStrokeAtPoint(pos.x, pos.y)
            if (strokeId) {
                onEraseStroke(strokeId)
            }
            return
        }

        if (!isDrawing || !currentStroke) return

        // Add point with some smoothing - skip if too close
        const lastPoint = lastPointRef.current
        if (lastPoint) {
            const dx = pos.x - lastPoint.x
            const dy = pos.y - lastPoint.y
            const dist = Math.sqrt(dx * dx + dy * dy)

            // Only add point if moved enough (prevents too many points)
            if (dist < 2) return
        }

        setCurrentStroke(prev => {
            if (!prev) return null
            return {
                ...prev,
                points: [...prev.points, pos]
            }
        })
        lastPointRef.current = pos
    }, [tool, isDrawing, currentStroke, getPointerPosition, findStrokeAtPoint, onEraseStroke])

    const handlePointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current
        if (canvas) {
            canvas.releasePointerCapture(e.pointerId)
        }

        if (isDrawing && currentStroke && currentStroke.points.length >= 2) {
            onAddStroke(currentStroke)
        }

        setIsDrawing(false)
        setCurrentStroke(null)
        lastPointRef.current = null
    }, [isDrawing, currentStroke, onAddStroke])

    // Cursor style based on tool
    const getCursor = () => {
        switch (tool) {
            case 'pen':
                return 'crosshair'
            case 'highlighter':
                return 'crosshair'
            case 'eraser':
                return 'cell'
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
