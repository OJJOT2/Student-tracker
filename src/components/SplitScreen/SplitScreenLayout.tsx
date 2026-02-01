import { useRef, useEffect, useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLayoutStore, PaneType } from '../../stores/layoutStore'
import { PaneHandle } from './PaneHandle'
import { VideoPlayer } from '../VideoPlayer/VideoPlayer'
import { PDFViewer } from '../PDFViewer/PDFViewer'
import type { ImageAnnotation, Stroke } from '../PDFViewer/types'
import { FocusToggle } from '../FocusMode/FocusToggle'
import { usePlayerStore } from '../../stores/playerStore'
import { useSessionStore } from '../../stores/sessionStore'

import './SplitScreen.css'

export function SplitScreenLayout() {
    const {
        splitRatio,
        leftPane,
        rightPane,
        isVertical,
        setSplitRatio
    } = useLayoutStore()

    const containerRef = useRef<HTMLDivElement>(null)
    const isDragging = useRef(false)
    const navigate = useNavigate()

    const handlePointerDown = (e: React.PointerEvent) => {
        isDragging.current = true
        e.currentTarget.setPointerCapture(e.pointerId)
        document.body.style.cursor = isVertical ? 'row-resize' : 'col-resize'
        document.body.style.userSelect = 'none'
    }

    const handlePointerMove = useCallback((e: PointerEvent) => {
        if (!isDragging.current || !containerRef.current) return

        const rect = containerRef.current.getBoundingClientRect()
        let newRatio: number

        if (isVertical) {
            const relativeY = e.clientY - rect.top
            newRatio = (relativeY / rect.height) * 100
        } else {
            const relativeX = e.clientX - rect.left
            newRatio = (relativeX / rect.width) * 100
        }

        setSplitRatio(newRatio)
    }, [isVertical, setSplitRatio])

    const handlePointerUp = useCallback(() => {
        isDragging.current = false
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
    }, [])

    useEffect(() => {
        document.addEventListener('pointermove', handlePointerMove)
        document.addEventListener('pointerup', handlePointerUp)
        return () => {
            document.removeEventListener('pointermove', handlePointerMove)
            document.removeEventListener('pointerup', handlePointerUp)
        }
    }, [handlePointerMove, handlePointerUp])

    // Render logic for different panes
    const renderContent = (type: PaneType) => {
        switch (type) {
            case 'video':
                return <VideoPane />
            case 'pdf':
                return <PDFPane />
            case 'notes':
                return <div className="pane-placeholder">Notes Component (Coming Soon)</div>
            case 'browser':
                return <div className="pane-placeholder">Browser Component (Coming Soon)</div>
            default:
                return <div className="pane-empty">Empty Pane</div>
        }
    }

    return (
        <div
            ref={containerRef}
            className={`split-screen-container ${isVertical ? 'vertical' : 'horizontal'}`}
        >
            <div className="split-screen-controls" style={{ position: 'absolute', top: 10, right: 10, zIndex: 100, display: 'flex', gap: '8px' }}>
                <FocusToggle />
                <button
                    className="close-split-btn"
                    onClick={() => navigate('/dashboard')}
                    title="Close Split View"
                    style={{
                        background: 'rgba(0,0,0,0.5)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        color: 'white',
                        width: '32px',
                        height: '32px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    ✕
                </button>
            </div>

            <div
                className="pane left-pane"
                style={{ flexBasis: `${splitRatio}%` }}
            >
                {renderContent(leftPane)}
            </div>

            <PaneHandle
                isVertical={isVertical}
                onDragStart={handlePointerDown}
            />

            <div
                className="pane right-pane"
                style={{ flexBasis: `${100 - splitRatio}%` }}
            >
                {renderContent(rightPane)}
            </div>
        </div>
    )
}

function VideoPane() {
    const {
        currentSession,
        currentVideoFile,
        marks,
        playNext,
        addMark,
        updateMark,
        deleteMark,
        currentVideoIndex
    } = usePlayerStore()

    const { updateSessionMetadata } = useSessionStore()

    // Derived state
    const [videoPath, setVideoPath] = useState('')

    useEffect(() => {
        if (currentSession && currentVideoFile) {
            setVideoPath(`media://${encodeURIComponent(currentSession.path + '/' + currentVideoFile)}`)
        }
    }, [currentSession, currentVideoFile])

    // Handlers (Simplified from PlayerPage)
    // Handlers
    const lastSaveTime = useRef(0)

    // Sync playerStore with sessionStore updates to avoid stale state
    useEffect(() => {
        const unsub = useSessionStore.subscribe((state) => {
            if (state.selectedSession && state.selectedSession.id === currentSession?.id) {
                // If sessionStore updated, we might want to sync playerStore?
                // Actually, let's just make sure we save correct data.
            }
        })
        return unsub
    }, [currentSession])

    const handleTimeUpdate = useCallback(async (currentTime: number, duration: number) => {
        if (!currentSession || !currentVideoFile) return

        // 1. Update PlayerStore local state immediately (so UI/logic reflects reality)
        const progress = currentSession.videos[currentVideoFile] || {
            watchTime: 0, lastPosition: 0, completed: false, playCount: 0
        }

        // Calculate completion
        const isCompleted = currentTime / duration >= 0.9
        const newCompleted = isCompleted || progress.completed

        // Optimize: Only dispatch if meaningful change? 
        // For lastPosition, it changes every tick.
        // We probably don't want to re-render everything every 250ms if we can avoid it.
        // But we need `currentSession` to be fresh for the NEXT save calculation.

        // 2. Persist to Disk (Throttle: every 5 seconds)
        const now = Date.now()
        if (now - lastSaveTime.current > 5000 && duration > 0) {
            lastSaveTime.current = now

            // Use functional update or get fresh state if possible, but here we invoke store action
            // We use the LATEST known accumulated data from local state if we were tracking it, 
            // but for 'lastPosition' simple override is fine.

            await updateSessionMetadata({
                videos: {
                    ...currentSession.videos,
                    [currentVideoFile]: {
                        ...progress,
                        lastPosition: currentTime,
                        completed: newCompleted
                    }
                },
                lastAccessedAt: new Date().toISOString()
            })

            // Also update player store locally so 'currentSession' reflects this save in next render
            // This prevents stale closures in other handlers
            usePlayerStore.getState().updateVideoProgress(currentVideoFile, {
                lastPosition: currentTime,
                completed: newCompleted
            })
        }
    }, [currentSession, currentVideoFile, updateSessionMetadata])

    const handleEnded = useCallback(async () => {
        if (!currentSession || !currentVideoFile) return

        // Update stores
        usePlayerStore.getState().updateVideoProgress(currentVideoFile, {
            completed: true,
            lastPosition: 0,
            playCount: (currentSession.videos[currentVideoFile]?.playCount || 0) + 1
        })

        await updateSessionMetadata({
            videos: {
                ...currentSession.videos,
                // Refetch fresh currentSession from playerStore to be safe? 
                // We just updated it above.
                [currentVideoFile]: {
                    ...currentSession.videos[currentVideoFile],
                    completed: true,
                    playCount: (currentSession.videos[currentVideoFile]?.playCount || 0) + 1,
                    lastPosition: 0
                }
            },
            lastAccessedAt: new Date().toISOString()
        })

        if (currentSession && currentVideoIndex < currentSession.videoFiles.length - 1) {
            playNext()
        }
    }, [currentSession, currentVideoFile, currentVideoIndex, updateSessionMetadata, playNext])

    const handleSaveMarks = useCallback(async () => {
        // Marks are stored in playerStore, need to sync to sessionStore
        const { currentSession: playerSession } = usePlayerStore.getState()
        if (playerSession) {
            await updateSessionMetadata({
                marks: playerSession.marks,
                lastAccessedAt: new Date().toISOString()
            })
        }
    }, [updateSessionMetadata])

    // Accumulate watch time
    const handleProgress = useCallback(async (watchedTime: number) => {
        // Get FRESH session from store to avoid stale closure (watchTime accumulation bug)
        const { selectedSession } = useSessionStore.getState()

        if (selectedSession && watchedTime > 0) {
            await updateSessionMetadata({
                totalWatchTime: (selectedSession.totalWatchTime || 0) + watchedTime
            })
        }
    }, [updateSessionMetadata])

    if (!currentSession || !currentVideoFile) {
        return <div className="pane-placeholder">No video selected</div>
    }

    return (
        <VideoPlayer
            src={videoPath}
            title={currentVideoFile}
            initialPosition={currentSession.videos[currentVideoFile]?.lastPosition || 0}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleEnded}
            onProgress={handleProgress}
            marks={marks}
            notes={currentSession.notes || ''}
            currentVideoFile={currentVideoFile}
            onAddMark={addMark}
            onUpdateMark={updateMark}
            onDeleteMark={deleteMark}
            onSaveMarks={handleSaveMarks}
        />
    )
}

interface PDFState {
    annotations: Record<string, Record<number, Stroke[]>>
    images: Record<string, Record<number, ImageAnnotation[]>>
}

function PDFPane() {
    const { currentSession } = usePlayerStore() // or sessionStore, but playerStore has currentSession too
    const [currentPDFIndex, setCurrentPDFIndex] = useState(0)
    const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null)
    const [pdfLoading, setPdfLoading] = useState(false)
    const [pdfError, setPdfError] = useState<string | null>(null)

    // Local state for annotations (could be moved to a store for persistence across views)
    const [pdfState, setPdfState] = useState<PDFState>({
        annotations: {},
        images: {}
    })

    const currentPDFFile = currentSession?.pdfFiles[currentPDFIndex]

    // Load PDF
    useEffect(() => {
        if (!currentSession || !currentPDFFile) return

        const loadPDF = async () => {
            setPdfLoading(true)
            setPdfError(null)
            try {
                const pdfPath = currentSession.path + '/' + currentPDFFile
                const data = await window.api.readFile(pdfPath)
                setPdfData(data)
            } catch (err: any) {
                console.error('Failed to load PDF:', err)
                setPdfError(err.message || 'Failed to load PDF')
            } finally {
                setPdfLoading(false)
            }
        }

        loadPDF()
    }, [currentSession, currentPDFFile])

    const handleSave = useCallback(async (
        pageAnnotations: Record<number, Stroke[]>,
        pageImages: Record<number, ImageAnnotation[]>,
        viewportWidth?: number
    ) => {
        if (!currentPDFFile || !currentSession || !pdfData) return

        // Update local state
        setPdfState(prev => ({
            annotations: { ...prev.annotations, [currentPDFFile]: pageAnnotations },
            images: { ...prev.images, [currentPDFFile]: pageImages }
        }))

        // Verify saveAnnotationsToPDF exists or import it. 
        // Since we can't easily import from 'pages' or 'utils' without knowing exact path structure relative to here:
        // Assuming utils/pdfSaver exists at ../../utils/pdfSaver

        try {
            // Dynamic import to avoid circular dependency issues if any, or just standard import at top
            const { saveAnnotationsToPDF } = await import('../../utils/pdfSaver')

            const modifiedPdfBytes = await saveAnnotationsToPDF(pdfData, pageAnnotations, pageImages, viewportWidth)
            const buffer = modifiedPdfBytes.buffer.slice(
                modifiedPdfBytes.byteOffset,
                modifiedPdfBytes.byteOffset + modifiedPdfBytes.byteLength
            ) as ArrayBuffer

            const pdfPath = currentSession.path + '/' + currentPDFFile
            await window.api.writeFile(pdfPath, buffer)
            console.log('PDF Saved')
        } catch (err) {
            console.error('Failed to save PDF', err)
        }
    }, [currentPDFFile, currentSession, pdfData])

    if (!currentSession || !currentSession.pdfFiles || currentSession.pdfFiles.length === 0) {
        return (
            <div className="pane-placeholder">
                <h3>No PDFs Found</h3>
                <p>This session has no PDF documents.</p>
            </div>
        )
    }

    return (
        <div className="pdf-pane">
            {/* Simple Toolbar for switching PDFs */}
            {currentSession.pdfFiles.length > 1 && (
                <div className="pdf-pane-toolbar">
                    <select
                        value={currentPDFIndex}
                        onChange={(e) => setCurrentPDFIndex(Number(e.target.value))}
                        className="pdf-select"
                    >
                        {currentSession.pdfFiles.map((file, i) => (
                            <option key={file} value={i}>{file}</option>
                        ))}
                    </select>
                </div>
            )}

            <div className="pdf-pane-content">
                {pdfLoading && <div className="pdf-loading">Loading...</div>}
                {pdfError && <div className="pdf-error">{pdfError}</div>}
                {!pdfLoading && !pdfError && pdfData && currentPDFFile && (
                    <PDFViewer
                        data={pdfData}
                        title={currentPDFFile}
                        initialAnnotations={pdfState.annotations[currentPDFFile] || {}}
                        initialImages={pdfState.images[currentPDFFile] || {}}
                        onSave={(a, i, opts) => handleSave(a, i, opts.pageWidth)}
                    />
                )}
            </div>
        </div>
    )
}
