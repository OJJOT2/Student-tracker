/**
 * Smooth path rendering utilities for PDF annotation
 * Uses Catmull-Rom to Bezier curve conversion for smooth strokes
 */

export interface Point {
    x: number
    y: number
    pressure: number
}

/**
 * Convert Catmull-Rom spline control points to cubic Bezier control points
 * This creates smooth curves that pass through all points
 */
export function catmullRomToBezier(
    p0: Point,
    p1: Point,
    p2: Point,
    p3: Point,
    tension: number = 0.5
): { cp1: Point; cp2: Point } {
    const t = tension

    const cp1: Point = {
        x: p1.x + (p2.x - p0.x) / 6 * t,
        y: p1.y + (p2.y - p0.y) / 6 * t,
        pressure: (p1.pressure + p2.pressure) / 2
    }

    const cp2: Point = {
        x: p2.x - (p3.x - p1.x) / 6 * t,
        y: p2.y - (p3.y - p1.y) / 6 * t,
        pressure: (p1.pressure + p2.pressure) / 2
    }

    return { cp1, cp2 }
}

/**
 * Draw a smooth stroke with variable width based on pressure
 * Uses Catmull-Rom to Bezier curve conversion
 */
export function drawSmoothStroke(
    ctx: CanvasRenderingContext2D,
    points: Point[],
    baseSize: number,
    color: string,
    isHighlighter: boolean = false
): void {
    if (points.length < 2) return

    ctx.save()
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = color

    if (isHighlighter) {
        ctx.globalAlpha = 0.3
        ctx.globalCompositeOperation = 'multiply'
    }

    // For 2 points, just draw a line
    if (points.length === 2) {
        const avgPressure = (points[0].pressure + points[1].pressure) / 2
        ctx.lineWidth = baseSize * avgPressure * 2
        ctx.beginPath()
        ctx.moveTo(points[0].x, points[0].y)
        ctx.lineTo(points[1].x, points[1].y)
        ctx.stroke()
        ctx.restore()
        return
    }

    // For 3+ points, use Catmull-Rom splines converted to Bezier curves
    // Draw each segment with variable width
    for (let i = 0; i < points.length - 1; i++) {
        // Get the 4 points needed for Catmull-Rom (with clamping at edges)
        const p0 = points[Math.max(0, i - 1)]
        const p1 = points[i]
        const p2 = points[i + 1]
        const p3 = points[Math.min(points.length - 1, i + 2)]

        // Calculate average pressure for this segment
        const segmentPressure = (p1.pressure + p2.pressure) / 2
        ctx.lineWidth = baseSize * segmentPressure * 2

        // Convert to Bezier control points
        const { cp1, cp2 } = catmullRomToBezier(p0, p1, p2, p3, 1.0)

        ctx.beginPath()
        ctx.moveTo(p1.x, p1.y)
        ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, p2.x, p2.y)
        ctx.stroke()
    }

    ctx.restore()
}

/**
 * Draw a variable width stroke using individual segments
 * Each segment has its own width based on pressure interpolation
 */
export function drawVariableWidthStroke(
    ctx: CanvasRenderingContext2D,
    points: Point[],
    baseSize: number,
    color: string,
    isHighlighter: boolean = false
): void {
    if (points.length < 2) return

    ctx.save()
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = color

    if (isHighlighter) {
        ctx.globalAlpha = 0.3
        ctx.globalCompositeOperation = 'multiply'
    }

    // Smoothed points for better path
    const smoothedPoints = smoothPoints(points)

    // Draw using quadratic curves for smoothness
    ctx.beginPath()
    ctx.moveTo(smoothedPoints[0].x, smoothedPoints[0].y)

    for (let i = 0; i < smoothedPoints.length - 1; i++) {
        const p1 = smoothedPoints[i]
        const p2 = smoothedPoints[i + 1]

        // Use midpoint for quadratic curve control
        const midX = (p1.x + p2.x) / 2
        const midY = (p1.y + p2.y) / 2

        // Set line width based on average pressure of segment
        const pressure = (p1.pressure + p2.pressure) / 2
        ctx.lineWidth = baseSize * pressure * 2

        if (i === 0) {
            ctx.lineTo(midX, midY)
        } else {
            ctx.quadraticCurveTo(p1.x, p1.y, midX, midY)
        }

        // Stroke this segment and start new path for next segment with different width
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(midX, midY)
    }

    // Draw final segment to last point
    const lastPoint = smoothedPoints[smoothedPoints.length - 1]
    ctx.lineWidth = baseSize * lastPoint.pressure * 2
    ctx.lineTo(lastPoint.x, lastPoint.y)
    ctx.stroke()

    ctx.restore()
}

/**
 * Apply simple moving average smoothing to points
 */
export function smoothPoints(points: Point[], windowSize: number = 3): Point[] {
    if (points.length <= windowSize) return points

    const smoothed: Point[] = []
    const half = Math.floor(windowSize / 2)

    for (let i = 0; i < points.length; i++) {
        let sumX = 0, sumY = 0, sumPressure = 0, count = 0

        for (let j = Math.max(0, i - half); j <= Math.min(points.length - 1, i + half); j++) {
            sumX += points[j].x
            sumY += points[j].y
            sumPressure += points[j].pressure
            count++
        }

        smoothed.push({
            x: sumX / count,
            y: sumY / count,
            pressure: sumPressure / count
        })
    }

    return smoothed
}

/**
 * Draw stroke for real-time preview (faster, less smooth)
 */
export function drawQuickStroke(
    ctx: CanvasRenderingContext2D,
    points: Point[],
    baseSize: number,
    color: string,
    isHighlighter: boolean = false
): void {
    if (points.length < 2) return

    ctx.save()
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = color

    if (isHighlighter) {
        ctx.globalAlpha = 0.3
    }

    ctx.beginPath()
    ctx.moveTo(points[0].x, points[0].y)

    // Use quadratic curves through midpoints for smoothness
    for (let i = 1; i < points.length - 1; i++) {
        const p1 = points[i]
        const p2 = points[i + 1]

        // Midpoint between current and next
        const midX = (p1.x + p2.x) / 2
        const midY = (p1.y + p2.y) / 2

        // Variable width based on pressure
        ctx.lineWidth = baseSize * p1.pressure * 2

        ctx.quadraticCurveTo(p1.x, p1.y, midX, midY)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(midX, midY)
    }

    // Final segment
    if (points.length >= 2) {
        const last = points[points.length - 1]
        ctx.lineWidth = baseSize * last.pressure * 2
        ctx.lineTo(last.x, last.y)
        ctx.stroke()
    }

    ctx.restore()
}

/**
 * Erase area by drawing with destination-out composite
 */
export function eraseArea(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number
): void {
    ctx.save()
    ctx.globalCompositeOperation = 'destination-out'
    ctx.beginPath()
    ctx.arc(x, y, size, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
}

/**
 * Draw white-out (white over existing content)
 */
export function drawWhiteOut(
    ctx: CanvasRenderingContext2D,
    points: Point[],
    size: number
): void {
    if (points.length < 1) return

    ctx.save()
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#FFFFFF'
    ctx.lineWidth = size

    ctx.beginPath()
    ctx.moveTo(points[0].x, points[0].y)

    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y)
    }

    ctx.stroke()
    ctx.restore()
}
