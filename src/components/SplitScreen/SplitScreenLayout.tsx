import { useRef, useEffect, useCallback, useState } from 'react'
import { useLayoutStore, PaneType } from '../../stores/layoutStore'
import { PaneHandle } from './PaneHandle'
import { VideoPlayer } from '../VideoPlayer/VideoPlayer'
import { PDFViewer, ImageAnnotation, Stroke } from '../PDFViewer/PDFViewer'
import { FocusToggle } from '../FocusMode/FocusToggle'
import { usePlayerStore } from '../../stores/playerStore'
import { useSessionStore } from '../../stores/sessionStore'
import type { TimestampMark } from '../../types/session'
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
            <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 100 }}>
                <FocusToggle />
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
    const handleTimeUpdate = useCallback(async (currentTime: number, duration: number) => {
        if (!currentSession || !currentVideoFile) return

        // Save every 5s logic
        if (Math.floor(currentTime) % 5 === 0 && duration > 0) {
            const progress = currentSession.videos[currentVideoFile] || {
                watchTime: 0, lastPosition: 0, completed: false, playCount: 0
            }
            const isCompleted = currentTime / duration >= 0.9

            await updateSessionMetadata({
                videos: {
                    ...currentSession.videos,
                    [currentVideoFile]: {
                        ...progress,
                        lastPosition: currentTime,
                        completed: isCompleted || progress.completed
                    }
                }
            })
        }
    }, [currentSession, currentVideoFile, updateSessionMetadata])

    const handleEnded = useCallback(async () => {
        if (!currentSession || !currentVideoFile) return

        const progress = currentSession.videos[currentVideoFile] || {
            watchTime: 0, lastPosition: 0, completed: false, playCount: 0
        }

        await updateSessionMetadata({
            videos: {
                ...currentSession.videos,
                [currentVideoFile]: {
                    ...progress,
                    completed: true,
                    playCount: progress.playCount + 1,
                    lastPosition: 0
                }
            }
        })

        if (currentSession && currentVideoIndex < currentSession.videoFiles.length - 1) {
            playNext()
        }
    }, [currentSession, currentVideoFile, currentVideoIndex, updateSessionMetadata, playNext])

    const handleSaveMarks = useCallback(async () => {
        const { currentSession: session } = usePlayerStore.getState()
        if (session) {
            await updateSessionMetadata({ marks: session.marks })
        }
    }, [updateSessionMetadata])

    const handleProgress = useCallback(async (watchedTime: number) => {
        if (currentSession && watchedTime > 0) {
            await updateSessionMetadata({
                totalWatchTime: currentSession.totalWatchTime + watchedTime
            })
        }
    }, [currentSession, updateSessionMetadata])

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
