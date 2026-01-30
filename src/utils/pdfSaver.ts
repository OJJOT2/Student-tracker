import { PDFDocument, rgb } from 'pdf-lib'
import { Stroke, ImageAnnotation } from '../components/PDFViewer/PDFViewer'



/**
 * Saves annotations (strokes and images) to a PDF file.
 * @param pdfData The original PDF file as ArrayBuffer
 * @param annotations Map of page index to list of strokes
 * @param images Map of page index to list of images (optional)
 * @param sourceWidth The width of the view port where annotations were created (used for scaling)
 * @returns The modified PDF as Uint8Array
 */
export async function saveAnnotationsToPDF(
    pdfData: ArrayBuffer,
    annotations: Record<number, Stroke[]>,
    images: Record<number, ImageAnnotation[]> = {},
    sourceWidth?: number
): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.load(pdfData)
    const pages = pdfDoc.getPages()
    // Standard PDF fonts
    // ...

    // Process each page
    for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
        const page = pages[pageIndex]
        const pageHeight = page.getHeight()
        // Annotations are 1-indexed in PDFViewer state?
        // Wait, looking at PDFViewer.tsx, page numbers are 1-based (from react-pdf).
        // Let's verify indexing. react-pdf uses 1-based page numbers.
        // My annotations state key is `pageNumber` which is 1-based.
        // pdf-lib's getPages() returns array, which is 0-indexed.
        // So pageIndex 0 is Page 1.

        const pageNumber = pageIndex + 1
        const pageStrokesForPage = annotations[pageNumber] || []
        const pageImagesForPage = images[pageNumber] || []

        // Draw Images first (so strokes appear on top)
        for (const img of pageImagesForPage) {
            // Embed image
            let embeddedImage
            if (img.mimeType === 'image/png') {
                embeddedImage = await pdfDoc.embedPng(img.data)
            } else {
                embeddedImage = await pdfDoc.embedJpg(img.data)
            }

            // Draw image (flip Y coordinate)
            // PDF Y is from bottom. Canvas Y is from top.
            // y_pdf = height - y_canvas - image_height (bottom-left corner of image)
            page.drawImage(embeddedImage, {
                x: img.x,
                y: pageHeight - img.y - img.height,
                width: img.width,
                height: img.height,
            })
        }

        // Draw Strokes
        console.log(`Page ${pageNumber}: Found ${pageStrokesForPage.length} strokes`)

        for (const stroke of pageStrokesForPage) {
            if (stroke.points.length < 2) continue

            // Color string to RGB
            const { r, g, b } = hexToRgb(stroke.color)
            const color = rgb(r, g, b)

            // Scaling
            let scaleRatio = 1
            const pageWidth = page.getWidth() // Define width here
            if (sourceWidth) {
                scaleRatio = pageWidth / sourceWidth // PDF Width / Viewer Width
            }

            // Scale points
            const scaledPoints = stroke.points.map(p => ({
                x: p.x * scaleRatio,
                y: p.y * scaleRatio
            }))

            console.log(`Drawing stroke on page ${pageNumber} with ${stroke.points.length} points, color: ${stroke.color}, scale: ${scaleRatio}`)
            // Whiteout (eraser) just draws white lines
            // Normal eraser (removing strokes) should have been handled by *removing* the stroke from the data
            // But if we have 'whiteout' tool, we draw white.
            // If tool is 'eraser', we typically don't draw it unless it's a whiteout stroke.
            // The AnnotationLayer handles standard eraser by modifying the strokes array.
            // So we only need to handle 'pen', 'highlighter', and 'whiteout'.

            if (stroke.tool === 'whiteout') {
                const pathData = pointsToSvgPath(scaledPoints, pageHeight)
                if (pathData) {
                    page.drawSvgPath(pathData, {
                        borderColor: rgb(1, 1, 1),
                        borderWidth: stroke.size * scaleRatio
                    })
                }
            } else {
                const pathData = pointsToSvgPath(scaledPoints, pageHeight)
                // Highlighter opacity
                const opacity = stroke.tool === 'highlighter' ? 0.3 : 1

                if (pathData) {
                    page.drawSvgPath(pathData, {
                        borderColor: color,
                        borderWidth: stroke.size * scaleRatio,
                        borderOpacity: opacity
                    })
                }
            }
        }
    }

    return await pdfDoc.save()
}

// Helper: Convert points to SVG Path string, flipping Y
function pointsToSvgPath(points: { x: number; y: number }[], pageHeight: number): string {
    if (points.length === 0) return ''

    // Move to first point
    // Ensure we don't produce NaN
    const startX = points[0].x || 0
    const startY = pageHeight - (points[0].y || 0)

    let d = `M ${startX} ${startY}`

    for (let i = 1; i < points.length; i++) {
        const x = points[i].x || 0
        const y = pageHeight - (points[i].y || 0)
        d += ` L ${x} ${y}`
    }

    return d
}

// Helper: HEX to RGB (0-1 range)
function hexToRgb(hex: string): { r: number; g: number; b: number } {
    let c = hex.substring(1)
    if (c.length === 3) {
        c = c.split('').map(char => char + char).join('')
    }
    const num = parseInt(c, 16)
    return {
        r: ((num >> 16) & 255) / 255,
        g: ((num >> 8) & 255) / 255,
        b: (num & 255) / 255
    }
}
