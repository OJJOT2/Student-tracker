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
