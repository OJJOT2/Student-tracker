# Stage 1 — System Architecture

## Goal

Design the complete system architecture for the **Student Tracker App** — a desktop application for tracking study sessions, with custom video/PDF players, focus mode, and analytics dashboard.

---

## 🏗️ App Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ELECTRON MAIN PROCESS                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │  File System    │  │  IPC Bridge     │  │  Native APIs                │  │
│  │  Manager        │  │  (Main↔Renderer)│  │  (Dialog, Notifications)    │  │
│  └────────┬────────┘  └────────┬────────┘  └─────────────┬───────────────┘  │
│           │                    │                         │                   │
│  ┌────────▼────────┐  ┌────────▼────────┐  ┌─────────────▼───────────────┐  │
│  │  Directory      │  │  Session        │  │  Global Stats               │  │
│  │  Scanner        │  │  Meta Manager   │  │  Manager                    │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ IPC
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          ELECTRON RENDERER PROCESS                           │
│                              (React Application)                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                         STATE MANAGEMENT (Zustand)                    │   │
│  ├──────────────┬──────────────┬──────────────┬────────────────────────┤   │
│  │ SessionStore │ PlayerStore  │ FocusStore   │ DashboardStore         │   │
│  └──────────────┴──────────────┴──────────────┴────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                              ROUTER                                   │   │
│  ├──────────────┬──────────────┬──────────────────────────────────────┤   │
│  │   /sessions  │  /focus      │  /dashboard                          │   │
│  └──────┬───────┴──────┬───────┴──────────────┬───────────────────────┘   │
│         │              │                       │                          │
│  ┌──────▼──────┐ ┌─────▼──────┐ ┌─────────────▼──────────────┐           │
│  │  SESSIONS   │ │   FOCUS    │ │        DASHBOARD           │           │
│  │    TAB      │ │    TAB     │ │           TAB              │           │
│  ├─────────────┤ ├────────────┤ ├────────────────────────────┤           │
│  │ FolderTree  │ │ External   │ │ StudyHoursGraph            │           │
│  │ SessionCard │ │ FocusMode  │ │ SessionsCompleted          │           │
│  │ SessionView │ │ Session    │ │ StreakCounter              │           │
│  │ Playlist    │ │ FocusMode  │ │ WeeklySummary              │           │
│  └──────┬──────┘ └────────────┘ └────────────────────────────┘           │
│         │                                                                 │
│  ┌──────▼─────────────────────────────────────────────────────────────┐  │
│  │                      SHARED COMPONENTS                              │  │
│  ├────────────────────┬───────────────────┬───────────────────────────┤  │
│  │  CustomVideoPlayer │  PDFViewer        │  SplitScreenLayout        │  │
│  │  ├─ ControlBar     │  ├─ PageRenderer  │  ├─ ResizablePanes        │  │
│  │  ├─ SeekBar        │  ├─ AnnotationBar │  ├─ FloatingWindow        │  │
│  │  ├─ SpeedControl   │  ├─ HighlightTool │  └─ SyncController        │  │
│  │  ├─ VolumeControl  │  ├─ PenTool       │                           │  │
│  │  ├─ FrameTransform │  ├─ EraserTool    │                           │  │
│  │  └─ MarksSystem    │  └─ TextTool      │                           │  │
│  └────────────────────┴───────────────────┴───────────────────────────┘  │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 Data Flow Diagram

```
┌────────────────────────────────────────────────────────────────────────────┐
│                              DATA FLOW                                      │
└────────────────────────────────────────────────────────────────────────────┘

1️⃣ DIRECTORY SCAN FLOW
   ┌─────────────┐     ┌─────────────┐     ┌──────────────┐     ┌───────────┐
   │ User sets   │────▶│ Recursive   │────▶│ Detect       │────▶│ Build     │
   │ Main Dir    │     │ fs.readdir  │     │ Sessions     │     │ Tree      │
   └─────────────┘     └─────────────┘     └──────────────┘     └─────┬─────┘
                                                                      │
   ┌──────────────────────────────────────────────────────────────────▼──────┐
   │  For each folder with .mp4 files:                                       │
   │  ├─ Check for existing session.meta.json                                │
   │  ├─ If exists → Load metadata                                           │
   │  └─ If not → Create new session.meta.json with UUID                     │
   └─────────────────────────────────────────────────────────────────────────┘

2️⃣ SESSION PLAYBACK FLOW
   ┌─────────────┐     ┌─────────────┐     ┌──────────────┐     ┌───────────┐
   │ User opens  │────▶│ Load        │────▶│ Initialize   │────▶│ Start     │
   │ Session     │     │ Metadata    │     │ VideoPlayer  │     │ Tracking  │
   └─────────────┘     └─────────────┘     └──────────────┘     └─────┬─────┘
                                                                      │
   ┌──────────────────────────────────────────────────────────────────▼──────┐
   │  Continuous tracking:                                                    │
   │  ├─ Watch time accumulation                                              │
   │  ├─ Part completion detection                                            │
   │  ├─ Seek/pause behavior logging                                          │
   │  └─ Auto-save to session.meta.json every 30 seconds                      │
   └─────────────────────────────────────────────────────────────────────────┘

3️⃣ STATISTICS AGGREGATION FLOW
   ┌─────────────┐     ┌─────────────┐     ┌──────────────┐     ┌───────────┐
   │ All         │────▶│ Aggregate   │────▶│ Calculate    │────▶│ Update    │
   │ Sessions    │     │ Watch Time  │     │ Streaks      │     │ Dashboard │
   └─────────────┘     └─────────────┘     └──────────────┘     └───────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ global-stats.json │
                    │ ├─ dailyHours[]   │
                    │ ├─ currentStreak  │
                    │ ├─ longestStreak  │
                    │ └─ totalWatchTime │
                    └──────────────────┘
```

---

## 📁 Folder Scanning Logic

```typescript
// Scanning Algorithm (Pseudocode)

function scanDirectory(rootPath: string): FolderNode {
  const entries = fs.readdirSync(rootPath);
  
  const mp4Files = entries.filter(e => e.endsWith('.mp4'));
  const pdfFiles = entries.filter(e => e.endsWith('.pdf'));
  const subdirs = entries.filter(e => isDirectory(path.join(rootPath, e)));
  
  if (mp4Files.length > 0) {
    // This IS a session folder
    return {
      type: 'session',
      path: rootPath,
      name: path.basename(rootPath),
      videos: mp4Files,
      pdfs: pdfFiles,
      metadata: loadOrCreateMetadata(rootPath)
    };
  } else {
    // This is a category folder
    return {
      type: 'category',
      path: rootPath,
      name: path.basename(rootPath),
      children: subdirs.map(dir => scanDirectory(path.join(rootPath, dir)))
    };
  }
}
```

### Session Detection Rules:
| Condition | Result |
|-----------|--------|
| Folder contains `.mp4` files | → Session |
| Folder contains only subdirectories | → Category |
| Folder contains `session.meta.json` | → Session (even if .mp4 moved) |

---

## 🗄️ State Management Plan

### Technology: **Zustand**
Chosen for:
- Minimal boilerplate
- TypeScript-first
- No provider wrapping needed
- Selective subscriptions for performance

### Store Structure:

```typescript
// stores/sessionStore.ts
interface SessionStore {
  rootDirectory: string | null;
  folderTree: FolderNode | null;
  selectedSession: Session | null;
  
  // Actions
  setRootDirectory: (path: string) => void;
  refreshTree: () => Promise<void>;
  selectSession: (sessionId: string) => void;
}

// stores/playerStore.ts
interface PlayerStore {
  currentVideo: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  volume: number;
  transform: { x: number; y: number; scale: number };
  marks: TimestampMark[];
  
  // Tracking
  watchTime: number;
  pauseCount: number;
  seekEvents: SeekEvent[];
  
  // Actions
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  setSpeed: (rate: number) => void;
  addMark: (mark: TimestampMark) => void;
  transformVideo: (transform: Partial<Transform>) => void;
}

// stores/focusStore.ts
interface FocusStore {
  mode: 'off' | 'external' | 'session';
  sessionId: string | null;
  startTime: Date | null;
  breakInterval: number; // minutes
  
  // Actions
  startExternalFocus: () => void;
  startSessionFocus: (sessionId: string) => void;
  endFocus: () => void;
}

// stores/dashboardStore.ts
interface DashboardStore {
  dailyStats: DailyStats[];
  currentStreak: number;
  weeklyTotal: number;
  monthlyTotal: number;
  
  // Actions
  refreshStats: () => Promise<void>;
}
```

---

## 📂 Project Structure

```
student-tracker/
├── electron/
│   ├── main.ts                 # Electron main process
│   ├── preload.ts              # Preload script for IPC
│   └── services/
│       ├── fileSystem.ts       # Directory operations
│       ├── sessionMeta.ts      # session.meta.json handlers
│       └── globalStats.ts      # Global statistics manager
│
├── src/
│   ├── main.tsx                # React entry point
│   ├── App.tsx                 # Main app with routing
│   │
│   ├── stores/
│   │   ├── sessionStore.ts
│   │   ├── playerStore.ts
│   │   ├── focusStore.ts
│   │   └── dashboardStore.ts
│   │
│   ├── pages/
│   │   ├── Sessions/
│   │   │   ├── SessionsPage.tsx
│   │   │   ├── FolderTree.tsx
│   │   │   ├── SessionCard.tsx
│   │   │   └── SessionView.tsx
│   │   ├── Focus/
│   │   │   ├── FocusPage.tsx
│   │   │   ├── ExternalFocus.tsx
│   │   │   └── SessionFocus.tsx
│   │   └── Dashboard/
│   │       ├── DashboardPage.tsx
│   │       ├── StudyHoursGraph.tsx
│   │       └── StreakWidget.tsx
│   │
│   ├── components/
│   │   ├── VideoPlayer/
│   │   │   ├── VideoPlayer.tsx       # Main wrapper
│   │   │   ├── ControlBar.tsx
│   │   │   ├── SeekBar.tsx
│   │   │   ├── SpeedControl.tsx
│   │   │   ├── VolumeControl.tsx
│   │   │   ├── FrameTransform.tsx
│   │   │   └── MarksOverlay.tsx
│   │   │
│   │   ├── PDFViewer/
│   │   │   ├── PDFViewer.tsx
│   │   │   ├── AnnotationToolbar.tsx
│   │   │   └── tools/
│   │   │       ├── HighlightTool.tsx
│   │   │       ├── PenTool.tsx
│   │   │       ├── EraserTool.tsx
│   │   │       └── TextTool.tsx
│   │   │
│   │   ├── SplitScreen/
│   │   │   ├── SplitScreenLayout.tsx
│   │   │   ├── ResizablePane.tsx
│   │   │   └── FloatingWindow.tsx
│   │   │
│   │   └── shared/
│   │       ├── Timer.tsx
│   │       ├── ProgressBar.tsx
│   │       └── TagInput.tsx
│   │
│   ├── types/
│   │   ├── session.ts
│   │   ├── player.ts
│   │   └── stats.ts
│   │
│   └── styles/
│       ├── global.css
│       ├── variables.css
│       └── components/
│
├── package.json
├── electron-builder.json
├── vite.config.ts
└── tsconfig.json
```

---

## 🔗 IPC Communication Map

| Channel | Direction | Purpose |
|---------|-----------|---------|
| `dir:select` | Renderer → Main | Open directory picker |
| `dir:scan` | Renderer → Main | Scan directory for sessions |
| `session:read` | Renderer → Main | Load session.meta.json |
| `session:write` | Renderer → Main | Save session metadata |
| `stats:read` | Renderer → Main | Load global stats |
| `stats:write` | Renderer → Main | Save global stats |
| `file:exists` | Renderer → Main | Check if file exists |
| `media:path` | Renderer → Main | Get safe file:// URL for media |

---

## 🔐 Security Considerations

1. **Context Isolation**: Enabled for Electron
2. **Node Integration**: Disabled in renderer
3. **Preload Script**: Exposes only necessary APIs
4. **File Access**: Only within user-selected directories

---

## Verification Plan

### Manual Verification (Stage 1)
Since this is an architecture/planning stage, verification involves:

1. **Review Architecture Diagram**: Confirm all required components are represented
2. **Review Data Flow**: Ensure session tracking and persistence is accounted for
3. **Review Folder Scanning Logic**: Confirm session detection rules match requirements
4. **Review State Management**: Verify all app states are covered

> [!IMPORTANT]
> **User Approval Required**: Please review this architecture plan and confirm it meets your requirements before I proceed to Stage 2 — Directory Scanner & Session Model.

---

## Questions for Clarification

1. **Electron vs Tauri**: The prompt mentions "Electron or Tauri" — I've designed for **Electron** as it has better ecosystem for custom video/PDF handling. Do you approve?

2. **PDF Annotations Storage**: Should PDF annotations be stored:
   - In the `session.meta.json` file?
   - In a separate `.annotations.json` file per PDF?

3. **Focus Mode Break System**: For break intervals, should the app:
   - Show a notification and continue?
   - Force a break by pausing everything?
   - Show a dismissible overlay?
