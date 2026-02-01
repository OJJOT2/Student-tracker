import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'

// Task Types
export type TaskStatus = 'todo' | 'in-progress' | 'done'

export interface Task {
    id: string
    title: string
    description?: string
    status: TaskStatus
    createdAt: string
    dueDate?: string // ISO string
    sessionPath?: string // Link to a session
}

interface TaskStore {
    tasks: Task[]
    addTask: (title: string, description?: string, sessionPath?: string, dueDate?: string) => void
    updateTask: (id: string, updates: Partial<Task>) => void
    deleteTask: (id: string) => void
    moveTask: (id: string, newStatus: TaskStatus) => void
}

// Load tasks from localStorage
const loadTasks = (): Task[] => {
    try {
        const stored = localStorage.getItem('student-tracker-tasks')
        return stored ? JSON.parse(stored) : []
    } catch {
        return []
    }
}

export const useTaskStore = create<TaskStore>((set) => ({
    tasks: loadTasks(),

    addTask: (title, description, sessionPath, dueDate) => set((state) => {
        const newTask: Task = {
            id: uuidv4(),
            title,
            description,
            status: 'todo',
            createdAt: new Date().toISOString(),
            sessionPath,
            dueDate
        }
        const updatedTasks = [...state.tasks, newTask]
        localStorage.setItem('student-tracker-tasks', JSON.stringify(updatedTasks))
        return { tasks: updatedTasks }
    }),

    updateTask: (id, updates) => set((state) => {
        const updatedTasks = state.tasks.map(task =>
            task.id === id ? { ...task, ...updates } : task
        )
        localStorage.setItem('student-tracker-tasks', JSON.stringify(updatedTasks))
        return { tasks: updatedTasks }
    }),

    deleteTask: (id) => set((state) => {
        const updatedTasks = state.tasks.filter(task => task.id !== id)
        localStorage.setItem('student-tracker-tasks', JSON.stringify(updatedTasks))
        return { tasks: updatedTasks }
    }),

    moveTask: (id, newStatus) => set((state) => {
        const updatedTasks = state.tasks.map(task =>
            task.id === id ? { ...task, status: newStatus } : task
        )
        localStorage.setItem('student-tracker-tasks', JSON.stringify(updatedTasks))
        return { tasks: updatedTasks }
    })
}))
