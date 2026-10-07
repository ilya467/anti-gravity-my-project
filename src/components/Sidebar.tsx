import React, { useEffect, useState } from 'react';
import { 
  Sliders, 
  SlidersHorizontal,
  Sparkles, 
  RotateCw, 
  Layers, 
  RotateCcw, 
  FlipHorizontal, 
  FlipVertical, 
  Eye, 
  EyeOff, 
  Lock, 
  Unlock, 
  Plus, 
  RefreshCw,
  Sun,
  Contrast as ContrastIcon,
  Palette,
  Eye as BlurIcon,
  Pipette,
  Type
} from 'lucide-react';
import type { ImageAdjustments, ImageTransform, LayerItem, ToolType } from '../types/studio';
import { FILTER_PRESETS } from '../constants/samples';

interface SidebarProps {
  activeTool: ToolType;
  adjustments: ImageAdjustments;
  transform: ImageTransform;
  layers: LayerItem[];
  selectedPresetId: string;
  onUpdateAdjustments: (adjustments: ImageAdjustments) => void;
  onUpdateTransform: (transform: ImageTransform) => void;
  onApplyPreset: (presetId: string, adj: Partial<ImageAdjustments>) => void;
  onResetAdjustments: () => void;
  onToggleLayerVisibility: (id: string) => void;
  onToggleLayerLock: (id: string) => void;
  onAddLayer: () => void;
}

type TabType = 'adjust' | 'filters' | 'transform' | 'layers';

export const Sidebar: React.FC<SidebarProps> = ({
  activeTool,
  adjustments,
  transform,
  layers,
  selectedPresetId,
  onUpdateAdjustments,
  onUpdateTransform,
  onApplyPreset,
  onResetAdjustments,
  onToggleLayerVisibility,
  onToggleLayerLock,
  onAddLayer,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('adjust');
  const [selectedColor, setSelectedColor] = useState('#ffffff');
  const [hexInput, setHexInput] = useState('#FFFFFF');
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [eyedropperError, setEyedropperError] = useState('');

  useEffect(() => {
    const handleSelectedColor = (event: Event) => {
      const color = (event as CustomEvent<string>).detail;
      if (/^#[0-9a-f]{6}$/i.test(color)) {
        setSelectedColor(color);
        setHexInput(color.toUpperCase());
      }
    };
    window.addEventListener('image-studio:selected-color', handleSelectedColor);
    return () => window.removeEventListener('image-studio:selected-color', handleSelectedColor);
  }, []);

  useEffect(() => {
    const handleEyedropperError = (event: Event) => setEyedropperError((event as CustomEvent<string>).detail || '');
    window.addEventListener('image-studio:eyedropper-error', handleEyedropperError);
    return () => window.removeEventListener('image-studio:eyedropper-error', handleEyedropperError);
  }, []);

  const updateSelectedColor = (color: string) => {
    if (!/^#[0-9a-f]{6}$/i.test(color)) return;
    setSelectedColor(color);
    setHexInput(color.toUpperCase());
    window.dispatchEvent(new CustomEvent('image-studio:set-selected-color', { detail: color }));
  };

  const colorSwatches = [
    '#000000', '#ffffff', '#64748b', '#ef4444', '#f97316', '#f59e0b',
    '#eab308', '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4',
    '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
    '#ec4899', '#f43f5e', '#7c2d12', '#92400e', '#c2410c', '#fda4af',
  ];

  const handleSliderChange = (key: keyof ImageAdjustments, value: number) => {
    onUpdateAdjustments({
      ...adjustments,
      [key]: value,
    });
  };

  const handleRotate = (angle: number) => {
    const newRotation = (transform.rotation + angle + 360) % 360;
    onUpdateTransform({
      ...transform,
      rotation: newRotation,
    });
  };

  const handleFlip = (axis: 'horizontal' | 'vertical') => {
    if (axis === 'horizontal') {
      onUpdateTransform({
        ...transform,
        flipHorizontal: !transform.flipHorizontal,
      });
    } else {
      onUpdateTransform({
        ...transform,
        flipVertical: !transform.flipVertical,
      });
    }
  };

  return (
    <aside className="w-72 bg-zinc-950 border-l border-zinc-800 hidden xl:flex flex-col h-full text-zinc-200 select-none z-20 shadow-xl">
      {/* Sidebar Tabs */}
      <div className="flex items-center border-b border-zinc-800 bg-zinc-950/60 p-1 text-xs">
        <button
          onClick={() => setActiveTab('adjust')}
          className={`flex-1 py-2 flex items-center justify-center gap-1.5 rounded-md font-medium transition ${
            activeTab === 'adjust'
              ? 'bg-zinc-800 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Adjust</span>
        </button>

        <button
          onClick={() => setActiveTab('filters')}
          className={`flex-1 py-2 flex items-center justify-center gap-1.5 rounded-md font-medium transition ${
            activeTab === 'filters'
              ? 'bg-zinc-800 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Filters</span>
        </button>

        <button
          onClick={() => setActiveTab('transform')}
          className={`flex-1 py-2 flex items-center justify-center gap-1.5 rounded-md font-medium transition ${
            activeTab === 'transform'
              ? 'bg-zinc-800 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
          }`}
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Transform</span>
        </button>

        <button
          onClick={() => setActiveTab('layers')}
          className={`flex-1 py-2 flex items-center justify-center gap-1.5 rounded-md font-medium transition ${
            activeTab === 'layers'
              ? 'bg-zinc-800 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Layers</span>
        </button>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
        {/* Adjustments Tab */}
        {activeTab === 'adjust' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Lighting & Tone
              </span>
              <button
                onClick={onResetAdjustments}
                className="text-[11px] text-zinc-400 hover:text-indigo-400 flex items-center gap-1 transition"
                title="Reset all adjustments to defaults"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Reset All</span>
              </button>
            </div>

            {/* Opacity / Transparency */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="flex items-center gap-1.5 text-zinc-300">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" /> Opacity / Transparency
                </span>
                <span className="font-mono text-zinc-400">{adjustments.opacity ?? 100}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={adjustments.opacity ?? 100}
                onChange={(e) => handleSliderChange('opacity', Number(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400"
              />
            </div>

            {/* Brightness */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="flex items-center gap-1.5 text-zinc-300">
                  <Sun className="w-3.5 h-3.5 text-amber-400" /> Brightness
                </span>
                <span className="font-mono text-zinc-400">{adjustments.brightness}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="200"
                value={adjustments.brightness}
                onChange={(e) => handleSliderChange('brightness', Number(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400"
              />
            </div>

            {/* Contrast */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="flex items-center gap-1.5 text-zinc-300">
                  <ContrastIcon className="w-3.5 h-3.5 text-indigo-400" /> Contrast
                </span>
                <span className="font-mono text-zinc-400">{adjustments.contrast}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="200"
                value={adjustments.contrast}
                onChange={(e) => handleSliderChange('contrast', Number(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400"
              />
            </div>

            {/* Saturation */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="flex items-center gap-1.5 text-zinc-300">
                  <Palette className="w-3.5 h-3.5 text-pink-400" /> Saturation
                </span>
                <span className="font-mono text-zinc-400">{adjustments.saturation}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="200"
                value={adjustments.saturation}
                onChange={(e) => handleSliderChange('saturation', Number(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400"
              />
            </div>

            {/* Exposure */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-300">Exposure</span>
                <span className="font-mono text-zinc-400">
                  {adjustments.exposure > 0 ? `+${adjustments.exposure}` : adjustments.exposure}
                </span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                value={adjustments.exposure}
                onChange={(e) => handleSliderChange('exposure', Number(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400"
              />
            </div>

            <div className="h-px bg-zinc-800/80 my-2" />

            <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Effects & Color
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.dispatchEvent(new Event('image-studio:activate-eyedropper'))}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-200 transition hover:border-indigo-500 hover:bg-zinc-800"
                aria-label="Activate Eyedropper Tool"
              >
                <Pipette className="h-3.5 w-3.5 text-indigo-300" />
                Eyedropper
              </button>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsColorPickerOpen((open) => !open)}
                  className="h-9 w-9 rounded-lg border border-zinc-600 shadow-inner ring-1 ring-black/30"
                  style={{ backgroundColor: selectedColor }}
                />
                {isColorPickerOpen && (
                  <div className="absolute right-0 top-11 z-50 w-60 rounded-xl border border-zinc-700 bg-zinc-950 p-3 shadow-2xl">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-200">Choose Color</span>
                      <button type="button" onClick={() => setIsColorPickerOpen(false)} className="text-xs text-zinc-500 hover:text-white">×</button>
                    </div>
                    <div className="mb-3 flex items-center gap-2">
                      <input
                        value={hexInput}
                        onChange={(event) => {
                          const value = event.target.value;
                          setHexInput(value.toUpperCase());
                          if (/^#[0-9a-f]{6}$/i.test(value)) updateSelectedColor(value);
                        }}
                        className="min-w-0 flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 font-mono text-xs text-zinc-100 outline-none"
                        maxLength={7}
                      />
                      <input
                        type="color"
                        value={selectedColor}
                        onChange={(event) => updateSelectedColor(event.target.value)}
                        className="h-8 w-8 cursor-pointer rounded border border-zinc-700 bg-zinc-900 p-0.5"
                      />
                    </div>
                    <div className="grid grid-cols-8 gap-1.5">
                      {colorSwatches.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => updateSelectedColor(color)}
                          className={`h-5 w-5 rounded-md border transition ${selectedColor.toLowerCase() === color ? 'border-white ring-2 ring-indigo-400' : 'border-white/20'}`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            {eyedropperError && <p role="alert" className="text-[11px] text-red-300">{eyedropperError}</p>}

            {/* Blur */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="flex items-center gap-1.5 text-zinc-300">
                  <BlurIcon className="w-3.5 h-3.5 text-cyan-400" /> Blur (Global)
                </span>
                <span className="font-mono text-zinc-400">{adjustments.blur}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="20"
                value={adjustments.blur}
                onChange={(e) => handleSliderChange('blur', Number(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('image-studio:select-tool', { detail: 'blur' }))}
                className="w-full py-1.5 px-2 rounded-lg border border-indigo-500/40 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 font-medium text-[11px] transition flex items-center justify-center gap-1.5 mt-1"
              >
                <BlurIcon className="w-3.5 h-3.5" />
                <span>Selective Blur Brush</span>
              </button>
            </div>
          </div>
        )}

        {/* Filters Tab */}
        {activeTab === 'filters' && (
          <div className="space-y-4">
            <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Studio Presets
            </div>

            <div className="grid grid-cols-2 gap-2">
              {FILTER_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => onApplyPreset(preset.id, preset.adjustments)}
                  className={`flex flex-col items-center p-2.5 rounded-lg border text-left transition ${
                    selectedPresetId === preset.id
                      ? 'border-indigo-500 bg-indigo-500/15 text-white ring-1 ring-indigo-500/50'
                      : 'border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300'
                  }`}
                >
                  <div className="w-full h-14 rounded-md mb-1.5 bg-gradient-to-tr from-zinc-800 to-zinc-700 flex items-center justify-center font-mono text-[10px] text-zinc-400 overflow-hidden relative border border-zinc-700/50">
                    <span className="relative z-10 font-bold text-white drop-shadow">
                      {preset.thumbnail}
                    </span>
                  </div>
                  <span className="text-xs font-medium self-start">{preset.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Transform Tab */}
        {activeTab === 'transform' && (
          <div className="space-y-4">
            <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              Orientation & Flip
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleRotate(-90)}
                className="flex items-center justify-center gap-1.5 py-2 px-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-xs font-medium text-zinc-200 transition"
              >
                <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
                <span>-90°</span>
              </button>
              <button
                onClick={() => handleRotate(90)}
                className="flex items-center justify-center gap-1.5 py-2 px-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-xs font-medium text-zinc-200 transition"
              >
                <RotateCw className="w-3.5 h-3.5 text-indigo-400" />
                <span>+90°</span>
              </button>
              <button
                onClick={() => handleFlip('horizontal')}
                className={`flex items-center justify-center gap-1.5 py-2 px-2.5 border rounded-lg text-xs font-medium transition ${
                  transform.flipHorizontal
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                    : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-200'
                }`}
              >
                <FlipHorizontal className="w-3.5 h-3.5" />
                <span>Flip H</span>
              </button>
              <button
                onClick={() => handleFlip('vertical')}
                className={`flex items-center justify-center gap-1.5 py-2 px-2.5 border rounded-lg text-xs font-medium transition ${
                  transform.flipVertical
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                    : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-200'
                }`}
              >
                <FlipVertical className="w-3.5 h-3.5" />
                <span>Flip V</span>
              </button>
            </div>
          </div>
        )}

        {/* Layers Tab */}
        {activeTab === 'layers' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Layers ({layers.length})
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new Event('image-studio:create-text-layer'))}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition"
                  title="Add new text element to canvas"
                >
                  <Type className="w-3 h-3" />
                  <span>Add Text</span>
                </button>
                <button
                  type="button"
                  onClick={onAddLayer}
                  className="text-[11px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition"
                >
                  <Plus className="w-3 h-3" />
                  <span>Layer</span>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {layers.map((layer) => (
                <div
                  key={layer.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 transition"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <button
                      onClick={() => onToggleLayerVisibility(layer.id)}
                      className="text-zinc-400 hover:text-zinc-200 p-0.5"
                    >
                      {layer.visible ? (
                        <Eye className="w-3.5 h-3.5 text-indigo-400" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5 text-zinc-600" />
                      )}
                    </button>
                    <div className="flex flex-col">
                      <span className={`text-xs font-medium truncate ${!layer.visible ? 'line-through text-zinc-500' : 'text-zinc-200'}`}>
                        {layer.name}
                      </span>
                      <span className="text-[10px] text-zinc-500 capitalize">{layer.type}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => onToggleLayerLock(layer.id)}
                    className="text-zinc-500 hover:text-zinc-300 p-1"
                  >
                    {layer.locked ? (
                      <Lock className="w-3 h-3 text-amber-500" />
                    ) : (
                      <Unlock className="w-3 h-3" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
