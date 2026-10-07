import React, { useRef, useState } from 'react';
import { 
  Sparkles, 
  RotateCcw, 
  RotateCw, 
  Upload, 
  Download, 
  Check, 
  ChevronDown, 
  X, 
  Save, 
  SlidersHorizontal,
  FolderOpen,
  FileImage,
  RefreshCw,
  HardDrive,
  Layers
} from 'lucide-react';
import { SAMPLE_IMAGES } from '../constants/samples';
import type { SampleImage } from '../constants/samples';
import type { ToolType } from '../types/studio';

interface NavbarProps {
  imageName: string;
  zoom: number;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onFitZoom: () => void;
  onImageUpload: (file: File) => void;
  onSelectSample: (sample: SampleImage) => void;
  onExport: (format: 'png' | 'jpeg' | 'pdf', transparentBackground: boolean) => void;
  onSaveProject: () => void;
  activeTool: ToolType;
  showToolOptions: boolean;
  onToggleToolOptions: () => void;
  onToolOptionsHostChange: (element: HTMLDivElement | null) => void;
  showSidebar?: boolean;
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  imageName,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onImageUpload,
  onSelectSample,
  onExport,
  onSaveProject,
  activeTool,
  showToolOptions,
  onToggleToolOptions,
  onToolOptionsHostChange,
  showSidebar,
  onToggleSidebar,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showFileMenu, setShowFileMenu] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<'png' | 'jpeg' | 'pdf'>('png');
  const [transparentBackground, setTransparentBackground] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImageUpload(e.target.files[0]);
    }
  };

  return (
    <header className="relative h-14 bg-zinc-950 border-b border-zinc-800 text-zinc-100 flex items-center justify-between px-3 select-none z-30 shadow-md">
      {/* Left Section: Brand Logo, File Menu, Undo/Redo */}
      <div className="flex items-center gap-3">
        {/* Brand */}
        <div className="flex items-center gap-2 pr-2 border-r border-zinc-800">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 via-indigo-500 to-fuchsia-500 flex items-center justify-center shadow-md shadow-indigo-500/20">
            <Sparkles className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="font-bold text-sm tracking-tight text-white hidden lg:inline-block">
            AI Creative Studio
          </span>
        </div>

        {/* File Dropdown Menu */}
        <div className="relative">
          <button
            onClick={() => setShowFileMenu(!showFileMenu)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-zinc-800 text-xs font-medium text-zinc-300 hover:text-white transition"
          >
            <FolderOpen className="w-3.5 h-3.5 text-indigo-400" />
            <span>File</span>
            <ChevronDown className="w-3 h-3 text-zinc-400" />
          </button>

          {showFileMenu && (
            <div 
              className="absolute top-full left-0 mt-1 w-56 bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl py-1.5 z-50 text-xs"
              onMouseLeave={() => setShowFileMenu(false)}
            >
              <button
                onClick={() => {
                  fileInputRef.current?.click();
                  setShowFileMenu(false);
                }}
                className="w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-zinc-800 text-zinc-200 transition"
              >
                <Upload className="w-3.5 h-3.5 text-indigo-400" />
                <span>Open Image File...</span>
              </button>

              <button
                onClick={() => {
                  onSaveProject();
                  setShowFileMenu(false);
                }}
                className="w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-zinc-800 text-zinc-200 transition"
              >
                <Save className="w-3.5 h-3.5 text-emerald-400" />
                <span>Save Project (.imagestudio)</span>
              </button>

              <button
                onClick={() => {
                  setShowExportModal(true);
                  setShowFileMenu(false);
                }}
                className="w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-zinc-800 text-zinc-200 transition"
              >
                <Download className="w-3.5 h-3.5 text-fuchsia-400" />
                <span>Export Image / Document...</span>
              </button>

              <div className="h-px bg-zinc-800 my-1" />

              <div className="px-3 py-1 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                Sample Presets
              </div>
              {SAMPLE_IMAGES.map((sample) => (
                <button
                  key={sample.id}
                  onClick={() => {
                    onSelectSample(sample);
                    setShowFileMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-zinc-800 text-zinc-300 transition"
                >
                  <div className="flex items-center gap-2 truncate">
                    <img src={sample.url} alt={sample.name} className="w-4 h-4 rounded object-cover" />
                    <span className="truncate">{sample.name}</span>
                  </div>
                  {sample.name === imageName && <Check className="w-3 h-3 text-indigo-400 shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Undo / Redo */}
        <div className="flex items-center gap-1 bg-zinc-900 px-1 py-0.5 rounded-lg border border-zinc-800">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
            className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent transition"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Center Section: Document Title */}
      <div className="flex items-center gap-2 bg-zinc-900/80 px-3 py-1 rounded-lg border border-zinc-800 max-w-[280px] sm:max-w-[400px]">
        <FileImage className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
        <span className="text-xs font-semibold text-zinc-200 truncate">
          AI Creative Studio - {imageName || 'Untitled Project'}
        </span>
        <span className="hidden md:inline-flex items-center gap-1 text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20 shrink-0">
          <HardDrive className="w-2.5 h-2.5" /> Saved
        </span>
      </div>

      {/* Right Section: Tool options toggle & Canva Export button */}
      <div className="flex items-center gap-2">
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept="image/*" 
          className="hidden" 
        />

        {/* Active Tool Options Toggle */}
        <button
          type="button"
          aria-expanded={showToolOptions}
          aria-controls="active-tool-options-content"
          onClick={onToggleToolOptions}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
            showToolOptions 
              ? 'border-indigo-500/60 bg-indigo-500/20 text-white ring-1 ring-indigo-500/30 shadow-sm' 
              : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white'
          }`}
          title="Toggle tool controls panel"
        >
          <SlidersHorizontal className="h-3.5 w-3.5 text-indigo-400" />
          <span className="hidden sm:inline">Tool Options</span>
          <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${showToolOptions ? 'rotate-180' : ''}`} />
        </button>

        {/* Layers & Inspector Drawer Toggle Button */}
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
              showSidebar 
                ? 'border-indigo-500/60 bg-indigo-500/20 text-white ring-1 ring-indigo-500/30 shadow-sm' 
                : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white'
            }`}
            title="Toggle Layers & Inspector Sidebar"
          >
            <Layers className="h-3.5 w-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Layers</span>
          </button>
        )}

        {/* Canva-style Prominent Share & Export Button */}
        <button
          onClick={() => setShowExportModal(true)}
          className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 rounded-lg shadow-lg shadow-indigo-600/25 transition transform active:scale-95"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export</span>
        </button>
      </div>

      {/* Tool Options Slide-down Panel Host */}
      <div
        className={`fixed right-4 top-16 bottom-4 z-[55] w-[280px] max-w-[calc(100vw-2rem)] flex flex-col overflow-hidden rounded-2xl border border-zinc-800/90 bg-zinc-950/95 shadow-2xl backdrop-blur-xl transition-all duration-200 ${
          showToolOptions ? 'translate-x-0 opacity-100' : 'pointer-events-none translate-x-6 opacity-0'
        }`}
      >
        <div className="flex items-center justify-between border-b border-zinc-800/80 px-4 py-3 bg-zinc-900/60 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </div>
            <span className="font-semibold text-xs text-white">Tool Options</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-indigo-500/10 px-2 py-0.5 text-[11px] font-mono text-indigo-300 border border-indigo-500/20 capitalize">
              {activeTool === 'eyedropper' ? 'Eyedropper' : activeTool}
            </span>
            <button
              type="button"
              onClick={onToggleToolOptions}
              className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              title="Close panel"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div ref={onToolOptionsHostChange} id="active-tool-options-content" className="flex-1 overflow-y-auto p-4" />
      </div>

      {/* Export Panel Modal */}
      {showExportModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md animate-in fade-in duration-200"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowExportModal(false);
          }}
        >
          <section 
            role="dialog" 
            aria-modal="true" 
            aria-labelledby="export-panel-title" 
            className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-zinc-100 shadow-2xl"
          >
            <div className="mb-4 flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <Download className="w-4 h-4" />
                </div>
                <h2 id="export-panel-title" className="text-sm font-semibold">Export Creative Design</h2>
              </div>
              <button 
                type="button" 
                onClick={() => setShowExportModal(false)} 
                aria-label="Close export panel" 
                className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-4 space-y-2">
              <label className="block text-xs font-medium text-zinc-300">File format</label>
              <div className="grid grid-cols-3 gap-2">
                {(['png', 'jpeg', 'pdf'] as const).map((format) => (
                  <button
                    key={format}
                    type="button"
                    onClick={() => {
                      setExportFormat(format);
                      if (format !== 'png') setTransparentBackground(false);
                    }}
                    aria-pressed={exportFormat === format}
                    className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                      exportFormat === format 
                        ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-500/50' 
                        : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
                    }`}
                  >
                    {format === 'jpeg' ? 'JPG' : format.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <label className={`mb-6 flex items-start gap-3 rounded-xl border border-zinc-800/80 p-3 transition ${
              exportFormat !== 'png' ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-zinc-900/80'
            }`}>
              <input
                type="checkbox"
                checked={transparentBackground}
                disabled={exportFormat !== 'png'}
                onChange={(e) => setTransparentBackground(e.target.checked)}
                className="mt-0.5 accent-indigo-500 rounded"
              />
              <div>
                <span className="block text-xs font-medium text-zinc-200">Transparent Background</span>
                <span className="mt-0.5 block text-[11px] leading-relaxed text-zinc-500">
                  {exportFormat !== 'png' 
                    ? `${exportFormat.toUpperCase()} format uses a standard solid background.` 
                    : 'Preserves empty canvas transparency for graphic design overlays.'}
                </span>
              </div>
            </label>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  onExport(exportFormat, exportFormat === 'png' && transparentBackground);
                  setShowExportModal(false);
                }}
                className="flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 transition transform active:scale-95 flex items-center justify-center gap-2"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download {exportFormat === 'jpeg' ? 'JPG' : exportFormat.toUpperCase()}</span>
              </button>
            </div>
          </section>
        </div>
      )}
    </header>
  );
};
