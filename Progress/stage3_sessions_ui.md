# Stage 3 — Sessions UI (Tree View)

## 📐 Sessions Tab Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [📁 Sessions]   [🎯 Focus]   [📊 Dashboard]               [⚙️ Settings]   │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐  ┌───────────────────────────────────────────────┐ │
│  │  📂 FOLDER TREE     │  │              SESSION PANEL                    │ │
│  │                     │  │                                               │ │
│  │  ▼ 📁 Mathematics   │  │  ┌─────────────────────────────────────────┐  │ │
│  │    ▼ 📁 Calculus    │  │  │  📹 Intro to Derivatives                │  │ │
│  │      ● Lecture 01 ✓ │  │  │                                         │  │ │
│  │      ○ Lecture 02   │  │  │  Status: 🟡 Started (2/3 parts)         │  │ │
│  │      ○ Lecture 03   │  │  │  ████████████░░░░░░░░ 67%               │  │ │
│  │    ▶ 📁 Algebra     │  │  │                                         │  │ │
│  │  ▶ 📁 Physics       │  │  │  Tags: [calculus] [exam-prep]           │  │ │
│  │  ▶ 📁 Chemistry     │  │  │                                         │  │ │
│  │                     │  │  │  📝 Description:                        │  │ │
│  ├─────────────────────┤  │  │  First lecture covering derivatives...  │  │ │
│  │  [📂 Change Folder] │  │  │                                         │  │ │
│  │  [🔄 Refresh]       │  │  │  ──────────────────────────────────     │  │ │
│  └─────────────────────┘  │  │                                         │  │ │
│                           │  │  📼 PLAYLIST                            │  │ │
│                           │  │  ┌─────────────────────────────────┐    │  │ │
│                           │  │  │ ✓ part1.mp4    30:45  ▶️        │    │  │ │
│                           │  │  │ ○ part2.mp4    28:12            │    │  │ │
│                           │  │  │ ○ part3.mp4    25:30            │    │  │ │
│                           │  │  └─────────────────────────────────┘    │  │ │
│                           │  │                                         │  │ │
│                           │  │  📄 ATTACHMENTS                         │  │ │
│                           │  │  [📄 summary.pdf]  [📄 notes.pdf]       │  │ │
│                           │  │                                         │  │ │
│                           │  │  [▶️ START SESSION]  [📝 Edit]          │  │ │
│                           │  └─────────────────────────────────────────┘  │ │
│                           └───────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🌲 FolderTree Component

### Component Structure
```tsx
// components/FolderTree/FolderTree.tsx
interface FolderTreeProps {
  rootNode: FolderNode;
  selectedId: string | null;
  onSelectSession: (sessionId: string) => void;
}

function FolderTree({ rootNode, selectedId, onSelectSession }: FolderTreeProps) {
  return (
    <div className="folder-tree">
      <TreeNode 
        node={rootNode} 
        depth={0}
        selectedId={selectedId}
        onSelect={onSelectSession}
      />
    </div>
  );
}
```

### TreeNode Component
```tsx
// components/FolderTree/TreeNode.tsx
interface TreeNodeProps {
  node: FolderNode;
  depth: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function TreeNode({ node, depth, selectedId, onSelect }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(depth < 2); // Auto-expand 2 levels
  
  if (node.type === 'category') {
    return (
      <div className="tree-node category">
        <div 
          className="node-header"
          style={{ paddingLeft: depth * 16 }}
          onClick={() => setExpanded(!expanded)}
        >
          <span className="expand-icon">{expanded ? '▼' : '▶'}</span>
          <span className="folder-icon">📁</span>
          <span className="node-name">{node.name}</span>
        </div>
        {expanded && (
          <div className="node-children">
            {node.children?.map(child => (
              <TreeNode key={child.path} node={child} depth={depth + 1} ... />
            ))}
          </div>
        )}
      </div>
    );
  }
  
  // Session node
  const session = node.session!;
  const isSelected = session.id === selectedId;
  
  return (
    <div 
      className={`tree-node session ${isSelected ? 'selected' : ''}`}
      style={{ paddingLeft: depth * 16 }}
      onClick={() => onSelect(session.id)}
    >
      <StatusIcon status={session.status} />
      <span className="node-name">{node.name}</span>
      {session.progress > 0 && session.progress < 100 && (
        <ProgressBadge value={session.progress} />
      )}
    </div>
  );
}
```

### Status Icons
| Status | Icon | Color |
|--------|------|-------|
| `untouched` | ○ | Gray |
| `started` | ◐ | Yellow |
| `completed` | ● | Green ✓ |

---

## 🎴 SessionCard Component

```tsx
// components/SessionCard/SessionCard.tsx
interface SessionCardProps {
  session: Session;
  onStartSession: () => void;
  onEditSession: () => void;
}

function SessionCard({ session, onStartSession, onEditSession }: SessionCardProps) {
  return (
    <div className="session-card">
      {/* Header */}
      <div className="session-header">
        <h2>{session.name}</h2>
        <StatusBadge status={session.status} />
      </div>
      
      {/* Progress Bar */}
      <ProgressBar 
        value={session.progress} 
        label={`${session.videos.filter(v => v.completed).length}/${session.videos.length} parts`}
      />
      
      {/* Tags */}
      <TagList tags={session.tags} />
      
      {/* Description */}
      <p className="description">{session.description || 'No description'}</p>
      
      {/* Playlist */}
      <Playlist 
        videos={session.videos}
        onPlayVideo={(videoPath) => handlePlayVideo(videoPath)}
      />
      
      {/* PDFs */}
      <Attachments pdfs={session.pdfs} />
      
      {/* Actions */}
      <div className="actions">
        <button className="primary" onClick={onStartSession}>
          ▶️ Start Session
        </button>
        <button className="secondary" onClick={onEditSession}>
          📝 Edit
        </button>
      </div>
    </div>
  );
}
```

### Playlist Sub-component
```tsx
function Playlist({ videos, onPlayVideo }: PlaylistProps) {
  return (
    <div className="playlist">
      <h3>📼 Playlist</h3>
      {videos.map((video, index) => (
        <div 
          key={video.filename}
          className={`playlist-item ${video.completed ? 'completed' : ''}`}
        >
          <span className="status">
            {video.completed ? '✓' : index + 1}
          </span>
          <span className="filename">{video.filename}</span>
          <span className="duration">{formatDuration(video.duration)}</span>
          <button onClick={() => onPlayVideo(video.path)}>▶️</button>
        </div>
      ))}
    </div>
  );
}
```

---

## 🎮 Session Selection Behavior

### Selection Flow
```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ User clicks      │────▶│ sessionStore     │────▶│ SessionCard      │
│ tree node        │     │ .selectSession() │     │ renders          │
└──────────────────┘     └──────────────────┘     └──────────────────┘
                                 │
                                 ▼
                         ┌──────────────────┐
                         │ Load full        │
                         │ session.meta.json│
                         └──────────────────┘
```

### Keyboard Navigation
| Key | Action |
|-----|--------|
| `↑` / `↓` | Navigate between nodes |
| `Enter` | Select session / Toggle folder |
| `←` | Collapse folder |
| `→` | Expand folder |
| `Home` | Go to first node |
| `End` | Go to last node |

### State Updates on Selection
```typescript
// stores/sessionStore.ts
selectSession: async (sessionId: string) => {
  const session = findSessionById(get().folderTree, sessionId);
  if (!session) return;
  
  // Load full metadata from disk
  const metadata = await window.api.loadSessionMetadata(session.path);
  
  // Update last accessed
  metadata.lastAccessedAt = new Date().toISOString();
  await window.api.saveSessionMetadata(session.path, metadata);
  
  set({ selectedSession: { ...session, ...metadata } });
}
```

---

## 🧩 Component Hierarchy

```
SessionsPage
├── Sidebar
│   ├── FolderTree
│   │   └── TreeNode (recursive)
│   │       ├── CategoryNode
│   │       └── SessionNode
│   │           └── ProgressBadge
│   └── SidebarActions
│       ├── ChangeFolderButton
│       └── RefreshButton
│
└── MainPanel
    ├── EmptyState (no session selected)
    └── SessionCard
        ├── SessionHeader
        ├── ProgressBar
        ├── TagList
        ├── Description
        ├── Playlist
        │   └── PlaylistItem
        ├── Attachments
        └── ActionButtons
```

---

## 📱 Responsive Behavior

| Viewport | Sidebar | Main Panel |
|----------|---------|------------|
| Large (≥1200px) | 280px fixed | Flexible |
| Medium (768-1199px) | 240px fixed | Flexible |
| Small (<768px) | Collapsible overlay | Full width |

---

> [!IMPORTANT]
> **Approve Stage 3?** — Review the Sessions UI layout, tree navigation, and session selection behavior before I proceed to Stage 4 (Session Metadata System).
