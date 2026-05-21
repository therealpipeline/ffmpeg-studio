import React, { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { io } from 'socket.io-client';
import { Terminal as TerminalIcon, RotateCcw, Copy, ShieldCheck } from 'lucide-react';
import axios from 'axios';

export const Terminal: React.FC = () => {
  const { logs, addLog, clearLogs, sessionId, setIsProcessing, setFiles } = useStore();
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const socket = io();

    socket.on('connect', () => {
      socket.emit('join-session', sessionId);
    });

    socket.on('log', (data) => {
      addLog(data);
    });

    socket.on('process-ended', (data) => {
      addLog({ type: 'system', message: `Process exited with code ${data.code}` });
      setIsProcessing(false);
      
      // Auto refresh files on finish
      axios.get('/api/files').then(res => setFiles(res.data.uploads, res.data.outputs));
    });

    return () => {
      socket.disconnect();
    };
  }, [sessionId]);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  const copyLogs = () => {
    const text = logs.map(l => `[${l.type.toUpperCase()}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="h-full bg-black border-t border-zinc-900 flex flex-col font-mono">
      <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-950 border-b border-zinc-900">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-zinc-500">
            <TerminalIcon size={12} />
            <span className="text-[9px] font-bold uppercase tracking-widest">Console</span>
          </div>
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-500 text-[8px] font-bold border border-blue-500/20 hidden sm:flex">
            <ShieldCheck size={10} />
            SECURE
          </div>
        </div>
        <div className="flex gap-1">
          <button 
            onClick={copyLogs}
            className="p-1 hover:text-white transition-colors text-zinc-600 rounded flex items-center gap-1 text-[9px] uppercase font-bold"
          >
            <Copy size={10} /> Copy
          </button>
          <button 
            onClick={clearLogs}
            className="p-1 hover:text-white transition-colors text-zinc-600 rounded flex items-center gap-1 text-[9px] uppercase font-bold"
          >
            <RotateCcw size={10} /> Clear
          </button>
        </div>
      </div>

      <div 
        ref={terminalRef}
        className="flex-1 overflow-y-auto p-3 space-y-0.5 selection:bg-blue-500/30 text-[11px]"
      >
        {logs.length === 0 && (
          <div className="text-zinc-800 text-[10px] italic">Ready for command execution...</div>
        )}
        {logs.map((log, i) => (
          <div key={i} className="flex gap-2.5">
            <span className="text-zinc-700 shrink-0 select-none w-14">[{new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span>
            <span className={`break-all whitespace-pre-wrap leading-relaxed ${
              log.type === 'stderr' ? 'text-zinc-500 font-light' : 
              log.type === 'error' ? 'text-red-500/90 font-bold' : 
              log.type === 'system' ? 'text-blue-500/80' : 'text-zinc-300'
            }`}>
              {log.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
