import { useState } from 'react'
import { useSessionStore } from '../../stores/sessionStore'
import type { FolderNode } from '../../types/session'
import './FolderTree.css'

export function FolderTree() {
    const { folderTree, selectedSessionPath, selectSession } = useSessionStore()

    if (!folderTree) return null

    // Debug log
    console.log('FolderTree rendering:', folderTree)

    // If root itself is a session
    if (folderTree.type === 'session') {
        return (
            <div className="folder-tree">
                <TreeNode
                    node={folderTree}
                    depth={0}
                    selectedPath={selectedSessionPath}
                    onSelect={selectSession}
                />
            </div>
        )
    }

    // If root has no children (empty folder with no sessions)
    if (!folderTree.children || folderTree.children.length === 0) {
        return (
            <div className="folder-tree">
                <div className="empty-tree-message">
                    <p>📭 No sessions found</p>
                    <p className="hint">Select a folder containing subfolders with .mp4 files</p>
                </div>
            </div>
        )
    }

    return (
        <div className="folder-tree">
            {folderTree.children.map(node => (
                <TreeNode
                    key={node.path}
                    node={node}
                    depth={0}
                    selectedPath={selectedSessionPath}
                    onSelect={selectSession}
                />
            ))}
        </div>
    )
}

interface TreeNodeProps {
    node: FolderNode
    depth: number
    selectedPath: string | null
    onSelect: (path: string) => void
}

function TreeNode({ node, depth, selectedPath, onSelect }: TreeNodeProps) {
    const [expanded, setExpanded] = useState(depth < 2)

    if (node.type === 'category') {
        return (
            <div className="tree-category">
                <div
                    className="tree-node category-node"
                    style={{ paddingLeft: depth * 16 + 8 }}
                    onClick={() => setExpanded(!expanded)}
                >
                    <span className={`expand-icon ${expanded ? 'expanded' : ''}`}>▶</span>
                    <span className="folder-icon">📁</span>
                    <span className="node-name">{node.name}</span>
                    {node.children && (
                        <span className="child-count">{node.children.length}</span>
                    )}
                </div>

                {expanded && node.children && (
                    <div className="category-children">
                        {node.children.map(child => (
                            <TreeNode
                                key={child.path}
                                node={child}
                                depth={depth + 1}
                                selectedPath={selectedPath}
                                onSelect={onSelect}
                            />
                        ))}
                    </div>
                )}
            </div>
        )
    }

    // Session node
    const isSelected = node.path === selectedPath
    const status = node.session?.status || 'untouched'
    const progress = node.session?.progress || 0

    return (
        <div
            className={`tree-node session-node ${isSelected ? 'selected' : ''} ${status}`}
            style={{ paddingLeft: depth * 16 + 8 }}
            onClick={() => onSelect(node.path)}
        >
            <StatusIcon status={status} />
            <span className="node-name">{node.name}</span>
            {status === 'started' && progress > 0 && (
                <span className="progress-badge">{progress}%</span>
            )}
        </div>
    )
}

function StatusIcon({ status }: { status: string }) {
    switch (status) {
        case 'completed':
            return <span className="status-icon completed">✓</span>
        case 'started':
            return <span className="status-icon started">◐</span>
        default:
            return <span className="status-icon untouched">○</span>
    }
}
