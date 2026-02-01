import { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { PDFViewer } from '../../components/PDFViewer/PDFViewer'
import type { ImageAnnotation, Stroke } from '../../components/PDFViewer/types'
import { saveAnnotationsToPDF } from '../../utils/pdfSaver'
import { usePlayerStore } from '../../stores/playerStore'
import './PDFPage.css'

export function PDFPage() {
    const navigate = useNavigate()
    const { currentSession, closePlayer } = usePlayerStore()

    // Current PDF index and file
    const [currentPDFIndex, setCurrentPDFIndex] = useState(0)
    const [annotations, setAnnotations] = useState<Record<string, Record<number, Stroke[]>>>({})
    const [images, setImages] = useState<Record<string, Record<number, ImageAnnotation[]>>>({})
    const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null)
    const [pdfLoading, setPdfLoading] = useState(true)
    const [pdfError, setPdfError] = useState<string | null>(null)

    // Derived values
    const currentPDFFile = useMemo(() => {
        if (!currentSession || currentSession.pdfFiles.length === 0) return null
        return currentSession.pdfFiles[currentPDFIndex]
    }, [currentSession, currentPDFIndex])

    // Redirect if no session
    useEffect(() => {
        if (!currentSession) {
            navigate('/sessions')
        }
    }, [currentSession, navigate])

    // Load PDF file via IPC
    useEffect(() => {
        if (!currentSession || !currentPDFFile) return

        const pdfPath = currentSession.path + '/' + currentPDFFile

        setPdfLoading(true)
        setPdfError(null)
        setPdfData(null)

        window.api.readFile(pdfPath)
            .then(data => {
                setPdfData(data)
                setPdfLoading(false)
            })
            .catch(err => {
                console.error('Failed to load PDF:', err)
                setPdfError(err.message || 'Failed to load PDF')
                setPdfLoading(false)
            })
    }, [currentSession, currentPDFFile])

    // Handle save
    const handleSaveAnnotations = useCallback(async (
        pageAnnotations: Record<number, Stroke[]>,
        pageImages: Record<number, ImageAnnotation[]>,
        viewportWidth?: number
    ) => {
        if (!currentPDFFile || !currentSession || !pdfData) return

        // Update local state
        setAnnotations(prev => ({
            ...prev,
            [currentPDFFile]: pageAnnotations
        }))
        setImages(prev => ({
            ...prev,
            [currentPDFFile]: pageImages
        }))

        // Save to file
        try {
            console.log('Saving PDF...')
            const modifiedPdfBytes = await saveAnnotationsToPDF(pdfData, pageAnnotations, pageImages, viewportWidth)

            // Convert to ArrayBuffer
            const buffer = modifiedPdfBytes.buffer.slice(
                modifiedPdfBytes.byteOffset,
                modifiedPdfBytes.byteOffset + modifiedPdfBytes.byteLength
            ) as ArrayBuffer

            const pdfPath = currentSession.path + '/' + currentPDFFile
            await window.api.writeFile(pdfPath, buffer)

            console.log('PDF saved successfully to', pdfPath)
            // Optionally reload the data to ensure we have the latest version
            // But since we just wrote it, our local state is arguably "ahead" or "synced".
            // Ideally we'd show a toast notification here.
            alert('PDF saved successfully!')

        } catch (err) {
            console.error('Failed to save PDF:', err)
            alert('Failed to save PDF. Check console for details.')
        }
    }, [currentPDFFile, currentSession, pdfData])

    // Handle close
    const handleClose = () => {
        closePlayer()
        navigate('/sessions')
    }

    // Early returns for loading states
    if (!currentSession || currentSession.pdfFiles.length === 0) {
        return (
            <div className="pdf-page empty">
                <p>No PDF files in this session.</p>
                <button onClick={() => navigate('/sessions')}>Back to Sessions</button>
            </div>
        )
    }

    const sessionName = currentSession.customName || currentSession.path.split(/[/\\]/).pop()

    return (
        <div className="pdf-page">
            {/* Header */}
            <div className="pdf-page-header">
                <button className="back-btn" onClick={handleClose}>
                    ← Back to Sessions
                </button>
                <div className="header-info">
                    <h1>{sessionName}</h1>
                    <span className="pdf-indicator">
                        PDF {currentPDFIndex + 1} of {currentSession.pdfFiles.length}
                    </span>
                </div>
            </div>

            {/* Main Content */}
            <div className="pdf-page-content">
                {/* PDF Viewer */}
                <div className="pdf-viewer-container">
                    {pdfLoading && (
                        <div className="pdf-loading">Loading PDF...</div>
                    )}
                    {pdfError && (
                        <div className="pdf-error">Error: {pdfError}</div>
                    )}
                    {pdfData && currentPDFFile && (
                        <PDFViewer
                            data={pdfData}
                            title={currentPDFFile}
                            initialAnnotations={annotations[currentPDFFile] || {}}
                            initialImages={images[currentPDFFile] || {}}

                            onSave={(annotations, images, { pageWidth }) => handleSaveAnnotations(annotations, images, pageWidth)}
                        />
                    )}
                </div>

                {/* PDF Sidebar */}
                <div className="pdf-sidebar">
                    <h3>📄 PDFs</h3>
                    <div className="sidebar-list">
                        {currentSession.pdfFiles.map((pdf, index) => {
                            const isActive = index === currentPDFIndex

                            return (
                                <button
                                    key={pdf}
                                    className={`sidebar-item ${isActive ? 'active' : ''}`}
                                    onClick={() => setCurrentPDFIndex(index)}
                                >
                                    <span className="item-icon">📄</span>
                                    <span className="item-name">{pdf}</span>
                                </button>
                            )
                        })}
                    </div>

                    {/* Videos Link */}
                    {currentSession.videoFiles.length > 0 && (
                        <>
                            <h3>📼 Videos</h3>
                            <button
                                className="sidebar-item"
                                onClick={() => navigate('/player')}
                            >
                                <span className="item-icon">▶</span>
                                <span className="item-name">
                                    {currentSession.videoFiles.length} video(s)
                                </span>
                            </button>
                        </>
                    )}

                    {/* Shortcuts Help */}
                    <div className="shortcuts-help">
                        <h4>⌨️ PDF Shortcuts</h4>
                        <div className="shortcuts-grid">
                            <span><kbd>←/→</kbd> Page</span>
                            <span><kbd>P</kbd> Pen</span>
                            <span><kbd>H</kbd> Highlighter</span>
                            <span><kbd>E</kbd> Eraser</span>
                            <span><kbd>Ctrl+Z</kbd> Undo</span>
                            <span><kbd>Ctrl+S</kbd> Save</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
