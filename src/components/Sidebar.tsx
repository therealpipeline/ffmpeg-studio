import React, { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { FileVideo, FileAudio, FileImage, File, RefreshCw, Trash2, Download, Upload, ChevronRight, ChevronDown } from 'lucide-react';
import axios from 'axios';

const renderFileIcon = (name: string) => {
  const ext = name.split('.').pop()?.toLowerCase();
  if (['mp4', 'mov', 'webm'].includes(ext || '')) return <FileVideo size={16} className="text-blue-400" />;
  if (['mp3', 'wav', 'ogg'].includes(ext || '')) return <FileAudio size={16} className="text-green-400" />;
  if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) return <FileImage size={16} className="text-purple-400" />;
  return <File size={16} className="text-gray-400" />;
};

const FileItem: React.FC<{ 
  item: any, 
  selectedFile: any, 
  onSelect: (item: any) => void,
  onDelete: (e: React.MouseEvent, cat: string, name: string) => void 
}> = ({ item, selectedFile, onSelect, onDelete }) => (
  <div
    onClick={() => onSelect(item)}
    className={`group flex items-center justify-between px-3 py-1.5 cursor-pointer rounded-md text-sm transition-colors ${
      selectedFile?.name === item.name ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
    }`}
  >
    <div className="flex items-center gap-2 truncate">
      {renderFileIcon(item.name)}
      <span className="truncate">{item.name}</span>
    </div>
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <a
        href={`/api/download/${item.category}/${item.name}`}
        download
        className="p-1 hover:text-white"
        onClick={e => e.stopPropagation()}
      >
        <Download size={14} />
      </a>
      <button
        onClick={(e) => onDelete(e, item.category, item.name)}
        className="p-1 hover:text-red-400"
      >
        <Trash2 size={14} />
      </button>
    </div>
  </div>
);

export const Sidebar: React.FC = () => {
  const { uploads, outputs, setFiles, setSelectedFile, selectedFile } = useStore();
  const [isUploading, setIsUploading] = useState(false);
  const [expanded, setExpanded] = useState({ uploads: true, outputs: true });

  const fetchFiles = async () => {
    try {
      const { data } = await axios.get('/api/files');
      setFiles(data.uploads, data.outputs);
    } catch (err) {
       console.error('Failed to fetch files', err);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setIsUploading(true);
    const formData = new FormData();
    Array.from(e.target.files).forEach((file: File) => {
      formData.append('files', file);
    });

    try {
      await axios.post('/api/upload', formData);
      fetchFiles();
    } catch (err) {
      console.error('Upload failed', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, category: string, name: string) => {
    e.stopPropagation();
    if (!confirm(`Delete ${name}?`)) return;
    try {
      await axios.delete(`/api/file/${category}/${name}`);
      if (selectedFile?.name === name) setSelectedFile(null);
      fetchFiles();
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  return (
    <div className="w-full lg:w-64 flex flex-col bg-zinc-950 border-r border-zinc-800 h-full select-none">
      <div className="p-4 flex items-center justify-between border-b border-zinc-800">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Explorer</h2>
        <div className="flex gap-2">
          <button onClick={fetchFiles} className="p-1 hover:text-white transition-colors text-zinc-500">
            <RefreshCw size={14} />
          </button>
          <label className="p-1 hover:text-white transition-colors text-zinc-500 cursor-pointer">
            <Upload size={14} />
            <input type="file" multiple className="hidden" onChange={handleUpload} />
          </label>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 font-sans">
        {/* Uploads Section */}
        <div className="mb-4">
          <div 
            onClick={() => setExpanded(prev => ({ ...prev, uploads: !prev.uploads }))}
            className="flex items-center gap-1 px-2 py-1 cursor-pointer text-zinc-500 hover:text-zinc-300 transition-colors uppercase text-[10px] font-bold"
          >
            {expanded.uploads ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <span>Uploads</span>
          </div>
          {expanded.uploads && (
            <div className="mt-1">
              {uploads.map((file) => (
                <FileItem 
                  key={file.name} 
                  item={file} 
                  selectedFile={selectedFile}
                  onSelect={setSelectedFile}
                  onDelete={handleDelete}
                />
              ))}
              {uploads.length === 0 && (
                <div className="px-6 py-2 text-[11px] italic text-zinc-600">No uploads</div>
              )}
            </div>
          )}
        </div>

        {/* Outputs Section */}
        <div>
          <div 
            onClick={() => setExpanded(prev => ({ ...prev, outputs: !prev.outputs }))}
            className="flex items-center gap-1 px-2 py-1 cursor-pointer text-zinc-500 hover:text-zinc-300 transition-colors uppercase text-[10px] font-bold"
          >
            {expanded.outputs ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <span>Outputs</span>
          </div>
          {expanded.outputs && (
            <div className="mt-1">
              {outputs.map((file) => (
                <FileItem 
                  key={file.name} 
                  item={file} 
                  selectedFile={selectedFile}
                  onSelect={setSelectedFile}
                  onDelete={handleDelete}
                />
              ))}
              {outputs.length === 0 && (
                <div className="px-6 py-2 text-[11px] italic text-zinc-600">No output files</div>
              )}
            </div>
          )}
        </div>
      </div>

      {isUploading && (
        <div className="p-3 bg-zinc-900 border-t border-zinc-800">
          <div className="flex items-center justify-between text-xs text-blue-400 mb-1">
            <span>Uploading...</span>
          </div>
          <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 animate-pulse w-full"></div>
          </div>
        </div>
      )}
    </div>
  );
};
