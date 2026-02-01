/// <reference types="vite/client" />

interface Window {
    api: {
        selectDirectory: () => Promise<string | null>
        scanDirectory: (path: string) => Promise<import('./types/session').FolderNode>
        loadSessionMetadata: (sessionPath: string) => Promise<import('./types/session').SessionMetadata | null>
        saveSessionMetadata: (sessionPath: string, metadata: import('./types/session').SessionMetadata) => Promise<boolean>
        getMediaPath: (filePath: string) => Promise<string>
        readFile: (filePath: string) => Promise<ArrayBuffer>
        writeFile: (filePath: string, data: ArrayBuffer) => Promise<boolean>
        setFocusMode: (enabled: boolean) => Promise<boolean>
    }
}
