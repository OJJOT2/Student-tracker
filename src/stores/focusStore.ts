import { create } from 'zustand'

type TimerState = 'idle' | 'running' | 'paused' | 'break'

interface FocusState {
    isFocusMode: boolean
    timerDuration: number // minutes
    timeLeft: number // seconds
    timerState: TimerState

    // Actions
    toggleFocusMode: () => void
    startTimer: () => void
    pauseTimer: () => void
    resetTimer: () => void
    setDuration: (minutes: number) => void
    tick: () => void // Called by interval
}

export const useFocusStore = create<FocusState>((set, get) => ({
    isFocusMode: false,
    timerDuration: 25,
    timeLeft: 25 * 60,
    timerState: 'idle',

    toggleFocusMode: () => set((state) => ({ isFocusMode: !state.isFocusMode })),

    startTimer: () => set({ timerState: 'running' }),

    pauseTimer: () => set({ timerState: 'paused' }),

    resetTimer: () => {
        const { timerDuration } = get()
        set({
            timerState: 'idle',
            timeLeft: timerDuration * 60
        })
    },

    setDuration: (minutes) => set({
        timerDuration: minutes,
        timeLeft: minutes * 60,
        timerState: 'idle'
    }),

    tick: () => set((state) => {
        if (state.timerState !== 'running') return {}

        if (state.timeLeft <= 0) {
            // Timer finished
            return {
                timerState: 'idle',
                timeLeft: 0
                // Could trigger notification here or in a subscriber
            }
        }

        return { timeLeft: state.timeLeft - 1 }
    })
}))
