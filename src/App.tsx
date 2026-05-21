import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { MainPanel } from './components/MainPanel';
import { EditorPanel } from './components/EditorPanel';
import { Terminal } from './components/Terminal';
import { Film, Activity, Settings, Github, HelpCircle, UploadCloud } from 'lucide-react';
import axios from 'axios';
import { useStore } from './store/useStore';

export default function App() {
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState<'files' | 'editor' | 'preview'>('files');
  const { setFiles } = useStore();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files.length > 0) {
      const formData = new FormData();
      Array.from(e.dataTransfer.files).forEach((file: File) => {
        formData.append('files', file);
      });

      try {
        await axios.post('/api/upload', formData);
        const { data } = await axios.get('/api/files');
        setFiles(data.uploads, data.outputs);
      } catch (err) {
        console.error('Upload failed', err);
      }
    }
  };

  return (
    <div 
      className="h-screen w-screen bg-zinc-950 text-zinc-200 flex flex-col overflow-hidden font-sans relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-blue-600/10 backdrop-blur-sm border-4 border-dashed border-blue-500/50 flex flex-col items-center justify-center pointer-events-none">
          <div className="bg-zinc-950 p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-4">
            <UploadCloud size={64} className="text-blue-500 animate-bounce" />
            <p className="text-xl font-bold">Drop files here to upload</p>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="h-12 border-b border-white/5 flex items-center justify-between px-4 bg-zinc-950 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-blue-600 rounded flex items-center justify-center shadow-lg shadow-blue-600/20">
            <Film size={16} className="text-white" />
          </div>
          <span className="text-sm font-bold tracking-tight text-white hidden sm:block">FFMPEG <span className="text-blue-500">STUDIO</span></span>
        </div>

        {/* Mobile Tabs */}
        <div className="flex lg:hidden bg-zinc-900 rounded-lg p-1 border border-zinc-800">
           {(['files', 'preview', 'editor'] as const).map(tab => (
             <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${
                activeTab === tab ? 'bg-zinc-800 text-white' : 'text-zinc-500'
              }`}
             >
               {tab}
             </button>
           ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 bg-zinc-900 rounded-full px-2 py-0.5 border border-zinc-800">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
            <span className="text-[9px] font-bold text-zinc-400">READY</span>
          </div>
          <button className="p-1 text-zinc-500 hover:text-white transition-colors">
             <Settings size={16} />
          </button>
        </div>
      </header>

      {/* Build Content View */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* Desktop Sidebar (Left) */}
        <div className={`${activeTab === 'files' ? 'flex' : 'hidden'} lg:flex shrink-0`}>
          <Sidebar />
        </div>

        {/* Center Canvas */}
        <div className={`${activeTab === 'preview' ? 'flex' : 'hidden'} lg:flex flex-1 min-w-0`}>
          <MainPanel />
        </div>

        {/* Right Shell Panel */}
        <div className={`${activeTab === 'editor' ? 'flex' : 'hidden'} lg:flex shrink-0`}>
          <EditorPanel />
        </div>
      </div>

      {/* Footer Console */}
      <div className="h-48 sm:h-64 shrink-0">
        <Terminal />
      </div>
    </div>
  );
}
