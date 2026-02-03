import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { PDFViewer } from '../PDFViewer/PDFViewer'
import { VideoPlayer } from '../VideoPlayer/VideoPlayer'
import { FocusTimer as Timer } from '../FocusMode/FocusTimer'
import { FocusToggle } from '../FocusMode/FocusToggle'
import { usePlayerStore } from '../../stores/playerStore'
import { useSessionStore } from '../../stores/sessionStore'
import { NotesPane } from '../Notes/NotesPane'
import { BrowserPane } from '../Browser/BrowserPane'
import type { ImageAnnotation, Stroke } from '../PDFViewer/types'

import './SplitScreen.css'
import './PaneHandle.css'

export function SplitScreenLayout() {
    const navigate = useNavigate()
    const [leftWidth, setLeftWidth] = useState(50)
    const [isDragging, setIsDragging] = useState(false)
    const [activeTab, setActiveTab] = useState<'video' | 'pdf' | 'notes' | 'browser'>('video')

    // PDF State
    const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null)
    const [currentPDFFile, setCurrentPDFFile] = useState<string | null>(null)
    const [pdfLoading, setPdfLoading] = useState(false)
    const [pdfError, setPdfError] = useState<string | null>(null)

    // Local state for annotations
    const [pdfState, setPdfState] = useState<{
        annotations: Record<string, Record<number, Stroke[]>>
        images: Record<string, Record<number, ImageAnnotation[]>>
    }>({
        annotations: {},
        images: {}
    })

    const { currentSession } = usePlayerStore()
    const { selectedSession } = useSessionStore()

    // Load PDF Logic
    useEffect(() => {
        if (selectedSession && selectedSession.pdfFiles && selectedSession.pdfFiles.length > 0) {
            if (!currentPDFFile) {
                handleLoadPDF(selectedSession.pdfFiles[0])
            }
        }
    }, [selectedSession, currentPDFFile])

    const handleLoadPDF = async (fileName: string) => {
        if (!selectedSession) return

        setPdfLoading(true)
        setPdfError(null)
        try {
            const filePath = selectedSession.path + '/' + fileName
            const data = await window.api.readFile(filePath)
            setPdfData(data)
            setCurrentPDFFile(fileName)
        } catch (err: any) {
            console.error('Failed to load PDF:', err)
            setPdfError(err.message || 'Failed to load PDF')
        } finally {
            setPdfLoading(false)
        }
    }

    // Drag Logic
    const handleDragStart = (e: React.MouseEvent) => {
        setIsDragging(true)
        e.preventDefault()
    }

    const handleDrag = useCallback((e: MouseEvent) => {
        if (!isDragging) return

        const container = document.querySelector('.split-screen-container')
        if (!container) return

        const containerRect = container.getBoundingClientRect()
        const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100

        if (newWidth > 20 && newWidth < 80) {
            setLeftWidth(newWidth)
        }
    }, [isDragging])

    const handleDragEnd = useCallback(() => {
        setIsDragging(false)
    }, [])

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleDrag)
            window.addEventListener('mouseup', handleDragEnd)
        }
        return () => {
            window.removeEventListener('mousemove', handleDrag)
            window.removeEventListener('mouseup', handleDragEnd)
        }
    }, [isDragging, handleDrag, handleDragEnd])


    // PDF Save Logic
    const handleSavePDF = useCallback(async (
        pageAnnotations: Record<number, any>,
        pageImages: Record<number, any>,
        viewportWidth: number
    ) => {
        if (!currentPDFFile || !currentSession || !pdfData) return

        // Update local state
        setPdfState(prev => ({
            annotations: { ...prev.annotations, [currentPDFFile]: pageAnnotations },
            images: { ...prev.images, [currentPDFFile]: pageImages }
        }))

        try {
            console.log('Saving PDF...')
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

    const handleAddPage = useCallback(async (pageNumber: number) => {
        if (!currentPDFFile || !currentSession || !pdfData) return

        try {
            console.log(`Adding page after page ${pageNumber}...`)
            const { addPageToPDF } = await import('../../utils/pdfSaver')
            const newPdfBytes = await addPageToPDF(pdfData, pageNumber - 1)

            const filePath = currentSession.path + '/' + currentPDFFile
            const buffer = newPdfBytes.buffer.slice(newPdfBytes.byteOffset, newPdfBytes.byteOffset + newPdfBytes.byteLength) as ArrayBuffer

            await window.api.writeFile(filePath, buffer)

            const freshData = await window.api.readFile(filePath)
            setPdfData(freshData)

            console.log('Page added and saved.')
        } catch (error) {
            console.error('Failed to add page:', error)
        }
    }, [currentPDFFile, currentSession, pdfData])

    const renderContent = (type: 'left' | 'right') => {
        if (type === 'left') {
            return (
                <div className="pane item-pane" style={{ width: '100%', height: '100%' }}>
                    <VideoPane />
                </div>
            )
        }

        return (
            <div className="pane-content-wrapper" style={{ width: '100%', height: '100%', position: 'relative' }}>
                <div style={{ display: activeTab === 'video' ? 'block' : 'none', height: '100%' }}>
                    <div className="pane-placeholder">Secondary Video or Content</div>
                </div>

                <div style={{ display: activeTab === 'pdf' ? 'block' : 'none', height: '100%' }}>
                    <PDFPane
                        pdfData={pdfData}
                        currentFile={currentPDFFile}
                        onFileSelect={handleLoadPDF}
                        files={selectedSession?.pdfFiles || []}
                        onSave={handleSavePDF}
                        onAddPage={handleAddPage}
                        loading={pdfLoading}
                        error={pdfError}
                        initialAnnotations={currentPDFFile ? pdfState.annotations[currentPDFFile] : {}}
                        initialImages={currentPDFFile ? pdfState.images[currentPDFFile] : {}}
                    />
                </div>

                <div style={{ display: activeTab === 'notes' ? 'block' : 'none', height: '100%' }}>
                    <NotesPane />
                </div>

                <div style={{ display: activeTab === 'browser' ? 'block' : 'none', height: '100%' }}>
                    <BrowserPane />
                </div>
            </div>
        )
    }

    return (
        <div className="split-screen-layout">
            <div className="split-header">
                <div className="header-left">
                    <button className="back-btn" onClick={() => navigate('/sessions')}>
                        ← Back
                    </button>
                    <h2>{selectedSession?.customName || selectedSession?.path.split(/[/\\]/).pop() || 'Study Session'}</h2>
                </div>
                <div className="header-control-group">
                    <FocusToggle />
                    <Timer />
                </div>
                <div className="header-right">
                    <button
                        className="mode-btn"
                        onClick={() => navigate('/player')}
                        title="Switch to Standard Mode"
                    >
                        <span>📺</span> Standard
                    </button>
                    <div className="sep" style={{ width: 1, height: 20, background: 'var(--border-color)', margin: '0 8px' }} />
                    <div className="tab-switcher">
                        <button
                            className={activeTab === 'pdf' ? 'active' : ''}
                            onClick={() => setActiveTab('pdf')}
                        >
                            <span className="icon">📄</span> PDF
                        </button>
                        <button
                            className={activeTab === 'notes' ? 'active' : ''}
                            onClick={() => setActiveTab('notes')}
                        >
                            <span className="icon">📝</span> Notes
                        </button>
                        <button
                            className={activeTab === 'browser' ? 'active' : ''}
                            onClick={() => setActiveTab('browser')}
                        >
                            <span className="icon">🌐</span> Browser
                        </button>
                    </div>
                </div>
            </div>

            <div className="split-screen-container">
                <div className="pane left-pane" style={{ width: `${leftWidth}%` }}>
                    {renderContent('left')}
                </div>

                <div
                    className="pane-handle horizontal"
                    onMouseDown={handleDragStart}
                >
                    <div className="handle-bar" />
                </div>

                <div className="pane right-pane" style={{ width: `${100 - leftWidth}%` }}>
                    {renderContent('right')}
                </div>
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
    const [videoPath, setVideoPath] = useState('')
    const lastSaveTime = useRef(0)

    useEffect(() => {
        if (currentSession && currentVideoFile) {
            setVideoPath(`media://${encodeURIComponent(currentSession.path + '/' + currentVideoFile)}`)
        }
    }, [currentSession, currentVideoFile])

    const handleTimeUpdate = useCallback(async (currentTime: number, duration: number) => {
        if (!currentSession || !currentVideoFile) return

        const progress = currentSession.videos[currentVideoFile] || {
            watchTime: 0, lastPosition: 0, completed: false, playCount: 0
        }

        const isCompleted = currentTime / duration >= 0.9
        const newCompleted = isCompleted || progress.completed

        // Throttle saving (every 5 seconds)
        const now = Date.now()
        if (now - lastSaveTime.current > 5000 && duration > 0) {
            lastSaveTime.current = now

            await updateSessionMetadata({
                videos: {
                    ...currentSession.videos,
                    [currentVideoFile]: {
                        ...progress,
                        lastPosition: currentTime,
                        completed: newCompleted,
                        duration: duration // Save duration for progress calculation
                    }
                },
                lastAccessedAt: new Date().toISOString()
            })

            // Update local store too
            usePlayerStore.getState().updateVideoProgress(currentVideoFile, {
                lastPosition: currentTime,
                completed: newCompleted,
                duration: duration
            })
        }

    }, [currentSession, currentVideoFile, updateSessionMetadata])

    const handleEnded = useCallback(async () => {
        if (!currentSession || !currentVideoFile) return

        await updateSessionMetadata({
            videos: {
                ...currentSession.videos,
                [currentVideoFile]: {
                    ...currentSession.videos[currentVideoFile],
                    completed: true,
                    lastPosition: 0
                }
            }
        })

        // Mark store as completed
        usePlayerStore.getState().updateVideoProgress(currentVideoFile, {
            completed: true,
            lastPosition: 0
        })

        if (currentSession && currentVideoIndex < currentSession.videoFiles.length - 1) {
            playNext()
        }
    }, [currentSession, currentVideoFile, currentVideoIndex, updateSessionMetadata, playNext])

    const handleProgress = useCallback(async (watchedTime: number) => {
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
        />
    )
}

function PDFPane({
    pdfData, currentFile, onFileSelect, files, onSave, onAddPage,
    loading, error, initialAnnotations, initialImages
}: any) {
    if (!files || files.length === 0) {
        return (
            <div className="pane-placeholder">
                <h3>No PDFs Found</h3>
                <p>This session has no PDF documents.</p>
            </div>
        )
    }

    return (
        <div className="pdf-pane">
            {files.length > 1 && (
                <div className="pdf-selector">
                    <select
                        value={currentFile || ''}
                        onChange={(e) => onFileSelect(e.target.value)}
                    >
                        {files.map((f: string) => (
                            <option key={f} value={f}>{f}</option>
                        ))}
                    </select>
                </div>
            )}

            <div className="pdf-pane-content">
                {loading && <div className="loading">Loading PDF...</div>}
                {error && <div className="error">{error}</div>}
                {!loading && !error && pdfData ? (
                    <PDFViewer
                        data={pdfData}
                        title={currentFile}
                        initialAnnotations={initialAnnotations || {}}
                        initialImages={initialImages || {}}
                        onSave={(a, i, opts) => onSave(a, i, opts?.pageWidth)}
                        onAddPage={onAddPage}
                    />
                ) : (
                    !loading && <div className="loading">Select a PDF to view</div>
                )}
            </div>
        </div>
    )
}
