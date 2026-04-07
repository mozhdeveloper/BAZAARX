import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Download, Play, Pause, SkipBack, SkipForward,
  Volume2, VolumeX, Maximize, FileText,
} from 'lucide-react';

export interface MediaPreview {
  type: 'image' | 'video' | 'document';
  url: string;
  fileName?: string;
}

interface ChatMediaModalProps {
  media: MediaPreview | null;
  onClose: () => void;
}

const formatTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

export default function ChatMediaModal({ media, onClose }: ChatMediaModalProps) {
  // ─── Video state ───────────────────────────────────────────
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const pdfModalRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Track fullscreen state
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // Reset when media changes
  useEffect(() => {
    setIsPlaying(false);
    setVolume(1);
    setIsMuted(false);
    setProgress(0);
    setDuration(0);
  }, [media?.url]);

  // ─── Video controls ────────────────────────────────────────
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) videoRef.current.pause();
    else videoRef.current.play();
    setIsPlaying(!isPlaying);
  };
  const skip = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(videoRef.current.currentTime + seconds, duration));
  };
  const toggleMute = () => {
    if (!videoRef.current) return;
    const newMuted = !isMuted;
    videoRef.current.muted = newMuted;
    setIsMuted(newMuted);
    if (newMuted) {
      videoRef.current.volume = 0;
    } else {
      videoRef.current.volume = volume || 0.5;
      if (volume === 0) setVolume(0.5);
    }
  };
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const v = parseFloat(e.target.value);
    setVolume(v);
    videoRef.current.volume = v;
    videoRef.current.muted = v === 0;
    setIsMuted(v === 0);
  };
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const time = parseFloat(e.target.value);
    videoRef.current.currentTime = time;
    setProgress(time);
  };

  // ─── Filename helper ───────────────────────────────────────
  const getDisplayName = () => {
    if (media?.fileName) {
      const match = media.fileName.match(/^\d+_(.+)$/);
      return match ? match[1] : media.fileName;
    }
    return 'Document.pdf';
  };

  // ─── PDF fullscreen ────────────────────────────────────────
  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else if (pdfModalRef.current) {
      pdfModalRef.current.requestFullscreen();
    }
  };

  // ─── Download ──────────────────────────────────────────────
  const handleDownload = async () => {
    if (!media) return;
    try {
      const response = await fetch(media.url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = getDisplayName();
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(media.url, '_blank');
    }
  };

  if (!media) return null;

  return (
    <AnimatePresence>
      {media && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4"
          onClick={onClose}
        >
          {/* ─── IMAGE PREVIEW ──────────────────────── */}
          {media.type === 'image' && (
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: 'spring', duration: 0.35 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900">Image Preview</h3>
                <div className="flex items-center gap-1">
                  <button onClick={handleDownload} className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors" title="Download">
                    <Download className="w-4 h-4" />
                  </button>
                  <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-center p-4 bg-gray-50">
                <img
                  src={media.url}
                  alt="Preview"
                  className="max-w-full max-h-[70vh] object-contain rounded-lg"
                />
              </div>
            </motion.div>
          )}

          {/* ─── VIDEO PLAYER ──────────────────────── */}
          {media.type === 'video' && (
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: 'spring', duration: 0.35 }}
              className="relative bg-gray-950 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3 bg-gray-950/80 backdrop-blur-sm">
                <h3 className="text-sm font-semibold text-white/80">Video</h3>
                <div className="flex items-center gap-1">
                  <button onClick={handleDownload} className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors" title="Download">
                    <Download className="w-4 h-4" />
                  </button>
                  <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="relative cursor-pointer" onClick={togglePlay}>
                <video
                  ref={videoRef}
                  src={media.url}
                  className="w-full max-h-[65vh] object-contain bg-black"
                  onTimeUpdate={() => videoRef.current && setProgress(videoRef.current.currentTime)}
                  onLoadedMetadata={() => videoRef.current && setDuration(videoRef.current.duration)}
                  onEnded={() => setIsPlaying(false)}
                />
                {!isPlaying && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/30">
                      <Play className="w-7 h-7 text-white ml-1" fill="white" />
                    </div>
                  </div>
                )}
              </div>

              <div className="px-4 py-3 bg-gray-950 space-y-2">
                <input
                  type="range"
                  min={0}
                  max={duration || 0}
                  step={0.1}
                  value={progress}
                  onChange={handleSeek}
                  className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-orange-500
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
                    [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-orange-500"
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button onClick={() => skip(-10)} className="p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors" title="Back 10s">
                      <SkipBack className="w-4 h-4" />
                    </button>
                    <button onClick={togglePlay} className="p-2 rounded-full hover:bg-white/10 text-white transition-colors">
                      {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                    </button>
                    <button onClick={() => skip(10)} className="p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors" title="Forward 10s">
                      <SkipForward className="w-4 h-4" />
                    </button>
                    <button onClick={toggleMute} className="p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors ml-1">
                      {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="w-20 h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-orange-500
                        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5
                        [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-orange-500"
                    />
                  </div>
                  <span className="text-xs text-white/50 font-mono tabular-nums">
                    {formatTime(progress)} / {formatTime(duration)}
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* ─── PDF VIEWER (iframe) ──────────────── */}
          {media.type === 'document' && (
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: 'spring', duration: 0.35 }}
              ref={pdfModalRef}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col"
              style={{ height: '90vh' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 flex-shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <span className="text-sm font-semibold text-gray-900 truncate">{getDisplayName()}</span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={toggleFullscreen} className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors" title="Fullscreen">
                    <Maximize className="w-4 h-4" />
                  </button>
                  <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <iframe
                ref={iframeRef}
                src={`${media.url}#toolbar=1&navpanes=1&scrollbar=1`}
                className="flex-1 w-full border-0"
                title={getDisplayName()}
              />
              {/* Fullscreen header bar */}
              {isFullscreen && (
                <div className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-between px-5 py-3.5 bg-white border-b border-gray-200 shadow-md">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <span className="text-sm font-semibold text-gray-900 truncate">{getDisplayName()}</span>
                  </div>
                  <button
                    onClick={() => document.exitFullscreen()}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-full transition-colors flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                    Exit Fullscreen
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
