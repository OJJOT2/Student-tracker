import { useRef, useState, useEffect } from 'react'

interface DrawingOverlayProps {
    onSave: (blob: Blob) => void
    onCancel: () => void
}

export function DrawingOverlay({ onSave, onCancel }: DrawingOverlayProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [isDrawing, setIsDrawing] = useState(false)
    const [color, setColor] = useState('#000000')
    const [size, setSize] = useState(2)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        // Set canvas size to match window
        const resize = () => {
            canvas.width = window.innerWidth
            canvas.height = window.innerHeight
        }
        resize()
        window.addEventListener('resize', resize)
        return () => window.removeEventListener('resize', resize)
    }, [])

    const startDrawing = (e: React.PointerEvent) => {
        setIsDrawing(true)
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        ctx.beginPath()
        ctx.moveTo(e.clientX, e.clientY)
        ctx.strokeStyle = color
        ctx.lineWidth = size
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
    }

    const draw = (e: React.PointerEvent) => {
        if (!isDrawing) return
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        ctx.lineTo(e.clientX, e.clientY)
        ctx.stroke()
    }

    const stopDrawing = () => {
        setIsDrawing(false)
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (ctx) ctx.closePath()
    }

    const handleSave = () => {
        const canvas = canvasRef.current
        if (!canvas) return

        // Create a new canvas to composite with white background
        const newCanvas = document.createElement('canvas')
        newCanvas.width = canvas.width
        newCanvas.height = canvas.height
        const newCtx = newCanvas.getContext('2d')
        if (!newCtx) return

        // Fill white
        newCtx.fillStyle = '#ffffff'
        newCtx.fillRect(0, 0, newCanvas.width, newCanvas.height)

        // Draw original canvas over
        newCtx.drawImage(canvas, 0, 0)

        newCanvas.toBlob((blob) => {
            if (blob) onSave(blob)
        }, 'image/png')
    }

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: 9999,
                cursor: 'crosshair',
                backgroundColor: 'rgba(0,0,0,0.1)' // Slight tint
            }}
        >
            <canvas
                ref={canvasRef}
                onPointerDown={startDrawing}
                onPointerMove={draw}
                onPointerUp={stopDrawing}
                onPointerLeave={stopDrawing}
                style={{ width: '100%', height: '100%' }}
            />

            {/* Toolbar */}
            <div style={{
                position: 'absolute',
                bottom: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: '#333',
                padding: '10px',
                borderRadius: '8px',
                display: 'flex',
                gap: '10px',
                boxShadow: '0 4px 10px rgba(0,0,0,0.5)'
            }}>
                <input
                    type="color"
                    value={color}
                    onChange={e => setColor(e.target.value)}
                    style={{ background: 'none', border: 'none', width: '30px', height: '30px', cursor: 'pointer' }}
                />
                <input
                    type="range"
                    min="1"
                    max="10"
                    value={size}
                    onChange={e => setSize(Number(e.target.value))}
                    style={{ width: '100px' }}
                />
                <button onClick={handleSave} className="toolbar-btn-sm" style={{ background: '#4CAF50', color: 'white' }}>✅ Save Note</button>
                <button onClick={onCancel} className="toolbar-btn-sm" style={{ background: '#f44336', color: 'white' }}>❌ Cancel</button>
            </div>
        </div>
    )
}
