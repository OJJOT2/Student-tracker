import { createContext, useContext, useReducer, ReactNode } from 'react'
import type { Stroke, ImageAnnotation, DrawingTool, EraserMode } from './types'

// --- Types ---

interface PDFState {
    scale: number
    currentPage: number
    numPages: number
    tool: DrawingTool
    eraserMode: EraserMode
    penColor: string
    highlighterColor: string
    penSize: number
    highlighterSize: number
    eraserSize: number
    annotations: Record<number, Stroke[]>
    images: Record<number, ImageAnnotation[]>
    history: Array<{ annotations: Record<number, Stroke[]>; images: Record<number, ImageAnnotation[]> }>
    historyIndex: number
}

type PDFAction =
    | { type: 'SET_SCALE'; payload: number }
    | { type: 'SET_NUM_PAGES'; payload: number }
    | { type: 'SET_CURRENT_PAGE'; payload: number }
    | { type: 'SET_TOOL'; payload: DrawingTool }
    | { type: 'SET_ERASER_MODE'; payload: EraserMode }
    | { type: 'SET_PEN_COLOR'; payload: string }
    | { type: 'SET_HIGHLIGHTER_COLOR'; payload: string }
    | { type: 'SET_PEN_SIZE'; payload: number }
    | { type: 'SET_HIGHLIGHTER_SIZE'; payload: number }
    | { type: 'SET_ERASER_SIZE'; payload: number }
    | { type: 'ADD_STROKE'; payload: { page: number; stroke: Stroke } }
    | { type: 'UPDATE_STROKES'; payload: { page: number; strokes: Stroke[] } } // generic update/delete
    | { type: 'ADD_IMAGE'; payload: { page: number; image: ImageAnnotation } }
    | { type: 'UPDATE_IMAGE'; payload: { id: string; updates: Partial<ImageAnnotation> } }
    | { type: 'UNDO' }
    | { type: 'REDO' }
    | { type: 'LOAD_DATA'; payload: { annotations: Record<number, Stroke[]>; images: Record<number, ImageAnnotation[]> } }

// --- Initial State ---

const initialState: PDFState = {
    scale: 1,
    currentPage: 1,
    numPages: 0,
    tool: 'select',
    eraserMode: 'stroke',
    penColor: '#000000',
    highlighterColor: '#ffff00',
    penSize: 2,
    highlighterSize: 20,
    eraserSize: 20,
    annotations: {},
    images: {},
    history: [{ annotations: {}, images: {} }],
    historyIndex: 0
}

// --- Reducer ---

function pdfReducer(state: PDFState, action: PDFAction): PDFState {
    switch (action.type) {
        case 'SET_SCALE':
            return { ...state, scale: Math.max(0.5, Math.min(3, action.payload)) }
        case 'SET_NUM_PAGES':
            return { ...state, numPages: action.payload }
        case 'SET_CURRENT_PAGE':
            return { ...state, currentPage: Math.max(1, Math.min(state.numPages, action.payload)) }
        case 'SET_TOOL':
            return { ...state, tool: action.payload }
        case 'SET_ERASER_MODE':
            return { ...state, eraserMode: action.payload }
        case 'SET_PEN_COLOR':
            return { ...state, penColor: action.payload }
        case 'SET_HIGHLIGHTER_COLOR':
            return { ...state, highlighterColor: action.payload }
        case 'SET_PEN_SIZE':
            return { ...state, penSize: action.payload }
        case 'SET_HIGHLIGHTER_SIZE':
            return { ...state, highlighterSize: action.payload }
        case 'SET_ERASER_SIZE':
            return { ...state, eraserSize: action.payload }

        case 'ADD_STROKE': {
            const { page, stroke } = action.payload
            const newAnnotations = {
                ...state.annotations,
                [page]: [...(state.annotations[page] || []), stroke]
            }
            const newHistory = state.history.slice(0, state.historyIndex + 1)
            newHistory.push({ annotations: newAnnotations, images: state.images })
            return {
                ...state,
                annotations: newAnnotations,
                history: newHistory,
                historyIndex: newHistory.length - 1
            }
        }

        case 'UPDATE_STROKES': {
            const { page, strokes } = action.payload
            const newAnnotations = {
                ...state.annotations,
                [page]: strokes
            }
            const newHistory = state.history.slice(0, state.historyIndex + 1)
            newHistory.push({ annotations: newAnnotations, images: state.images })
            return {
                ...state,
                annotations: newAnnotations,
                history: newHistory,
                historyIndex: newHistory.length - 1
            }
        }

        case 'ADD_IMAGE': {
            const { page, image } = action.payload
            const newImages = {
                ...state.images,
                [page]: [...(state.images[page] || []), image]
            }
            // For now, not adding images to history to keep it simple, or we can? 
            // Let's add to history for consistency.
            const newHistory = state.history.slice(0, state.historyIndex + 1)
            newHistory.push({ annotations: state.annotations, images: newImages })
            return {
                ...state,
                images: newImages,
                history: newHistory,
                historyIndex: newHistory.length - 1
            }
        }

        case 'UPDATE_IMAGE': {
            const { id, updates } = action.payload
            // Need to find which page handles this image
            let foundPage = -1
            let newPageImages: ImageAnnotation[] = []

            for (const [pageStr, imgs] of Object.entries(state.images)) {
                const page = parseInt(pageStr)
                const index = imgs.findIndex(img => img.id === id)
                if (index !== -1) {
                    foundPage = page
                    newPageImages = [...imgs]
                    newPageImages[index] = { ...newPageImages[index], ...updates }
                    break
                }
            }

            if (foundPage === -1) return state

            const newImages = {
                ...state.images,
                [foundPage]: newPageImages
            }

            // Image updates (resize/move) usually shouldn't trigger history spam? 
            // For now, let's NOT push to history for minor moves, only for logical "adds".
            // Or if we want robust undo, we should. But let's skip history for move/resize for now 
            // to avoid complexity with drag events.
            return {
                ...state,
                images: newImages
            }
        }

        case 'UNDO': {
            if (state.historyIndex <= 0) return state
            const prevIndex = state.historyIndex - 1
            const prevState = state.history[prevIndex]
            return {
                ...state,
                historyIndex: prevIndex,
                annotations: prevState.annotations,
                images: prevState.images
            }
        }

        case 'REDO': {
            if (state.historyIndex >= state.history.length - 1) return state
            const nextIndex = state.historyIndex + 1
            const nextState = state.history[nextIndex]
            return {
                ...state,
                historyIndex: nextIndex,
                annotations: nextState.annotations,
                images: nextState.images
            }
        }

        case 'LOAD_DATA':
            return {
                ...state,
                annotations: action.payload.annotations,
                images: action.payload.images,
                history: [{ annotations: action.payload.annotations, images: action.payload.images }],
                historyIndex: 0
            }

        default:
            return state
    }
}

// --- Context ---

interface PDFContextValue {
    state: PDFState
    dispatch: React.Dispatch<PDFAction>
}

const PDFContext = createContext<PDFContextValue | null>(null)

export function PDFProvider({ children, initialAnnotations, initialImages }: {
    children: ReactNode,
    initialAnnotations?: Record<number, Stroke[]>,
    initialImages?: Record<number, ImageAnnotation[]>
}) {
    const [state, dispatch] = useReducer(pdfReducer, {
        ...initialState,
        annotations: initialAnnotations || {},
        images: initialImages || {},
        history: [{
            annotations: initialAnnotations || {},
            images: initialImages || {}
        }]
    })

    return (
        <PDFContext.Provider value={{ state, dispatch }}>
            {children}
        </PDFContext.Provider>
    )
}

export function usePDF() {
    const context = useContext(PDFContext)
    if (!context) {
        throw new Error('usePDF must be used within a PDFProvider')
    }
    return context
}
