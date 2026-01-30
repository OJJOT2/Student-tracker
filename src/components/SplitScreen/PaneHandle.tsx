import React from 'react'
import './PaneHandle.css'

interface PaneHandleProps {
    isVertical: boolean
    onDragStart: (e: React.PointerEvent) => void
}

export function PaneHandle({ isVertical, onDragStart }: PaneHandleProps) {
    return (
        <div
            className={`pane-handle ${isVertical ? 'vertical' : 'horizontal'}`}
            onPointerDown={onDragStart}
        >
            <div className="handle-bar" />
        </div>
    )
}
