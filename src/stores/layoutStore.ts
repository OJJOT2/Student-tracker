import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type PaneType = 'video' | 'pdf' | 'browser' | 'notes' | 'none'

interface LayoutState {
    splitRatio: number // 0 to 100
    leftPane: PaneType
    rightPane: PaneType
    isVertical: boolean // true = top/bottom, false = left/right

    // Actions
    setSplitRatio: (ratio: number) => void
    setPane: (side: 'left' | 'right', type: PaneType) => void
    toggleOrientation: () => void
    resetLayout: () => void
}

export const useLayoutStore = create<LayoutState>()(
    persist(
        (set) => ({
            splitRatio: 50,
            leftPane: 'video',
            rightPane: 'pdf',
            isVertical: false,

            setSplitRatio: (ratio) => set({ splitRatio: Math.max(10, Math.min(90, ratio)) }),

            setPane: (side, type) => set(() => ({
                [side === 'left' ? 'leftPane' : 'rightPane']: type
            })),

            toggleOrientation: () => set((state) => ({ isVertical: !state.isVertical })),

            resetLayout: () => set({
                splitRatio: 50,
                leftPane: 'video',
                rightPane: 'pdf',
                isVertical: false
            })
        }),
        {
            name: 'layout-storage',
        }
    )
)
