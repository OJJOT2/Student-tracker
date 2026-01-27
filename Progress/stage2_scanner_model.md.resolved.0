# Stage 2 — Directory Scanner & Session Model

## 📁 Folder Traversal Logic

### Algorithm: Recursive Depth-First Scan

```typescript
// electron/services/directoryScanner.ts

interface ScanResult {
  type: 'session' | 'category';
  path: string;
  name: string;
  children?: ScanResult[];
  session?: SessionInfo;
}

interface SessionInfo {
  videos: VideoFile[];
  pdfs: string[];
  metadata: SessionMetadata | null;
}

interface VideoFile {
  filename: string;
  path: string;
  size: number;
}

async function scanDirectory(dirPath: string): Promise<ScanResult> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  
  // Separate files and directories
  const files = entries.filter(e => e.isFile());
  const dirs = entries.filter(e => e.isDirectory());
  
  // Check for media files
  const mp4Files = files.filter(f => 
    f.name.toLowerCase().endsWith('.mp4')
  );
  const pdfFiles = files.filter(f => 
    f.name.toLowerCase().endsWith('.pdf')
  );
  
  // SESSION DETECTION: Has MP4 files = session folder
  if (mp4Files.length > 0) {
    const metadataPath = path.join(dirPath, 'session.meta.json');
    const metadata = await loadOrCreateMetadata(dirPath, metadataPath);
    
    return {
      type: 'session',
      path: dirPath,
      name: metadata.customName || path.basename(dirPath),
      session: {
        videos: await Promise.all(mp4Files.map(async f => ({
          filename: f.name,
          path: path.join(dirPath, f.name),
          size: (await fs.stat(path.join(dirPath, f.name))).size
        }))),
        pdfs: pdfFiles.map(f => path.join(dirPath, f.name)),
        metadata
      }
    };
  }
  
  // CATEGORY: No MP4 files, scan subdirectories
  const children = await Promise.all(
    dirs
      .filter(d => !d.name.startsWith('.')) // Skip hidden folders
      .map(d => scanDirectory(path.join(dirPath, d.name)))
  );
  
  // Filter out empty categories
  const validChildren = children.filter(c => 
    c.type === 'session' || (c.children && c.children.length > 0)
  );
  
  return {
    type: 'category',
    path: dirPath,
    name: path.basename(dirPath),
    children: validChildren
  };
}
```

### Session Detection Decision Tree

```
┌─────────────────────────────────┐
│       Enter Folder              │
└───────────────┬─────────────────┘
                ▼
        ┌───────────────┐
        │ Has .mp4 ?    │
        └───────┬───────┘
           Yes  │  No
        ┌───────┴───────┐
        ▼               ▼
   ┌─────────┐    ┌──────────────┐
   │ SESSION │    │ Has subdirs? │
   └─────────┘    └──────┬───────┘
                    Yes  │  No
                ┌────────┴────────┐
                ▼                 ▼
         ┌──────────┐      ┌───────────┐
         │ CATEGORY │      │ SKIP/EMPTY│
         │ (recurse)│      └───────────┘
         └──────────┘
```

---

## 📋 Session Metadata Schema

### `session.meta.json` Structure

```typescript
interface SessionMetadata {
  // === IDENTITY ===
  id: string;                    // UUID v4 - IMMUTABLE
  originalPath: string;          // Path when first created
  
  // === USER DATA ===
  customName: string | null;     // User override for folder name
  description: string;           // Session description
  notes: string;                 // Free-form notes (markdown)
  tags: string[];                // User-defined tags
  
  // === STATUS ===
  status: 'untouched' | 'started' | 'completed';
  
  // === VIDEO PROGRESS ===
  videos: {
    [filename: string]: {
      watchTime: number;         // Total seconds watched
      lastPosition: number;      // Resume position (seconds)
      completed: boolean;        // Watched >90%
      playCount: number;         // Times played from start
    };
  };
  
  // === TIMESTAMPS ===
  marks: TimestampMark[];
  
  // === STATISTICS ===
  totalWatchTime: number;        // Aggregated across all videos
  sessionsCount: number;         // Times session was opened
  
  // === DATES ===
  createdAt: string;             // ISO 8601
  lastAccessedAt: string;        // ISO 8601
  completedAt: string | null;    // When status became 'completed'
}

interface TimestampMark {
  id: string;                    // UUID
  videoFile: string;             // Which video
  timestamp: number;             // Seconds
  label: string;                 // User note
  color: string;                 // Hex color
  createdAt: string;
}
```

### Example `session.meta.json`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "originalPath": "D:/Studies/Math/Calculus/Lecture 01",
  "customName": "Intro to Derivatives",
  "description": "First lecture covering basic derivative concepts",
  "notes": "- Review chain rule\n- Practice problems on page 42",
  "tags": ["calculus", "important", "exam-prep"],
  "status": "started",
  "videos": {
    "part1.mp4": {
      "watchTime": 1823,
      "lastPosition": 1820,
      "completed": true,
      "playCount": 2
    },
    "part2.mp4": {
      "watchTime": 450,
      "lastPosition": 450,
      "completed": false,
      "playCount": 1
    }
  },
  "marks": [
    {
      "id": "mark-001",
      "videoFile": "part1.mp4",
      "timestamp": 342,
      "label": "Key formula explained here",
      "color": "#ff6b6b",
      "createdAt": "2024-01-15T14:30:00Z"
    }
  ],
  "totalWatchTime": 2273,
  "sessionsCount": 5,
  "createdAt": "2024-01-10T09:00:00Z",
  "lastAccessedAt": "2024-01-20T16:45:00Z",
  "completedAt": null
}
```

---

## 🆔 ID Strategy

### UUID v4 for Session IDs

```typescript
import { v4 as uuidv4 } from 'uuid';

function generateSessionId(): string {
  return uuidv4(); // "550e8400-e29b-41d4-a716-446655440000"
}
```

**Why UUID v4?**
| Property | Benefit |
|----------|---------|
| Universally unique | No collisions even if folders merge |
| Path-independent | Session survives if folder moves |
| No central registry | Works offline, no database needed |
| Standard format | Easy to validate and parse |

### ID Assignment Rules

1. **New Session** → Generate fresh UUID v4
2. **Existing `session.meta.json`** → Use stored ID
3. **Corrupted metadata** → Regenerate ID, preserve other data

---

## 🔄 Metadata Lifecycle

```
┌──────────────┐
│ Folder Found │
└──────┬───────┘
       ▼
┌──────────────────────┐     ┌──────────────────────┐
│ session.meta.json    │ Yes │ Load & Validate      │
│ exists?              │────▶│ ├─ Parse JSON        │
└──────────┬───────────┘     │ ├─ Check required    │
           │ No              │ └─ Migrate if needed │
           ▼                 └──────────────────────┘
┌──────────────────────┐
│ Create New Metadata  │
│ ├─ Generate UUID     │
│ ├─ Set originalPath  │
│ ├─ status: untouched │
│ └─ Save to disk      │
└──────────────────────┘
```

---

## 📊 Progress Calculation

```typescript
function calculateProgress(metadata: SessionMetadata): number {
  const videos = Object.values(metadata.videos);
  if (videos.length === 0) return 0;
  
  const completedCount = videos.filter(v => v.completed).length;
  return Math.round((completedCount / videos.length) * 100);
}

function determineStatus(metadata: SessionMetadata): Status {
  const progress = calculateProgress(metadata);
  
  if (progress === 0 && metadata.totalWatchTime === 0) {
    return 'untouched';
  } else if (progress === 100) {
    return 'completed';
  } else {
    return 'started';
  }
}
```

### Video Completion Rule
A video is marked **completed** when:
```typescript
const COMPLETION_THRESHOLD = 0.90; // 90%

function isVideoCompleted(watchedTime: number, duration: number): boolean {
  return (watchedTime / duration) >= COMPLETION_THRESHOLD;
}
```

---

## 🗂️ TypeScript Types Summary

```typescript
// types/session.ts

export type SessionStatus = 'untouched' | 'started' | 'completed';

export interface FolderNode {
  type: 'session' | 'category';
  path: string;
  name: string;
  children?: FolderNode[];
  session?: Session;
}

export interface Session {
  id: string;
  path: string;
  name: string;
  description: string;
  notes: string;
  tags: string[];
  status: SessionStatus;
  videos: VideoItem[];
  pdfs: string[];
  progress: number;           // 0-100
  totalWatchTime: number;
  createdAt: Date;
  lastAccessedAt: Date;
}

export interface VideoItem {
  filename: string;
  path: string;
  watchTime: number;
  lastPosition: number;
  completed: boolean;
  duration?: number;          // Populated when video loads
}
```

---

> [!IMPORTANT]
> **Approve Stage 2?** — Review the folder traversal logic, session metadata schema, and ID strategy before I proceed to Stage 3 (Sessions UI Tree View).
