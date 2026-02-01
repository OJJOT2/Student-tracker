import { create } from 'zustand'

type TimerState = 'idle' | 'running' | 'paused'
export type FocusStatus = 'study' | 'break'
export type FocusModeType = 'external' | 'session' | 'break' | null

interface FocusState {
    isFocusMode: boolean
    activeMode: FocusModeType

    // Study Timer
    timerDuration: number // minutes
    timeLeft: number // seconds

    // Break Timer
    breakDuration: number // minutes
    breakTimeLeft: number // seconds

    timerState: TimerState
    focusStatus: FocusStatus

    // Actions
    toggleFocusMode: () => void
    setMode: (mode: FocusModeType) => void

    // Timer Controls
    startTimer: () => void
    pauseTimer: () => void
    resetTimer: () => void

    // Configuration
    setDuration: (minutes: number) => void
    setBreakDuration: (minutes: number) => void

    // Status
    setFocusStatus: (status: FocusStatus) => void

    tick: () => void // Called by interval
}

export const useFocusStore = create<FocusState>((set, get) => ({
    isFocusMode: false,
    activeMode: null,

    timerDuration: 25,
    timeLeft: 25 * 60,

    breakDuration: 5,
    breakTimeLeft: 5 * 60,

    timerState: 'idle',
    focusStatus: 'study',

    toggleFocusMode: () => set((state) => {
        const nextState = !state.isFocusMode
        // When turning off, reset specific session flags if needed
        return {
            isFocusMode: nextState,
            timerState: nextState ? state.timerState : 'idle'
        }
    }),

    setMode: (mode) => set({ activeMode: mode }),

    startTimer: () => set({ timerState: 'running' }),

    pauseTimer: () => set({ timerState: 'paused' }),

    resetTimer: () => {
        const { timerDuration, breakDuration } = get()
        set({
            timerState: 'idle',
            timeLeft: timerDuration * 60,
            breakTimeLeft: breakDuration * 60,
            focusStatus: 'study'
        })
    },

    setDuration: (minutes) => set({
        timerDuration: minutes,
        timeLeft: minutes * 60
    }),

    setBreakDuration: (minutes) => set({
        breakDuration: minutes,
        breakTimeLeft: minutes * 60
    }),

    setFocusStatus: (status) => set({ focusStatus: status }),

    tick: () => set((state) => {
        if (state.timerState !== 'running') return {}

        // If in session mode, which timer changes depends on focusStatus
        // If in external mode, usually just one timer, but let's support break too if manually toggled

        if (state.focusStatus === 'study') {
            if (state.timeLeft <= 0) {
                // Study timer finished
                // If auto-switch is desired, could go to break, but for now just stop or stay at 0
                return { timeLeft: 0 }
            }
            return { timeLeft: state.timeLeft - 1 }
        } else {
            // Break status
            if (state.breakTimeLeft <= 0) {
                // Break finished
                return { breakTimeLeft: 0 }
            }
            return { breakTimeLeft: state.breakTimeLeft - 1 }
        }
    })
}))
