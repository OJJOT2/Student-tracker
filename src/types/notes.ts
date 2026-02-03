export interface Note {
    id: string
    sessionId: string
    timestamp: number // Video time in seconds
    type: 'text' | 'image' | 'drawing'
    content: string // Text content OR file path (relative to session dir)
    createdAt: string
    tags?: string[]
}
