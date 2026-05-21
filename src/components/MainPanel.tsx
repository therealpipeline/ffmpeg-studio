import React, { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { FileVideo, FileAudio, Info, Maximize2, Download, ExternalLink, HardDrive } from 'lucide-react';
import axios from 'axios';

export const MainPanel: React.FC = () => {
  const { selectedFile } = useStore();
  const [metadata, setMetadata] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedFile) {
      setLoading(true);
      axios.get(`/api/metadata/${selectedFile.category}/${selectedFile.name}`)
        .then(res => setMetadata(res.data))
        .catch(() => setMetadata(null))
        .finally(() => setLoading(false));
    } else {
      setMetadata(null);
    }
  }, [selectedFile]);

  if (!selectedFile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-zinc-900 overflow-hidden">
        <div className="text-zinc-700 mb-4 animate-bounce">
          <HardDrive size={64} strokeWidth={1} />
        </div>
        <h2 className="text-xl font-medium text-zinc-500">Pick a file to inspect</h2>
        <p className="text-zinc-600 text-sm mt-2">Upload media to the uploads folder to get started</p>
      </div>
    );
  }

  const ext = selectedFile.name.split('.').pop()?.toLowerCase();
  const isVideo = ['mp4', 'mov', 'webm'].includes(ext || '');
  const isAudio = ['mp3', 'wav', 'ogg'].includes(ext || '');
  const isImage = ['jpg', 'jpeg', 'png', 'gif'].includes(ext || '');

  return (
    <div className="flex-1 flex flex-col bg-zinc-900 border-r border-zinc-800 overflow-hidden">
      {/* Header */}
      <div className="h-12 border-b border-zinc-800 flex items-center justify-between px-4 bg-zinc-950/50">
        <div className="flex items-center gap-2 overflow-hidden">
          {isVideo ? <FileVideo size={18} className="text-blue-400" /> : <FileAudio size={18} className="text-green-400" />}
          <h1 className="text-sm font-medium text-zinc-300 truncate">{selectedFile.name}</h1>
        </div>
        <div className="flex gap-2">
          <a
            href={selectedFile.path}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 hover:bg-zinc-800 rounded-md text-zinc-400 transition-colors"
          >
            <ExternalLink size={16} />
          </a>
          <a
            href={`/api/download/${selectedFile.category}/${selectedFile.name}`}
            download
            className="p-1.5 hover:bg-zinc-800 rounded-md text-zinc-400 transition-colors"
          >
            <Download size={16} />
          </a>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* Preview Area */}
        <div className="aspect-video bg-black flex items-center justify-center relative group min-h-[300px]">
          {isVideo && (
            <video
              key={selectedFile.path}
              src={selectedFile.path}
              controls
              className="w-full h-full object-contain"
            />
          )}
          {isAudio && (
            <div className="flex flex-col items-center gap-6 w-full p-12">
              <div className="w-32 h-32 rounded-full bg-zinc-800 flex items-center justify-center animate-pulse">
                <FileAudio size={48} className="text-green-500" />
              </div>
              <audio
                key={selectedFile.path}
                src={selectedFile.path}
                controls
                className="w-full max-w-md h-10"
              />
            </div>
          )}
          {isImage && (
            <img
              src={selectedFile.path}
              alt="Preview"
              className="max-w-full max-h-full object-contain"
              referrerPolicy="no-referrer"
            />
          )}
          {!isVideo && !isAudio && !isImage && (
            <div className="text-zinc-600 flex flex-col items-center gap-2">
              <Info size={48} strokeWidth={1} />
              <p>Preview not available for this format</p>
            </div>
          )}
        </div>

        {/* Metadata Inspector */}
        <div className="p-6 flex-1">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Metadata Inspector</h3>
          </div>

          {loading ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-4 bg-zinc-800 rounded w-1/3"></div>
              <div className="h-4 bg-zinc-800 rounded w-1/2"></div>
              <div className="h-4 bg-zinc-800 rounded w-1/4"></div>
            </div>
          ) : metadata ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 font-mono">
              <section>
                <h4 className="text-[10px] text-zinc-600 mb-3 uppercase tracking-wider">Format</h4>
                <div className="space-y-2">
                  <MetaRow label="Encoding" value={metadata.format.format_long_name} />
                  <MetaRow label="Duration" value={`${parseFloat(metadata.format.duration).toFixed(2)}s`} />
                  <MetaRow label="Bitrate" value={`${(metadata.format.bit_rate / 1000).toFixed(0)} kbps`} />
                  <MetaRow label="Size" value={`${(metadata.format.size / (1024 * 1024)).toFixed(2)} MB`} />
                </div>
              </section>

              {metadata.streams.map((stream: any, idx: number) => (
                <section key={idx}>
                  <h4 className="text-[10px] text-zinc-600 mb-3 uppercase tracking-wider">
                    {stream.codec_type.toUpperCase()} Stream #{idx}
                  </h4>
                  <div className="space-y-2">
                    <MetaRow label="Codec" value={stream.codec_name} />
                    {stream.codec_type === 'video' && (
                       <>
                        <MetaRow label="Resolution" value={`${stream.width}x${stream.height}`} />
                        <MetaRow label="FPS" value={stream.r_frame_rate} />
                       </>
                    )}
                    {stream.codec_type === 'audio' && (
                       <>
                        <MetaRow label="Channels" value={stream.channels} />
                        <MetaRow label="Sample Rate" value={`${stream.sample_rate} Hz`} />
                       </>
                    )}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <p className="text-zinc-600 text-sm italic">Failed to load metadata</p>
          )}
        </div>
      </div>
    </div>
  );
};

const MetaRow = ({ label, value }: { label: string, value: string | number }) => (
  <div className="flex items-center justify-between text-[11px] py-1 border-b border-zinc-800/50">
    <span className="text-zinc-500">{label}</span>
    <span className="text-zinc-300 font-medium truncate ml-4 max-w-[200px]" title={String(value)}>{value || 'N/A'}</span>
  </div>
);
