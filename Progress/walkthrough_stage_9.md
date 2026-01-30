# Focus Mode Implementation Walkthrough

## Overview
Implemented a "Focus Mode" that hides distracting UI elements and provides a Pomodoro-style timer to help students stay on task.

## Changes

### 1. State Management (`focusStore.ts`)
- Created a Zustand store to manage:
  - `isFocusMode` (boolean)
  - `timerState` (idle, running, paused)
  - `timeLeft` (countdown)
  - Timer actions (start, pause, reset, setDuration)

### 2. Components
- **`FocusTimer.tsx`**: A floating timer widget that appears when Focus Mode is active.
  - Can be minimized to a small pill.
  - Shows countdown and controls.
- **`FocusToggle.tsx`**: A button to enter/exit Focus Mode.

### 3. Integration
- **`App.tsx`**:
  - `TabBar` is now hidden when `isFocusMode` is true.
  - `FocusTimer` is mounted globally so it persists across route changes.
- **`SplitScreenLayout.tsx`**:
  - Added `FocusToggle` button to the top-right corner.

## Verification
- [x] Toggle Focus Mode -> TabBar disappears/reappears.
- [x] Timer starts, pauses, and resets correctly.
- [x] Timer persists when navigating between pages.
- [x] Visual styling matches the app's dark theme.
