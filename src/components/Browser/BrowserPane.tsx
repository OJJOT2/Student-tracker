import { useRef, useState } from 'react'
import './BrowserPane.css'

export function BrowserPane() {
    const webviewRef = useRef<any>(null)
    const [url, setUrl] = useState('https://www.google.com')
    const [inputUrl, setInputUrl] = useState('https://www.google.com')
    const [isLoading, setIsLoading] = useState(false)
    const [canGoBack, setCanGoBack] = useState(false)
    const [canGoForward, setCanGoForward] = useState(false)

    const handleNavigate = () => {
        let targetUrl = inputUrl
        if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
            targetUrl = 'https://' + targetUrl
        }
        setUrl(targetUrl)
        if (webviewRef.current) {
            webviewRef.current.loadURL(targetUrl)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleNavigate()
        }
    }

    const onDidStartLoading = () => setIsLoading(true)
    const onDidStopLoading = () => {
        setIsLoading(false)
        if (webviewRef.current) {
            setCanGoBack(webviewRef.current.canGoBack())
            setCanGoForward(webviewRef.current.canGoForward())
            setInputUrl(webviewRef.current.getURL())
        }
    }

    return (
        <div className="browser-pane">
            <div className="browser-toolbar">
                <button
                    disabled={!canGoBack}
                    onClick={() => webviewRef.current?.goBack()}
                    className="browser-btn"
                >
                    ←
                </button>
                <button
                    disabled={!canGoForward}
                    onClick={() => webviewRef.current?.goForward()}
                    className="browser-btn"
                >
                    →
                </button>
                <button
                    onClick={() => webviewRef.current?.reload()}
                    className="browser-btn"
                >
                    ↻
                </button>

                <input
                    className="browser-input"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={(e) => e.target.select()}
                />
            </div>

            <div className="webview-container">
                <webview
                    ref={webviewRef}
                    src={url}
                    className="webview-element"
                    onDidStartLoading={onDidStartLoading}
                    onDidStopLoading={onDidStopLoading}
                    allowpopups={true}
                    // @ts-ignore
                    useragent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                />
                {isLoading && <div className="browser-loading-bar" />}
            </div>
        </div>
    )
}
