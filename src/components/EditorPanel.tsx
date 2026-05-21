import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { useStore } from '../store/useStore';
import { Play, Square, Save, Clipboard, History, Zap, Sparkles } from 'lucide-react';
import axios from 'axios';

const PRESETS = [
  { name: 'Compress (720p)', cmd: 'ffmpeg -i uploads/input.mp4 -vf "scale=1280:720" -vcodec libx264 -crf 28 outputs/compressed.mp4' },
  { name: 'Resize to 1080p', cmd: 'ffmpeg -i uploads/input.mp4 -vf "scale=1920:1080" outputs/1080p.mp4' },
  { name: 'Extract MP3 Audio', cmd: 'ffmpeg -i uploads/input.mp4 -vn -acodec libmp3lame outputs/audio.mp3' },
  { name: 'Create High-Quality GIF', cmd: 'ffmpeg -i uploads/input.mp4 -vf "fps=15,scale=480:-1:flags=lanczos" outputs/animation.gif' },
  { name: 'Instant Thumbnail', cmd: 'ffmpeg -i uploads/input.mp4 -ss 00:00:01 -vframes 1 outputs/thumb.jpg' },
  { name: 'Extract Frame at 10s', cmd: 'ffmpeg -i uploads/input.mp4 -ss 00:00:10 -vframes 1 outputs/frame_10s.jpg' },
  { name: 'Remove Audio', cmd: 'ffmpeg -i uploads/input.mp4 -an outputs/no_audio.mp4' },
  { name: 'Convert to WebM', cmd: 'ffmpeg -i uploads/input.mp4 -c:v libvpx-vp9 -crf 30 -b:v 0 outputs/output.webm' },
];

export const EditorPanel: React.FC = () => {
  const { command, setCommand, isProcessing, setIsProcessing, sessionId, addLog } = useStore();
  const [history, setHistory] = useState<string[]>([]);

  const handleRun = async () => {
    if (!command.trim() || isProcessing) return;
    
    setIsProcessing(true);
    addLog({ type: 'system', message: `Initializing process for command: ${command}` });
    
    if (!history.includes(command)) {
      setHistory(prev => [command, ...prev].slice(0, 10));
    }

    try {
      await axios.post('/api/execute', { command, sessionId });
    } catch (err: any) {
      addLog({ type: 'error', message: err.response?.data?.error || 'Failed to execute command' });
      setIsProcessing(false);
    }
  };

  const handleStop = async () => {
    try {
      await axios.post('/api/stop', { sessionId });
      setIsProcessing(false);
      addLog({ type: 'system', message: 'Process termination requested by user' });
    } catch (err) {
      console.error('Stop failed', err);
    }
  };

  const applyPreset = (cmd: string) => {
    const { selectedFile } = useStore.getState();
    let finalCmd = cmd;
    if (selectedFile && selectedFile.category === 'uploads') {
      finalCmd = cmd.replace(/uploads\/input\.mp4/g, `uploads/${selectedFile.name}`);
    }
    setCommand(finalCmd);
  };

  return (
    <div className="w-full lg:w-96 flex flex-col bg-zinc-950 lg:border-l border-zinc-800">
      <div className="h-12 border-b border-zinc-800 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
           <Zap size={16} className="text-yellow-500 fill-yellow-500" />
           <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Terminal Shell</span>
        </div>
        <div className="flex gap-2">
          {isProcessing ? (
            <button 
              onClick={handleStop}
              className="px-3 py-1 bg-red-600/20 hover:bg-red-600 text-red-500 hover:text-white transition-all rounded-md flex items-center gap-1.5 text-xs font-medium"
            >
              <Square size={12} fill="currentColor" /> Stop
            </button>
          ) : (
            <button 
              onClick={handleRun}
              className="px-3 py-1 bg-blue-600 text-white hover:bg-blue-500 transition-colors rounded-md flex items-center gap-1.5 text-xs font-medium shadow-lg shadow-blue-500/20"
            >
              <Play size={12} fill="currentColor" /> Run
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        {/* Editor */}
        <div className="flex-1 relative border-b border-zinc-800">
          <Editor
            height="100%"
            defaultLanguage="shell"
            theme="vs-dark"
            value={command}
            onChange={(val) => setCommand(val || '')}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              fontFamily: "'JetBrains Mono', monospace",
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              padding: { top: 16 },
              backgroundColor: "#09090b",
            }}
          />
        </div>

        {/* Presets & History */}
        <div className="p-4 bg-zinc-900/50 flex flex-col h-1/2 min-h-[300px]">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={12} className="text-zinc-500" />
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Presets</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin scrollbar-thumb-zinc-800">
            <div className="grid grid-cols-1 gap-1">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  onClick={() => applyPreset(p.cmd)}
                  className="group flex flex-col w-full text-left p-2 bg-zinc-950/40 border border-zinc-800/50 hover:bg-zinc-800/50 hover:border-zinc-700/50 rounded transition-all"
                >
                  <span className="text-[10px] font-bold text-zinc-400 group-hover:text-blue-400 transition-colors">{p.name}</span>
                  <span className="text-[9px] text-zinc-600 truncate mt-0.5">{p.cmd}</span>
                </button>
              ))}
            </div>

            {history.length > 0 && (
              <div className="space-y-1">
                <label className="block text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-2">History</label>
                <div className="grid grid-cols-1 gap-1">
                  {history.map((cmd, i) => (
                    <button
                      key={i}
                      onClick={() => setCommand(cmd)}
                      className="w-full text-left px-2 py-1.5 text-[10px] text-zinc-500 bg-zinc-950/20 border border-transparent hover:border-zinc-800/50 hover:text-zinc-400 rounded transition-all truncate flex items-center gap-2"
                    >
                      <History size={10} className="shrink-0 opacity-50" />
                      <span className="truncate">{cmd}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
