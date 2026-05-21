import { create } from 'zustand';

interface FileInfo {
  name: string;
  size: number;
  mtime: Date;
  category: 'uploads' | 'outputs';
  path: string;
}

interface LogEntry {
  type: 'stdout' | 'stderr' | 'error' | 'system';
  message: string;
  timestamp: number;
}

interface FFmpegStore {
  uploads: FileInfo[];
  outputs: FileInfo[];
  logs: LogEntry[];
  selectedFile: FileInfo | null;
  isProcessing: boolean;
  sessionId: string;
  command: string;
  
  setFiles: (uploads: FileInfo[], outputs: FileInfo[]) => void;
  addLog: (log: Omit<LogEntry, 'timestamp'>) => void;
  clearLogs: () => void;
  setSelectedFile: (file: FileInfo | null) => void;
  setIsProcessing: (val: boolean) => void;
  setCommand: (cmd: string) => void;
}

export const useStore = create<FFmpegStore>((set) => ({
  uploads: [],
  outputs: [],
  logs: [],
  selectedFile: null,
  isProcessing: false,
  sessionId: Math.random().toString(36).substring(7),
  command: 'ffmpeg -i uploads/input.mp4 -vf "scale=1280:720" outputs/output.mp4',

  setFiles: (uploads, outputs) => set({ uploads, outputs }),
  addLog: (log) => set((state) => ({ 
    logs: [...state.logs, { ...log, timestamp: Date.now() }].slice(-1000) 
  })),
  clearLogs: () => set({ logs: [] }),
  setSelectedFile: (file) => set((state) => {
    let nextCommand = state.command;
    // If selecting an uploaded file, automatically try to replace the input path in the current command
    if (file && file.category === 'uploads') {
      // Regex tries to find "uploads/ANYTHING_UNTIL_SPACE" or exactly "uploads/input.mp4"
      // If found, replaces with new file name
      const uploadPattern = /uploads\/[^\s'"]+/g;
      if (uploadPattern.test(nextCommand)) {
        nextCommand = nextCommand.replace(uploadPattern, `uploads/${file.name}`);
      }
    }
    return { selectedFile: file, command: nextCommand };
  }),
  setIsProcessing: (val) => set({ isProcessing: val }),
  setCommand: (command) => set({ command }),
}));
