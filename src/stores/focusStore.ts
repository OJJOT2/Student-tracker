import { create } from 'zustand'

type TimerState = 'idle' | 'running' | 'paused'
export type FocusStatus = 'study' | 'break'
export type FocusModeType = 'external' | 'session' | 'break' | null

interface FocusState {
    isFocusMode: boolean
    activeMode: FocusModeType
    autoPause: boolean // Whether to pause timer when video pauses
    strictMode: boolean
    playbackSpeed: number
    setPlaybackSpeed: (speed: number) => void

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
    setAutoPause: (enabled: boolean) => void
    setStrictMode: (enabled: boolean) => void

    tick: () => void // Called by interval
}

export const useFocusStore = create<FocusState>((set, get) => ({
    isFocusMode: false,
    activeMode: null,
    autoPause: true, // Default enabled
    strictMode: false,

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
            timerState: nextState ? state.timerState : 'idle',
            strictMode: nextState ? state.strictMode : false // Disable strict mode if focus mode is disabled
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
    setAutoPause: (enabled) => set({ autoPause: enabled }),
    setStrictMode: (enabled) => set({ strictMode: enabled }),

    playbackSpeed: 1,
    setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),

    tick: () => set((state) => {
        if (state.timerState !== 'running') return {}

        // If in session mode, which timer changes depends on focusStatus
        // If in external mode, usually just one timer, but let's support break too if manually toggled

        if (state.focusStatus === 'study') {
            if (state.timeLeft <= 0) {
                // Study timer finished
                return { timeLeft: 0 }
            }
            // If synced speed is desired, we multiply the decrement.
            // Use the playbackSpeed for study time decrement.
            // "add a mark in the clock showing that the focus time also runs 2x" -> implies it runs faster.
            // We assume this is always active if the store has the speed (only set by VideoPlayer).
            // Break time (else block) should NOT start running faster ("but this is not applied to breaks too").

            // We need to decide if we rely on a flag or just always do it if speed != 1.
            // User request #3: "speed like 2x ... focus time also runs 2x".
            // It seems safe to do this generally for the study timer in session mode.
            const decrement = state.activeMode === 'session' ? state.playbackSpeed : 1

            // Decrease by 'decrement'. Note that tick calls are 1 per second. 
            // So we just subtract 'decrement' from timeLeft.
            // Float precision might be an issue so maybe store as float or just handle it. 
            // timeLeft is number (seconds). 
            return { timeLeft: Math.max(0, state.timeLeft - decrement) }
        } else {
            // Break status - Always real time (1x)
            if (state.breakTimeLeft <= 0) {
                // Break finished
                return { breakTimeLeft: 0 }
            }
            return { breakTimeLeft: Math.max(0, state.breakTimeLeft - 1) }
        }
    })
}))
