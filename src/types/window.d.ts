// Extend the Window interface with our API
import { SessionMetadata, FolderNode } from '../../electron/preload' // We can't import from electron/preload easily in renderer if not compliant.
// Better to redefine or import types if shared.
// For now, let's redefine the API shape to match what we implemented.

export interface Api {
    selectDirectory: () => Promise<string | null>
    scanDirectory: (path: string, deepScan?: boolean) => Promise<any> // FolderNode
    loadSessionMetadata: (sessionPath: string) => Promise<any> // SessionMetadata
    saveSessionMetadata: (sessionPath: string, metadata: any) => Promise<boolean>
    getMediaPath: (filePath: string) => Promise<string>
    readFile: (filePath: string) => Promise<ArrayBuffer>
    writeFile: (filePath: string, data: ArrayBuffer) => Promise<boolean>
    setFocusMode: (enabled: boolean) => Promise<boolean>
    createDirectory: (path: string) => Promise<boolean>
}

declare global {
    interface Window {
        api: Api
    }
}
