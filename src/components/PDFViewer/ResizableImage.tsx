import { useState, useEffect } from 'react'

interface ResizableImageProps {
    id: string
    src: string
    x: number
    y: number
    width: number
    height: number
    scale: number
    isSelected: boolean
    onSelect: (id: string) => void
    onChange: (id: string, updates: { x: number; y: number; width: number; height: number }) => void
    pointerEvents?: 'auto' | 'none'
}

export function ResizableImage({
    id,
    src,
    x,
    y,
    width,
    height,
    scale,
    isSelected,
    onSelect,
    onChange,
    pointerEvents = 'auto'
}: ResizableImageProps) {
    const minSize = 20

    // Convert to screen coordinates
    const screenX = x * scale
    const screenY = y * scale
    const screenWidth = width * scale
    const screenHeight = height * scale

    // Drag state
    const [isDragging, setIsDragging] = useState(false)
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
    const [initialPos, setInitialPos] = useState({ x: 0, y: 0 })

    // Resize state
    const [resizingHandle, setResizingHandle] = useState<string | null>(null)
    const [resizeStart, setResizeStart] = useState({ x: 0, y: 0 })
    const [initialDims, setInitialDims] = useState({ x: 0, y: 0, w: 0, h: 0 })

    useEffect(() => {
        if (isDragging) {
            const handleMouseMove = (e: MouseEvent) => {
                const dx = (e.clientX - dragStart.x) / scale
                const dy = (e.clientY - dragStart.y) / scale

                onChange(id, {
                    x: initialPos.x + dx,
                    y: initialPos.y + dy,
                    width,
                    height
                })
            }

            const handleMouseUp = () => {
                setIsDragging(false)
            }

            document.addEventListener('mousemove', handleMouseMove)
            document.addEventListener('mouseup', handleMouseUp)
            return () => {
                document.removeEventListener('mousemove', handleMouseMove)
                document.removeEventListener('mouseup', handleMouseUp)
            }
        }
    }, [isDragging, dragStart, initialPos, id, scale, onChange, width, height])

    useEffect(() => {
        if (resizingHandle) {
            const handleMouseMove = (e: MouseEvent) => {
                const dx = (e.clientX - resizeStart.x) / scale
                const dy = (e.clientY - resizeStart.y) / scale

                let newX = initialDims.x
                let newY = initialDims.y
                let newW = initialDims.w
                let newH = initialDims.h

                // Keep aspect ratio if shift key pressed? (Optional)

                if (resizingHandle.includes('e')) newW = Math.max(minSize, initialDims.w + dx)
                if (resizingHandle.includes('w')) {
                    const maxDelta = initialDims.w - minSize
                    const actualDx = Math.min(dx, maxDelta)
                    newX = initialDims.x + actualDx
                    newW = initialDims.w - actualDx
                }
                if (resizingHandle.includes('s')) newH = Math.max(minSize, initialDims.h + dy)
                if (resizingHandle.includes('n')) {
                    const maxDelta = initialDims.h - minSize
                    const actualDy = Math.min(dy, maxDelta)
                    newY = initialDims.y + actualDy
                    newH = initialDims.h - actualDy
                }

                onChange(id, {
                    x: newX,
                    y: newY,
                    width: newW,
                    height: newH
                })
            }

            const handleMouseUp = () => {
                setResizingHandle(null)
            }

            document.addEventListener('mousemove', handleMouseMove)
            document.addEventListener('mouseup', handleMouseUp)
            return () => {
                document.removeEventListener('mousemove', handleMouseMove)
                document.removeEventListener('mouseup', handleMouseUp)
            }
        }
    }, [resizingHandle, resizeStart, initialDims, id, scale, onChange])

    const startDrag = (e: React.MouseEvent) => {
        e.stopPropagation()
        onSelect(id)
        setIsDragging(true)
        setDragStart({ x: e.clientX, y: e.clientY })
        setInitialPos({ x, y })
    }

    const startResize = (handle: string, e: React.MouseEvent) => {
        e.stopPropagation()
        setResizingHandle(handle)
        setResizeStart({ x: e.clientX, y: e.clientY })
        setInitialDims({ x, y, w: width, h: height })
    }

    return (
        <div
            className={`resizable-image ${isSelected ? 'selected' : ''}`}
            style={{
                position: 'absolute',
                left: screenX,
                top: screenY,
                width: screenWidth,
                height: screenHeight,
                cursor: isDragging ? 'grabbing' : 'grab',
                userSelect: 'none',
                pointerEvents
            }}
            onMouseDown={startDrag}
        >
            <img
                src={src}
                style={{ width: '100%', height: '100%', pointerEvents: 'none' }}
                draggable={false}
            />

            {isSelected && (
                <>
                    <div className="resize-border" />
                    {['nw', 'ne', 'sw', 'se'].map(handle => (
                        <div
                            key={handle}
                            className={`resize-handle ${handle}`}
                            onMouseDown={(e) => startResize(handle, e)}
                            style={{ cursor: `${handle}-resize` }}
                        />
                    ))}
                </>
            )}
        </div>
    )
}
