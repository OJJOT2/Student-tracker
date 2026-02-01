import { create } from 'zustand'

interface GoalStore {
    streak: number
    lastStudyDate: string | null
    dailyStudyTime: number // seconds studied today
    totalStudyTime: number // lifetime
    dailyGoal: number // seconds target

    // Actions
    setDailyGoal: (seconds: number) => void
    addStudyTime: (seconds: number) => void
    checkStreak: () => void
}

const STORAGE_KEY = 'student-tracker-goals'

const getTodayString = () => new Date().toLocaleDateString()

const loadState = () => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
            const parsed = JSON.parse(stored)
            // Check if it's a new day for dailyStudyTime
            if (parsed.lastUsageDate !== getTodayString()) {
                // If we missed a day? Streak logic handles this on update.
                // Here just reset daily counter.
                return { ...parsed, dailyStudyTime: 0 }
            }
            return parsed
        }
    } catch { }
    return {
        streak: 0,
        lastStudyDate: null,
        dailyStudyTime: 0,
        totalStudyTime: 0,
        dailyGoal: 4 * 3600 // Default 4 hours
    }
}

export const useGoalStore = create<GoalStore>((set, get) => ({
    ...loadState(),

    setDailyGoal: (seconds) => {
        set({ dailyGoal: seconds })
        const { streak, lastStudyDate, dailyStudyTime, totalStudyTime } = get()
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            streak, lastStudyDate, dailyStudyTime, totalStudyTime, dailyGoal: seconds, lastUsageDate: getTodayString()
        }))
    },

    addStudyTime: (seconds) => {
        const state = get()
        const today = getTodayString()
        const yesterday = new Date(Date.now() - 86400000).toLocaleDateString()

        let newStreak = state.streak
        let newDailyStudyTime = state.dailyStudyTime

        // Check if day changed
        if (state.lastStudyDate !== today) {
            newDailyStudyTime = 0 // Reset daily time

            if (state.lastStudyDate === yesterday) {
                newStreak += 1
            } else {
                newStreak = 1 // First day or broken streak
            }
        }

        newDailyStudyTime += seconds
        const newTotal = state.totalStudyTime + seconds

        set({
            lastStudyDate: today,
            streak: newStreak,
            dailyStudyTime: newDailyStudyTime,
            totalStudyTime: newTotal
        })

        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            streak: newStreak,
            lastStudyDate: today,
            dailyStudyTime: newDailyStudyTime,
            totalStudyTime: newTotal,
            dailyGoal: state.dailyGoal,
            lastUsageDate: today
        }))
    },

    checkStreak: () => {
        // Logic to reset streak if we open app and it's been > 1 day
        const state = get()
        const today = getTodayString()
        const yesterday = new Date(Date.now() - 86400000).toLocaleDateString()

        if (state.lastStudyDate && state.lastStudyDate !== today && state.lastStudyDate !== yesterday) {
            // More than 1 day gap
            set({ streak: 0 })
            // Don't save yet, wait for interaction? No, valid to reset UI.
        }
    }
}))
