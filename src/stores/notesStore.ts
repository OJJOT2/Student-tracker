import { create } from 'zustand'
import { Note } from '../types/notes'

interface NotesStore {
    notes: Note[]
    currentSessionPath: string | null
    isLoading: boolean
    error: string | null

    // Actions
    loadNotes: (sessionPath: string) => Promise<void>
    addNote: (note: Omit<Note, 'id' | 'createdAt'>) => Promise<void>
    updateNote: (id: string, updates: Partial<Note>) => Promise<void>
    deleteNote: (id: string) => Promise<void>
}

// Helper: Save notes to disk
async function saveNotesToDisk(sessionPath: string, notes: Note[]) {
    try {
        const path = sessionPath + '/notes.json'
        const text = JSON.stringify(notes, null, 2)
        const encoder = new TextEncoder()
        const view = encoder.encode(text)
        const buffer = view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength)
        await window.api.writeFile(path, buffer)
    } catch (err) {
        console.error('Failed to save notes:', err)
        useNotesStore.setState({ error: 'Failed to save notes to disk' })
    }
}

export const useNotesStore = create<NotesStore>((set, get) => ({
    notes: [],
    currentSessionPath: null,
    isLoading: false,
    error: null,

    loadNotes: async (sessionPath: string) => {
        set({ isLoading: true, error: null, currentSessionPath: sessionPath })
        try {
            const notesPath = sessionPath + '/notes.json'
            let notes: Note[] = []

            try {
                // Try reading notes file
                const buffer = await window.api.readFile(notesPath)
                const text = new TextDecoder().decode(buffer)
                notes = JSON.parse(text)
            } catch (err: any) {
                // Assume file doesn't exist or is empty
                console.log('Notes file not found or empty, starting fresh.', err)
                notes = []
            }

            set({ notes, isLoading: false })
        } catch (err) {
            set({ error: String(err), isLoading: false })
        }
    },

    addNote: async (noteData) => {
        const { notes, currentSessionPath } = get()
        if (!currentSessionPath) return

        const newNote: Note = {
            ...noteData,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString()
        }

        const updatedNotes = [...notes, newNote]
        set({ notes: updatedNotes })
        await saveNotesToDisk(currentSessionPath, updatedNotes)
    },

    updateNote: async (id, updates) => {
        const { notes, currentSessionPath } = get()
        if (!currentSessionPath) return

        const updatedNotes = notes.map(n => n.id === id ? { ...n, ...updates } : n)
        set({ notes: updatedNotes })
        await saveNotesToDisk(currentSessionPath, updatedNotes)
    },

    deleteNote: async (id) => {
        const { notes, currentSessionPath } = get()
        if (!currentSessionPath) return

        const updatedNotes = notes.filter(n => n.id !== id)
        set({ notes: updatedNotes })
        await saveNotesToDisk(currentSessionPath, updatedNotes)
    }
}))
