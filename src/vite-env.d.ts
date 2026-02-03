/// <reference types="vite/client" />

interface Window {
    api: {
        selectDirectory: () => Promise<string | null>
        scanDirectory: (path: string, deepScan?: boolean) => Promise<import('./types/session').FolderNode>
        loadSessionMetadata: (sessionPath: string) => Promise<import('./types/session').SessionMetadata | null>
        saveSessionMetadata: (sessionPath: string, metadata: import('./types/session').SessionMetadata) => Promise<boolean>
        getMediaPath: (filePath: string) => Promise<string>
        readFile: (filePath: string) => Promise<ArrayBuffer>
        writeFile: (filePath: string, data: ArrayBuffer) => Promise<boolean>
        createDirectory: (path: string) => Promise<boolean>
        setFocusMode: (enabled: boolean) => Promise<boolean>
    }
}

declare namespace React {
    interface WebViewHTMLAttributes<T> extends HTMLAttributes<T> {
        onDidStartLoading?: () => void
        onDidStopLoading?: () => void
        allowpopups?: boolean
    }
}
