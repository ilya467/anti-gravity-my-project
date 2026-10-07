import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  Shapes, 
  Type, 
  UploadCloud, 
  Brush, 
  Sliders, 
  Layers, 
  Pointer, 
  Hand, 
  Crop, 
  Eraser, 
  Pipette, 
  Settings2, 
  HelpCircle,
  Plus,
  RotateCcw,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Sun,
  Contrast as ContrastIcon,
  Palette as PaletteIcon,
  Eye as BlurIcon,
  Sparkles,
  RefreshCw,
  ChevronLeft,
  Search
} from 'lucide-react';
import type { ImageAdjustments, ImageTransform, LayerItem, ToolType } from '../types/studio';
import { FILTER_PRESETS, SAMPLE_IMAGES } from '../constants/samples';

interface ToolPaletteProps {
  activeTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  selectedColor: string;
  isBaseImageSelected: boolean;
  onDeleteBaseImage: () => void;
  onSelectedColorChange: (color: string) => void;
  adjustments: ImageAdjustments;
  transform: ImageTransform;
  selectedPresetId: string;
  onUpdateAdjustments: (adjustments: ImageAdjustments) => void;
  onUpdateTransform: (transform: ImageTransform) => void;
  onApplyPreset: (presetId: string, adj: Partial<ImageAdjustments>) => void;
  onResetAdjustments: () => void;
  toolOptionsHost: HTMLElement | null;
  layers?: LayerItem[];
  onToggleLayerVisibility?: (id: string) => void;
  onToggleLayerLock?: (id: string) => void;
  onAddLayer?: () => void;
  onImageUpload?: (file: File) => void;
  onSelectSample?: (sample: (typeof SAMPLE_IMAGES)[0]) => void;
}

type CanvaTab = 'elements' | 'text' | 'uploads' | 'draw' | 'adjust' | 'layers';

const CANVA_TABS = [
  { id: 'elements' as CanvaTab, label: 'Elements', icon: Shapes, defaultTool: 'shapes' as ToolType },
  { id: 'text' as CanvaTab, label: 'Text', icon: Type, defaultTool: 'text' as ToolType },
  { id: 'uploads' as CanvaTab, label: 'Uploads', icon: UploadCloud, defaultTool: 'select' as ToolType },
  { id: 'draw' as CanvaTab, label: 'Draw', icon: Brush, defaultTool: 'brush' as ToolType },
  { id: 'adjust' as CanvaTab, label: 'Adjust', icon: Sliders, defaultTool: 'filters' as ToolType },
  { id: 'layers' as CanvaTab, label: 'Layers', icon: Layers, defaultTool: 'select' as ToolType },
];

const QUICK_TOOLS: { id: ToolType; name: string; icon: React.ElementType; shortcut: string }[] = [
  { id: 'select', name: 'Select & Transform', icon: Pointer, shortcut: 'V' },
  { id: 'pan', name: 'Pan Tool', icon: Hand, shortcut: 'H' },
  { id: 'crop', name: 'Crop Canvas', icon: Crop, shortcut: 'C' },
];

const BRUSH_SWATCHES = [
  '#000000', '#ffffff', '#64748b', '#ef4444', '#f97316', '#f59e0b',
  '#eab308', '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4',
  '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#7c2d12', '#92400e', '#c2410c', '#fda4af',
];

interface ElementDefinition {
  id: string;
  name: string;
  category: 'shapes' | 'lines';
  type: 'rectangle' | 'ellipse';
  filled: boolean;
  width: number;
  height: number;
  strokeWidth?: number;
}

const AVAILABLE_ELEMENTS: ElementDefinition[] = [
  {
    id: 'rect-outline',
    name: 'Rectangle (Outline)',
    category: 'shapes',
    type: 'rectangle',
    filled: false,
    width: 220,
    height: 150,
    strokeWidth: 4,
  },
  {
    id: 'rect-filled',
    name: 'Rectangle (Filled)',
    category: 'shapes',
    type: 'rectangle',
    filled: true,
    width: 220,
    height: 150,
    strokeWidth: 2,
  },
  {
    id: 'square-outline',
    name: 'Square (Outline)',
    category: 'shapes',
    type: 'rectangle',
    filled: false,
    width: 180,
    height: 180,
    strokeWidth: 4,
  },
  {
    id: 'square-filled',
    name: 'Square (Filled)',
    category: 'shapes',
    type: 'rectangle',
    filled: true,
    width: 180,
    height: 180,
    strokeWidth: 2,
  },
  {
    id: 'circle-outline',
    name: 'Circle (Outline)',
    category: 'shapes',
    type: 'ellipse',
    filled: false,
    width: 180,
    height: 180,
    strokeWidth: 4,
  },
  {
    id: 'circle-filled',
    name: 'Circle (Filled)',
    category: 'shapes',
    type: 'ellipse',
    filled: true,
    width: 180,
    height: 180,
    strokeWidth: 2,
  },
  {
    id: 'ellipse-outline',
    name: 'Ellipse (Outline)',
    category: 'shapes',
    type: 'ellipse',
    filled: false,
    width: 240,
    height: 140,
    strokeWidth: 4,
  },
  {
    id: 'ellipse-filled',
    name: 'Ellipse (Filled)',
    category: 'shapes',
    type: 'ellipse',
    filled: true,
    width: 240,
    height: 140,
    strokeWidth: 2,
  },
  {
    id: 'line-horizontal',
    name: 'Horizontal Line',
    category: 'lines',
    type: 'rectangle',
    filled: true,
    width: 260,
    height: 6,
    strokeWidth: 1,
  },
  {
    id: 'line-vertical',
    name: 'Vertical Line',
    category: 'lines',
    type: 'rectangle',
    filled: true,
    width: 6,
    height: 260,
    strokeWidth: 1,
  },
  {
    id: 'card-banner',
    name: 'Card Banner',
    category: 'shapes',
    type: 'rectangle',
    filled: true,
    width: 280,
    height: 110,
    strokeWidth: 2,
  },
  {
    id: 'frame-border',
    name: 'Frame Border',
    category: 'shapes',
    type: 'rectangle',
    filled: false,
    width: 210,
    height: 160,
    strokeWidth: 10,
  },
];

const renderElementPreview = (elem: ElementDefinition) => {
  if (elem.type === 'ellipse') {
    return (
      <svg className="w-10 h-10 text-indigo-400 mx-auto" viewBox="0 0 48 48">
        <ellipse
          cx="24"
          cy="24"
          rx={elem.width === elem.height ? 17 : 20}
          ry={elem.width === elem.height ? 17 : 12}
          fill={elem.filled ? 'currentColor' : 'transparent'}
          stroke="currentColor"
          strokeWidth={elem.strokeWidth ? Math.min(elem.strokeWidth, 5) : 3}
        />
      </svg>
    );
  }
  if (elem.category === 'lines') {
    return (
      <svg className="w-10 h-10 text-indigo-400 mx-auto" viewBox="0 0 48 48">
        {elem.width > elem.height ? (
          <line x1="6" y1="24" x2="42" y2="24" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        ) : (
          <line x1="24" y1="6" x2="24" y2="42" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        )}
      </svg>
    );
  }
  return (
    <svg className="w-10 h-10 text-indigo-400 mx-auto" viewBox="0 0 48 48">
      <rect
        x={elem.width === elem.height ? 8 : 5}
        y={elem.width === elem.height ? 8 : 12}
        width={elem.width === elem.height ? 32 : 38}
        height={elem.width === elem.height ? 32 : 24}
        rx={elem.id === 'card-banner' ? 4 : 2}
        fill={elem.filled ? 'currentColor' : 'transparent'}
        stroke="currentColor"
        strokeWidth={elem.strokeWidth ? Math.min(elem.strokeWidth, 5) : 3}
      />
    </svg>
  );
};

export const ToolPalette: React.FC<ToolPaletteProps> = ({
  activeTool,
  onSelectTool,
  selectedColor,
  isBaseImageSelected,
  onDeleteBaseImage,
  onSelectedColorChange,
  adjustments,
  transform,
  selectedPresetId,
  onUpdateAdjustments,
  onUpdateTransform,
  onApplyPreset,
  onResetAdjustments,
  toolOptionsHost,
  layers = [],
  onToggleLayerVisibility,
  onToggleLayerLock,
  onAddLayer,
  onImageUpload,
  onSelectSample,
}) => {
  const [activeTab, setActiveTab] = useState<CanvaTab | null>('uploads');
  const [openPanel, setOpenPanel] = useState<'settings' | 'help' | null>(null);

  // Tool specific options
  const [brushSize, setBrushSize] = useState(5);
  const [brushOpacity, setBrushOpacity] = useState(100);
  const [eraserSize, setEraserSize] = useState(32);
  const [eraserHardness, setEraserHardness] = useState(100);
  const [blurSize, setBlurSize] = useState(24);
  const [blurIntensity, setBlurIntensity] = useState(12);
  const [hasSelectedText, setHasSelectedText] = useState(false);
  const [textSettings, setTextSettings] = useState({ fontSize: 32, fontFamily: 'Arial', bold: false, italic: false, textAlign: 'left', color: '#000000' });
  const [textLayerLocked, setTextLayerLocked] = useState(false);
  const [shapeSettings, setShapeSettings] = useState({ type: 'rectangle', filled: false, strokeWidth: 4 });
  const [hasSelectedShape, setHasSelectedShape] = useState(false);
  const [shapeLayerLocked, setShapeLayerLocked] = useState(false);
  const [hasSelectedImageElement, setHasSelectedImageElement] = useState(false);
  const [imageElementLocked, setImageElementLocked] = useState(false);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [adjustTab, setAdjustTab] = useState<'lighting' | 'tone' | 'presets' | 'transform'>('lighting');
  const [elementCategory, setElementCategory] = useState<'all' | 'shapes' | 'lines'>('all');
  const [elementSearch, setElementSearch] = useState('');

  const adjustmentControls: { key: keyof ImageAdjustments; label: string; min: number; max: number; unit?: string }[] = [
    { key: 'opacity', label: 'Opacity / Transparency', min: 0, max: 100, unit: '%' },
    { key: 'brightness', label: 'Brightness', min: 0, max: 200, unit: '%' },
    { key: 'contrast', label: 'Contrast', min: 0, max: 200, unit: '%' },
    { key: 'saturation', label: 'Saturation', min: 0, max: 200, unit: '%' },
    { key: 'exposure', label: 'Exposure', min: -100, max: 100 },
    { key: 'blur', label: 'Blur', min: 0, max: 20, unit: 'px' },
    { key: 'hueRotate', label: 'Hue Shift', min: 0, max: 360, unit: '°' },
    { key: 'sepia', label: 'Sepia', min: 0, max: 100, unit: '%' },
    { key: 'grayscale', label: 'Grayscale', min: 0, max: 100, unit: '%' },
    { key: 'invert', label: 'Invert', min: 0, max: 100, unit: '%' },
  ];

  const updateToolOption = (tool: string, key: string, value: number | string | boolean) => {
    window.dispatchEvent(new CustomEvent('image-studio:tool-option', { detail: { tool, key, value } }));
  };

  const handleTabClick = (tab: CanvaTab) => {
    if (tab === 'uploads') {
      setActiveTab((current) => current === 'uploads' ? null : 'uploads');
      onSelectTool('select');
      return;
    }

    if (tab === 'elements') {
      setActiveTab((current) => current === 'elements' ? null : 'elements');
      onSelectTool('shapes');
      return;
    }

    if (tab === 'adjust' || tab === 'text' || tab === 'draw' || tab === 'layers') {
      setActiveTab(null);
      const targetTab = CANVA_TABS.find((t) => t.id === tab);
      if (targetTab) {
        onSelectTool(targetTab.defaultTool);
        if (tab === 'text') {
          window.dispatchEvent(new Event('image-studio:create-text-layer'));
        } else if (tab === 'layers') {
          setAdjustTab('transform');
        }
      }
      window.dispatchEvent(new Event('image-studio:show-tool-options'));
      return;
    }

    if (activeTab === tab) {
      setActiveTab(null);
    } else {
      setActiveTab(tab);
      const targetTab = CANVA_TABS.find((t) => t.id === tab);
      if (targetTab) {
        onSelectTool(targetTab.defaultTool);
      }
    }
  };

  useEffect(() => {
    const handleOpenUploads = () => {
      setActiveTab('uploads');
      onSelectTool('select');
    };
    window.addEventListener('image-studio:open-uploads', handleOpenUploads);
    return () => window.removeEventListener('image-studio:open-uploads', handleOpenUploads);
  }, [onSelectTool]);

  useEffect(() => {
    const handleOpenElements = () => {
      setActiveTab('elements');
      onSelectTool('shapes');
    };
    window.addEventListener('image-studio:open-elements', handleOpenElements);
    return () => window.removeEventListener('image-studio:open-elements', handleOpenElements);
  }, [onSelectTool]);

  useEffect(() => {
    if (
      activeTool === 'brush' ||
      activeTool === 'eraser' ||
      activeTool === 'eyedropper' ||
      activeTool === 'shapes' ||
      activeTool === 'text' ||
      activeTool === 'filters' ||
      activeTool === 'pan' ||
      activeTool === 'crop' ||
      activeTool === 'blur'
    ) {
      if (activeTab !== 'uploads' && activeTab !== 'elements') {
        setActiveTab(null);
      }
    }
    if (activeTool !== 'text' && activeTool !== 'select') {
      setHasSelectedText(false);
    }
    if (activeTool !== 'shapes' && activeTool !== 'select') {
      setHasSelectedShape(false);
    }
  }, [activeTool, activeTab]);

  useEffect(() => {
    const handleTextSettings = (event: Event) => {
      const settings = (event as CustomEvent<(typeof textSettings & { locked?: boolean }) | null>).detail;
      setHasSelectedText(Boolean(settings));
      setTextLayerLocked(Boolean(settings?.locked));
      if (settings) setTextSettings(settings);
    };
    window.addEventListener('image-studio:selected-text-settings', handleTextSettings);
    return () => window.removeEventListener('image-studio:selected-text-settings', handleTextSettings);
  }, []);

  useEffect(() => {
    const handleShapeSettings = (event: Event) => {
      const settings = (event as CustomEvent<(typeof shapeSettings & { locked?: boolean }) | null>).detail;
      setHasSelectedShape(Boolean(settings));
      setShapeLayerLocked(Boolean(settings?.locked));
      if (settings) setShapeSettings(settings);
    };
    window.addEventListener('image-studio:selected-shape-settings', handleShapeSettings);
    return () => window.removeEventListener('image-studio:selected-shape-settings', handleShapeSettings);
  }, []);

  useEffect(() => {
    const handleImageElementSettings = (event: Event) => {
      const settings = (event as CustomEvent<{ locked?: boolean; adjustments?: ImageAdjustments } | null>).detail;
      setHasSelectedImageElement(Boolean(settings));
      setImageElementLocked(Boolean(settings?.locked));
      if (settings?.adjustments) {
        onUpdateAdjustments({
          brightness: 100,
          contrast: 100,
          saturation: 100,
          exposure: 0,
          blur: 0,
          hueRotate: 0,
          sepia: 0,
          grayscale: 0,
          invert: 0,
          opacity: 100,
          ...settings.adjustments,
        });
      }
    };
    window.addEventListener('image-studio:selected-image-element-settings', handleImageElementSettings);
    return () => window.removeEventListener('image-studio:selected-image-element-settings', handleImageElementSettings);
  }, [onUpdateAdjustments]);

  const rotate = (angle: number) => onUpdateTransform({ ...transform, rotation: (transform.rotation + angle + 360) % 360 });
  const flip = (axis: 'horizontal' | 'vertical') => onUpdateTransform({
    ...transform,
    flipHorizontal: axis === 'horizontal' ? !transform.flipHorizontal : transform.flipHorizontal,
    flipVertical: axis === 'vertical' ? !transform.flipVertical : transform.flipVertical,
  });

  const handleAddElement = (elem: ElementDefinition) => {
    window.dispatchEvent(
      new CustomEvent('image-studio:create-shape', {
        detail: {
          type: elem.type,
          filled: elem.filled,
          width: elem.width,
          height: elem.height,
          strokeWidth: elem.strokeWidth,
          color: selectedColor,
        },
      })
    );
  };

  const handleDragStartElement = (e: React.DragEvent, elem: ElementDefinition) => {
    e.dataTransfer.setData(
      'application/x-shape',
      JSON.stringify({
        type: elem.type,
        filled: elem.filled,
        width: elem.width,
        height: elem.height,
        strokeWidth: elem.strokeWidth,
        color: selectedColor,
      })
    );
    e.dataTransfer.setData('text/plain', elem.name);
  };

  const filteredElements = AVAILABLE_ELEMENTS.filter((elem) => {
    const matchesCategory = elementCategory === 'all' || elem.category === elementCategory;
    const matchesSearch = !elementSearch || elem.name.toLowerCase().includes(elementSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex h-full select-none z-20">
      {/* Canva Primary Vertical Dock */}
      <aside className="w-18 bg-zinc-950 border-r border-zinc-800 flex flex-col items-center py-3 justify-between z-30">
        {/* Main Category Tabs */}
        <div className="flex flex-col items-center gap-2 w-full px-1.5">
          {CANVA_TABS.map((tab) => {
            const Icon = tab.icon;
            const isTabActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`w-full py-2.5 px-1 rounded-xl flex flex-col items-center gap-1 transition-all ${
                  isTabActive
                    ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/40 shadow-md'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'
                }`}
                aria-label={tab.label}
              >
                <Icon className="w-5 h-5 stroke-[1.8]" />
                <span className="text-[10px] font-medium tracking-tight">{tab.label}</span>
              </button>
            );
          })}

          <div className="h-px bg-zinc-800 w-8 my-1" />

          {/* Quick Selection Tools */}
          {QUICK_TOOLS.map((tool) => {
            const Icon = tool.icon;
            const isActive = activeTool === tool.id && !activeTab;

            return (
              <button
                key={tool.id}
                onClick={() => {
                  onSelectTool(tool.id);
                  setActiveTab(null);
                  setHasSelectedText(false);
                  setHasSelectedShape(false);
                  window.dispatchEvent(new Event('image-studio:show-tool-options'));
                }}
                className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80'
                }`}
                title={`${tool.name} (${tool.shortcut})`}
              >
                <Icon className="w-4 h-4 stroke-[1.8]" />
              </button>
            );
          })}
        </div>

        {/* Bottom Utility Icons */}
        <div className="flex flex-col items-center gap-2 w-full px-2 border-t border-zinc-900 pt-2">
          <button
            type="button"
            onClick={() => setOpenPanel((panel) => panel === 'settings' ? null : 'settings')}
            className="w-10 h-10 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 flex items-center justify-center transition"
            title="Studio Settings"
          >
            <Settings2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setOpenPanel((panel) => panel === 'help' ? null : 'help')}
            className="w-10 h-10 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 flex items-center justify-center transition"
            title="Shortcuts & Help"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Canva Slide-over Drawer Flyout */}
      {activeTab && (
        <aside className="w-80 bg-zinc-900 border-r border-zinc-800 flex flex-col h-full text-zinc-200 z-20 shadow-2xl animate-in slide-in-from-left duration-200">
          {/* Drawer Header */}
          <div className="h-12 border-b border-zinc-800/80 px-4 flex items-center justify-between bg-zinc-950/40">
            <span className="font-semibold text-xs text-white uppercase tracking-wider flex items-center gap-2">
              {activeTab === 'elements' && <Shapes className="w-4 h-4 text-indigo-400" />}
              {activeTab === 'uploads' && <UploadCloud className="w-4 h-4 text-indigo-400" />}
              <span>{activeTab === 'elements' ? 'Shapes & Elements' : activeTab}</span>
            </span>
            <button
              onClick={() => setActiveTab(null)}
              className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              title="Close panel"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Drawer Content Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {/* Elements Tab */}
            {activeTab === 'elements' && (
              <div className="space-y-4 text-xs">
                {/* Search & Category Filter */}
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="Search elements & shapes..."
                      value={elementSearch}
                      onChange={(e) => setElementSearch(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>

                  <div className="flex gap-1 bg-zinc-950/60 p-1 rounded-lg border border-zinc-800/80">
                    {(['all', 'shapes', 'lines'] as const).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setElementCategory(cat)}
                        className={`flex-1 py-1 rounded text-[11px] font-medium capitalize transition ${
                          elementCategory === cat
                            ? 'bg-zinc-800 text-white shadow-sm'
                            : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between text-zinc-400 text-[11px] px-0.5">
                  <span>Click or drag to canvas</span>
                  <span className="font-mono text-[10px] text-zinc-500">{filteredElements.length} items</span>
                </div>

                {/* Elements Grid */}
                <div className="grid grid-cols-2 gap-2.5">
                  {filteredElements.map((elem) => (
                    <button
                      key={elem.id}
                      type="button"
                      onClick={() => handleAddElement(elem)}
                      draggable="true"
                      onDragStart={(e) => handleDragStartElement(e, elem)}
                      className="group flex flex-col items-center p-3 rounded-xl border border-zinc-800 bg-zinc-950/60 hover:bg-zinc-900/80 hover:border-indigo-500/70 hover:shadow-lg transition text-center cursor-pointer select-none"
                      title={`Click or drag to add ${elem.name}`}
                    >
                      <div className="w-14 h-14 flex items-center justify-center bg-zinc-900/90 rounded-lg border border-zinc-800/80 group-hover:border-indigo-500/40 group-hover:scale-105 transition-all mb-2">
                        {renderElementPreview(elem)}
                      </div>
                      <span className="font-medium text-[11px] text-zinc-200 truncate w-full group-hover:text-indigo-300">
                        {elem.name}
                      </span>
                      <span className="text-[9px] text-zinc-500 uppercase tracking-wider mt-0.5">
                        {elem.filled ? 'Filled' : 'Outline'}
                      </span>
                    </button>
                  ))}
                </div>

                {filteredElements.length === 0 && (
                  <div className="p-6 text-center text-zinc-500 text-xs">
                    No elements found matching "{elementSearch}"
                  </div>
                )}
              </div>
            )}

            {/* Uploads Tab */}
            {activeTab === 'uploads' && (
              <div className="space-y-4 text-xs">
                <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-zinc-700 hover:border-indigo-500 rounded-xl bg-zinc-950/50 hover:bg-zinc-950 transition cursor-pointer text-center group">
                  <UploadCloud className="w-8 h-8 text-indigo-400 group-hover:scale-110 transition-transform mb-2" />
                  <span className="font-semibold text-zinc-200">Upload Image File</span>
                  <span className="text-[11px] text-zinc-500 mt-1">PNG, JPG, WebP, SVG</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0] && onImageUpload) {
                        onImageUpload(e.target.files[0]);
                      }
                    }}
                  />
                </label>

                <div className="border-t border-zinc-800 pt-3">
                  <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2.5">
                    Demo Preset Library
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {SAMPLE_IMAGES.map((sample) => (
                      <button
                        key={sample.id}
                        type="button"
                        onClick={() => onSelectSample && onSelectSample(sample)}
                        className="group flex flex-col p-2 rounded-lg border border-zinc-800 bg-zinc-950/60 hover:border-indigo-500 transition text-left cursor-pointer"
                      >
                        <img
                          src={sample.url}
                          alt={sample.name}
                          draggable="true"
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', sample.url);
                            e.dataTransfer.setData('text/uri-list', sample.url);
                          }}
                          className="w-full h-20 object-cover rounded-md mb-1.5 border border-zinc-800"
                        />
                        <span className="font-medium text-zinc-200 truncate group-hover:text-indigo-300">
                          {sample.name}
                        </span>
                        <span className="text-[10px] text-zinc-500">{sample.category}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>
      )}

      {/* Right-side Tool Options Panel Content Portal */}
      {toolOptionsHost && activeTool !== 'crop' && createPortal(
        <section aria-label="Tool options" className="space-y-4 text-xs">
          {((hasSelectedText && activeTool === 'select') || activeTool === 'text') ? (
            <>
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
                <span className="font-semibold text-zinc-100 text-xs">Text Formatting & Layer</span>
                <span className="font-mono text-[11px] text-indigo-300 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-md">{textSettings.fontSize}px</span>
              </div>
              <label className="block space-y-1.5">
                <div className="flex justify-between text-zinc-300">
                  <span className="font-medium">Font Size</span>
                  <span className="font-mono text-zinc-400">{textSettings.fontSize}px</span>
                </div>
                <input
                  disabled={textLayerLocked}
                  aria-label="Text font size"
                  type="range"
                  min="8"
                  max="400"
                  value={textSettings.fontSize}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    setTextSettings((current) => ({ ...current, fontSize: value }));
                    updateToolOption('text', 'fontSize', value);
                  }}
                  className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 disabled:opacity-40"
                />
              </label>
              <label className="flex items-center justify-between gap-3 text-zinc-300">
                <span className="font-medium">Font Family</span>
                <select
                  disabled={textLayerLocked}
                  aria-label="Text font family"
                  value={textSettings.fontFamily}
                  onChange={(e) => {
                    const value = e.target.value;
                    setTextSettings((current) => ({ ...current, fontFamily: value }));
                    updateToolOption('text', 'fontFamily', value);
                  }}
                  className="rounded-xl border border-zinc-700/80 bg-zinc-900 px-3 py-1.5 text-zinc-100 disabled:opacity-40 outline-none text-xs font-medium"
                >
                  <option>Arial</option>
                  <option>Georgia</option>
                  <option>Verdana</option>
                  <option>Impact</option>
                  <option>Courier New</option>
                </select>
              </label>
              <label className="flex items-center justify-between gap-3 text-zinc-300">
                <span className="font-medium">Text Color</span>
                <div className="flex items-center gap-2">
                  <input
                    disabled={textLayerLocked}
                    aria-label="Text color"
                    type="color"
                    value={textSettings.color || '#000000'}
                    onChange={(e) => {
                      const value = e.target.value;
                      setTextSettings((current) => ({ ...current, color: value }));
                      updateToolOption('text', 'color', value);
                    }}
                    className="w-6 h-6 rounded cursor-pointer border border-zinc-700 bg-transparent p-0 disabled:opacity-40"
                  />
                  <span className="font-mono text-[11px] text-zinc-400 uppercase">{textSettings.color || '#000000'}</span>
                </div>
              </label>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  disabled={textLayerLocked}
                  aria-pressed={textSettings.bold}
                  onClick={() => {
                    const value = !textSettings.bold;
                    setTextSettings((current) => ({ ...current, bold: value }));
                    updateToolOption('text', 'bold', value);
                  }}
                  className={`flex-1 rounded-xl border py-1.5 font-bold transition text-xs ${
                    textSettings.bold ? 'border-indigo-500 bg-indigo-500/20 text-white shadow-sm ring-1 ring-indigo-500/40' : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
                  }`}
                >
                  B
                </button>
                <button
                  type="button"
                  disabled={textLayerLocked}
                  aria-pressed={textSettings.italic}
                  onClick={() => {
                    const value = !textSettings.italic;
                    setTextSettings((current) => ({ ...current, italic: value }));
                    updateToolOption('text', 'italic', value);
                  }}
                  className={`flex-1 rounded-xl border py-1.5 italic transition text-xs ${
                    textSettings.italic ? 'border-indigo-500 bg-indigo-500/20 text-white shadow-sm ring-1 ring-indigo-500/40' : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
                  }`}
                >
                  I
                </button>
                <select
                  disabled={textLayerLocked}
                  aria-label="Text alignment"
                  value={textSettings.textAlign}
                  onChange={(e) => {
                    const value = e.target.value;
                    setTextSettings((current) => ({ ...current, textAlign: value }));
                    updateToolOption('text', 'textAlign', value);
                  }}
                  className="rounded-xl border border-zinc-700/80 bg-zinc-900 px-3 text-zinc-100 disabled:opacity-40 outline-none text-xs font-medium"
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </div>
              <div className="flex gap-2 border-t border-zinc-800/80 pt-3">
                <button
                  type="button"
                  disabled={!hasSelectedText}
                  onClick={() => window.dispatchEvent(new CustomEvent('image-studio:text-action', { detail: 'back' }))}
                  className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 px-2 py-2 text-zinc-200 hover:bg-zinc-800 disabled:opacity-40 font-medium transition text-xs"
                >
                  Send Back
                </button>
                <button
                  type="button"
                  disabled={!hasSelectedText || textLayerLocked}
                  onClick={() => window.dispatchEvent(new CustomEvent('image-studio:text-action', { detail: 'copy' }))}
                  className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 px-2 py-2 text-zinc-200 hover:bg-zinc-800 disabled:opacity-40 font-medium transition text-xs"
                >
                  Copy
                </button>
                <button
                  type="button"
                  disabled={!hasSelectedText || textLayerLocked}
                  onClick={() => window.dispatchEvent(new CustomEvent('image-studio:text-action', { detail: 'duplicate' }))}
                  className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 px-2 py-2 text-zinc-200 hover:bg-zinc-800 disabled:opacity-40 font-medium transition text-xs"
                >
                  Duplicate
                </button>
                <button
                  type="button"
                  disabled={!hasSelectedText || textLayerLocked}
                  onClick={() => window.dispatchEvent(new CustomEvent('image-studio:text-action', { detail: 'delete' }))}
                  className="flex-1 rounded-xl border border-red-900/60 bg-red-950/30 px-2 py-2 text-red-300 hover:bg-red-950/60 disabled:opacity-40 font-medium transition text-xs"
                >
                  Delete
                </button>
              </div>
            </>
          ) : ((hasSelectedShape && activeTool === 'select') || activeTool === 'shapes') ? (
            <>
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
                <span className="font-semibold text-zinc-100 text-xs">Vector Shape Options</span>
                <span className="font-mono text-[11px] text-indigo-300 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-md capitalize">{shapeSettings.type}</span>
              </div>
              <label className="flex items-center justify-between gap-3 text-zinc-300">
                <span className="font-medium">Shape Type</span>
                <select
                  disabled={shapeLayerLocked}
                  aria-label="Shape type"
                  value={shapeSettings.type}
                  onChange={(e) => {
                    const value = e.target.value;
                    setShapeSettings((current) => ({ ...current, type: value }));
                    updateToolOption('shape', 'type', value);
                  }}
                  className="rounded-xl border border-zinc-700/80 bg-zinc-900 px-3 py-1.5 text-zinc-100 disabled:opacity-40 outline-none font-medium text-xs"
                >
                  <option value="rectangle">Rectangle</option>
                  <option value="ellipse">Circle / Ellipse</option>
                </select>
              </label>
              <label className="block space-y-1.5">
                <div className="flex justify-between text-zinc-300">
                  <span className="font-medium">Stroke Width</span>
                  <span className="font-mono text-zinc-400">{shapeSettings.strokeWidth}px</span>
                </div>
                <input
                  disabled={shapeLayerLocked}
                  aria-label="Shape stroke width"
                  type="range"
                  min="1"
                  max="40"
                  value={shapeSettings.strokeWidth}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    setShapeSettings((current) => ({ ...current, strokeWidth: value }));
                    updateToolOption('shape', 'strokeWidth', value);
                  }}
                  className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 disabled:opacity-40"
                />
              </label>
              <label className="flex items-center gap-2.5 text-zinc-300 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  disabled={shapeLayerLocked}
                  checked={shapeSettings.filled}
                  onChange={(e) => {
                    const value = e.target.checked;
                    setShapeSettings((current) => ({ ...current, filled: value }));
                    updateToolOption('shape', 'filled', value);
                  }}
                  className="accent-indigo-500 rounded disabled:opacity-40 h-4 w-4"
                />
                <span className="font-medium">Fill shape with active color</span>
              </label>
              {hasSelectedShape && (
                <div className="flex gap-2 border-t border-zinc-800/80 pt-3">
                  <button
                    type="button"
                    disabled={shapeLayerLocked}
                    onClick={() => window.dispatchEvent(new CustomEvent('image-studio:shape-action', { detail: 'copy' }))}
                    className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 px-2 py-2 text-zinc-200 hover:bg-zinc-800 disabled:opacity-40 font-medium transition text-xs"
                  >
                    Copy
                  </button>
                  <button
                    type="button"
                    disabled={shapeLayerLocked}
                    onClick={() => window.dispatchEvent(new CustomEvent('image-studio:shape-action', { detail: 'duplicate' }))}
                    className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 px-2 py-2 text-zinc-200 hover:bg-zinc-800 disabled:opacity-40 font-medium transition text-xs"
                  >
                    Duplicate
                  </button>
                  <button
                    type="button"
                    disabled={shapeLayerLocked}
                    onClick={() => window.dispatchEvent(new CustomEvent('image-studio:shape-action', { detail: 'delete' }))}
                    className="flex-1 rounded-xl border border-red-900/60 bg-red-950/30 px-2 py-2 text-red-300 hover:bg-red-950/60 disabled:opacity-40 font-medium transition text-xs"
                  >
                    Delete
                  </button>
                </div>
              )}
            </>
          ) : activeTool === 'brush' ? (
            <>
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
                <span className="font-semibold text-zinc-100 text-xs">Brush Tool Options</span>
                <span className="font-mono text-[11px] text-indigo-300 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-md">{brushSize}px · {brushOpacity}%</span>
              </div>
              <label className="block space-y-1.5">
                <div className="flex justify-between text-zinc-300">
                  <span className="font-medium">Brush Size</span>
                  <span className="font-mono text-zinc-400">{brushSize}px</span>
                </div>
                <input
                  aria-label="Brush size"
                  type="range"
                  min="1"
                  max="100"
                  value={brushSize}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    setBrushSize(value);
                    updateToolOption('brush', 'size', value);
                  }}
                  className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </label>
              <label className="block space-y-1.5">
                <div className="flex justify-between text-zinc-300">
                  <span className="font-medium">Brush Opacity</span>
                  <span className="font-mono text-zinc-400">{brushOpacity}%</span>
                </div>
                <input
                  aria-label="Brush opacity"
                  type="range"
                  min="1"
                  max="100"
                  value={brushOpacity}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    setBrushOpacity(value);
                    updateToolOption('brush', 'opacity', value);
                  }}
                  className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </label>
              <div className="border-t border-zinc-800/80 pt-3">
                <div className="mb-2.5 flex justify-between text-zinc-300 items-center">
                  <span className="font-medium">Paint Swatches</span>
                  <span className="font-mono text-[11px] text-indigo-300 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-md">{selectedColor.toUpperCase()}</span>
                </div>
                <div className="grid grid-cols-8 gap-2">
                  {BRUSH_SWATCHES.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => onSelectedColorChange(color)}
                      aria-label={`Select brush color ${color}`}
                      aria-pressed={selectedColor.toLowerCase() === color}
                      className={`h-7 w-7 rounded-lg border transition transform hover:scale-105 shadow-sm ${
                        selectedColor.toLowerCase() === color ? 'border-white ring-2 ring-indigo-400 scale-105' : 'border-white/20'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </>
          ) : activeTool === 'eraser' ? (
            <>
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
                <span className="font-semibold text-zinc-100 text-xs">Eraser Tool Options</span>
                <span className="font-mono text-[11px] text-indigo-300 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-md">{eraserSize}px · {eraserHardness}%</span>
              </div>
              <label className="block space-y-1.5">
                <div className="flex justify-between text-zinc-300">
                  <span className="font-medium">Eraser Size</span>
                  <span className="font-mono text-zinc-400">{eraserSize}px</span>
                </div>
                <input
                  aria-label="Eraser size"
                  type="range"
                  min="2"
                  max="150"
                  value={eraserSize}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    setEraserSize(value);
                    updateToolOption('eraser', 'size', value);
                  }}
                  className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </label>
              <label className="block space-y-1.5">
                <div className="flex justify-between text-zinc-300">
                  <span className="font-medium">Eraser Hardness</span>
                  <span className="font-mono text-zinc-400">{eraserHardness}%</span>
                </div>
                <input
                  aria-label="Eraser hardness"
                  type="range"
                  min="0"
                  max="100"
                  value={eraserHardness}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    setEraserHardness(value);
                    updateToolOption('eraser', 'hardness', value);
                  }}
                  className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </label>
            </>
          ) : activeTool === 'eyedropper' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
                <span className="font-semibold text-zinc-100 text-xs">Eyedropper Sampling</span>
                <span className="font-mono text-[11px] text-indigo-300 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-md">{selectedColor.toUpperCase()}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined' && 'EyeDropper' in window) {
                    try {
                      const dropper = new (window as any).EyeDropper();
                      dropper.open().then((res: { sRGBHex: string }) => {
                        if (res?.sRGBHex) {
                          onSelectedColorChange(res.sRGBHex);
                          window.dispatchEvent(new CustomEvent('image-studio:selected-color', { detail: res.sRGBHex }));
                        }
                      }).catch(() => {});
                    } catch {
                      // ignore
                    }
                  } else {
                    window.dispatchEvent(new Event('image-studio:activate-eyedropper'));
                  }
                }}
                className="w-full rounded-xl border border-indigo-500/50 bg-indigo-500/10 px-3.5 py-2.5 text-left text-zinc-100 hover:bg-indigo-500/20 transition flex items-center justify-between group shadow-sm"
              >
                <span className="font-medium text-xs">Click canvas to sample pixel color</span>
                <Pipette className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
              </button>
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setColorPickerOpen((open) => !open)}
                  aria-label="Toggle selected color palette"
                  aria-expanded={colorPickerOpen}
                  className="h-9 w-9 rounded-xl border border-zinc-600 shadow-md ring-1 ring-black/40"
                  style={{ backgroundColor: selectedColor }}
                />
                <span className="font-mono text-zinc-200 text-xs font-semibold">{selectedColor.toUpperCase()}</span>
                <input
                  type="color"
                  value={selectedColor}
                  onChange={(event) => onSelectedColorChange(event.target.value)}
                  aria-label="Choose active color"
                  className="ml-auto h-8 w-11 cursor-pointer rounded-lg border border-zinc-700 bg-zinc-900 p-0.5"
                />
              </div>
              {colorPickerOpen && (
                <div className="grid grid-cols-8 gap-2 pt-2 border-t border-zinc-800/80">
                  {BRUSH_SWATCHES.map((color) => (
                    <button
                      key={color}
                      type="button"
                      aria-label={`Select color ${color}`}
                      onClick={() => onSelectedColorChange(color)}
                      className={`h-7 w-7 rounded-lg border transition transform hover:scale-105 shadow-sm ${
                        selectedColor.toLowerCase() === color ? 'border-white ring-2 ring-indigo-400 scale-105' : 'border-white/20'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : activeTool === 'blur' ? (
            <>
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
                <span className="font-semibold text-zinc-100 text-xs">Selective Blur Brush Options</span>
                <span className="font-mono text-[11px] text-indigo-300 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-md">{blurSize}px · {blurIntensity}px</span>
              </div>
              <label className="block space-y-1.5">
                <div className="flex justify-between text-zinc-300">
                  <span className="font-medium">Brush Size</span>
                  <span className="font-mono text-zinc-400">{blurSize}px</span>
                </div>
                <input
                  aria-label="Blur brush size"
                  type="range"
                  min="5"
                  max="150"
                  value={blurSize}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    setBlurSize(value);
                    updateToolOption('blur', 'size', value);
                  }}
                  className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </label>
              <label className="block space-y-1.5">
                <div className="flex justify-between text-zinc-300">
                  <span className="font-medium">Blur Intensity</span>
                  <span className="font-mono text-zinc-400">{blurIntensity}px</span>
                </div>
                <input
                  aria-label="Blur intensity"
                  type="range"
                  min="1"
                  max="50"
                  value={blurIntensity}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    setBlurIntensity(value);
                    updateToolOption('blur', 'intensity', value);
                  }}
                  className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </label>
              <div className="border-t border-zinc-800/80 pt-3">
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new Event('image-studio:clear-selective-blur'))}
                  className="w-full rounded-xl border border-red-900/60 bg-red-950/30 px-3 py-2 text-red-300 hover:bg-red-950/60 transition font-medium text-xs text-center"
                >
                  Clear Selective Blur
                </button>
              </div>
            </>
          ) : (activeTool === 'filters' || activeTool === 'select') ? (
            <div className="space-y-4">
              {/* Segmented Control Tabs */}
              <div className="flex items-center gap-1 p-1 bg-zinc-900/90 rounded-xl border border-zinc-800 text-[11px] font-medium">
                <button
                  type="button"
                  onClick={() => setAdjustTab('lighting')}
                  className={`flex-1 py-1.5 px-2 rounded-lg transition ${
                    adjustTab === 'lighting'
                      ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                  }`}
                >
                  Lighting
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustTab('tone')}
                  className={`flex-1 py-1.5 px-2 rounded-lg transition ${
                    adjustTab === 'tone'
                      ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                  }`}
                >
                  Tone
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustTab('presets')}
                  className={`flex-1 py-1.5 px-2 rounded-lg transition ${
                    adjustTab === 'presets'
                      ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                  }`}
                >
                  Presets
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustTab('transform')}
                  className={`flex-1 py-1.5 px-2 rounded-lg transition ${
                    adjustTab === 'transform'
                      ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                  }`}
                >
                  Transform
                </button>
              </div>

              {/* Lighting Tab */}
              {adjustTab === 'lighting' && (
                <div className="space-y-3.5 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                      <Sun className="w-3.5 h-3.5 text-amber-400" />
                      <span>Lighting Controls</span>
                    </span>
                    <button
                      type="button"
                      onClick={onResetAdjustments}
                      className="text-[11px] text-zinc-400 hover:text-indigo-300 flex items-center gap-1 transition"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Reset</span>
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-300">Opacity / Transparency</span>
                      <span className="font-mono text-[11px] text-zinc-400 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">{adjustments.opacity ?? 100}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={adjustments.opacity ?? 100}
                      onChange={(e) => onUpdateAdjustments({ ...adjustments, opacity: Number(e.target.value) })}
                      className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-300">Brightness</span>
                      <span className="font-mono text-[11px] text-zinc-400 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">{adjustments.brightness}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="200"
                      value={adjustments.brightness}
                      onChange={(e) => onUpdateAdjustments({ ...adjustments, brightness: Number(e.target.value) })}
                      className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-300">Contrast</span>
                      <span className="font-mono text-[11px] text-zinc-400 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">{adjustments.contrast}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="200"
                      value={adjustments.contrast}
                      onChange={(e) => onUpdateAdjustments({ ...adjustments, contrast: Number(e.target.value) })}
                      className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-300">Exposure</span>
                      <span className="font-mono text-[11px] text-zinc-400 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">{adjustments.exposure}</span>
                    </div>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={adjustments.exposure}
                      onChange={(e) => onUpdateAdjustments({ ...adjustments, exposure: Number(e.target.value) })}
                      className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>
                </div>
              )}

              {/* Tone & Effects Tab */}
              {adjustTab === 'tone' && (
                <div className="space-y-3.5 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Tone & Effects</span>
                    </span>
                    <button
                      type="button"
                      onClick={onResetAdjustments}
                      className="text-[11px] text-zinc-400 hover:text-indigo-300 flex items-center gap-1 transition"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Reset</span>
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-300">Saturation</span>
                      <span className="font-mono text-[11px] text-zinc-400 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">{adjustments.saturation}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="200"
                      value={adjustments.saturation}
                      onChange={(e) => onUpdateAdjustments({ ...adjustments, saturation: Number(e.target.value) })}
                      className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-300">Global Blur</span>
                      <span className="font-mono text-[11px] text-zinc-400 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">{adjustments.blur}px</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="20"
                      value={adjustments.blur}
                      onChange={(e) => onUpdateAdjustments({ ...adjustments, blur: Number(e.target.value) })}
                      className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        onSelectTool('blur');
                        window.dispatchEvent(new Event('image-studio:show-tool-options'));
                      }}
                      className="w-full py-1.5 px-2.5 rounded-lg border border-indigo-500/40 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 font-medium text-xs transition flex items-center justify-center gap-1.5 mt-1"
                    >
                      <BlurIcon className="w-3.5 h-3.5" />
                      <span>Selective Blur Brush</span>
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-300">Hue Shift</span>
                      <span className="font-mono text-[11px] text-zinc-400 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">{adjustments.hueRotate}°</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      value={adjustments.hueRotate}
                      onChange={(e) => onUpdateAdjustments({ ...adjustments, hueRotate: Number(e.target.value) })}
                      className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-300">Sepia</span>
                      <span className="font-mono text-[11px] text-zinc-400 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">{adjustments.sepia}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={adjustments.sepia}
                      onChange={(e) => onUpdateAdjustments({ ...adjustments, sepia: Number(e.target.value) })}
                      className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-300">Grayscale</span>
                      <span className="font-mono text-[11px] text-zinc-400 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">{adjustments.grayscale}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={adjustments.grayscale}
                      onChange={(e) => onUpdateAdjustments({ ...adjustments, grayscale: Number(e.target.value) })}
                      className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-300">Invert</span>
                      <span className="font-mono text-[11px] text-zinc-400 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">{adjustments.invert}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={adjustments.invert}
                      onChange={(e) => onUpdateAdjustments({ ...adjustments, invert: Number(e.target.value) })}
                      className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>
                </div>
              )}

              {/* Presets Tab */}
              {adjustTab === 'presets' && (
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-zinc-300">Filter Presets</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {FILTER_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        aria-pressed={selectedPresetId === preset.id}
                        onClick={() => onApplyPreset(preset.id, preset.adjustments)}
                        className={`rounded-xl border p-2.5 text-left transition flex items-center justify-between ${
                          selectedPresetId === preset.id
                            ? 'border-indigo-500 bg-indigo-500/20 text-white ring-1 ring-indigo-500/50'
                            : 'border-zinc-800 bg-zinc-900/80 text-zinc-300 hover:bg-zinc-800 hover:text-white'
                        }`}
                      >
                        <span className="font-medium text-xs truncate">{preset.name}</span>
                        {selectedPresetId === preset.id && (
                          <div className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Transform & Layers Tab */}
              {adjustTab === 'transform' && (
                <div className="space-y-3.5 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-300">Transform & Scale</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => rotate(-90)}
                      className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-200 hover:bg-zinc-800 transition flex items-center justify-center gap-1.5 font-medium text-xs"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Rotate -90°</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => rotate(90)}
                      className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-200 hover:bg-zinc-800 transition flex items-center justify-center gap-1.5 font-medium text-xs"
                    >
                      <RotateCw className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Rotate +90°</span>
                    </button>
                    <button
                      type="button"
                      aria-pressed={transform.flipHorizontal}
                      onClick={() => flip('horizontal')}
                      className={`rounded-xl border px-3 py-2 transition flex items-center justify-center gap-1.5 font-medium text-xs ${
                        transform.flipHorizontal ? 'border-indigo-500 bg-indigo-500/20 text-white' : 'border-zinc-800 bg-zinc-900 text-zinc-200 hover:bg-zinc-800'
                      }`}
                    >
                      <FlipHorizontal className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Flip Horiz</span>
                    </button>
                    <button
                      type="button"
                      aria-pressed={transform.flipVertical}
                      onClick={() => flip('vertical')}
                      className={`rounded-xl border px-3 py-2 transition flex items-center justify-center gap-1.5 font-medium text-xs ${
                        transform.flipVertical ? 'border-indigo-500 bg-indigo-500/20 text-white' : 'border-zinc-800 bg-zinc-900 text-zinc-200 hover:bg-zinc-800'
                      }`}
                    >
                      <FlipVertical className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Flip Vert</span>
                    </button>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-300">Opacity / Transparency</span>
                      <span className="font-mono text-[11px] text-zinc-400 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">{adjustments.opacity ?? 100}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={adjustments.opacity ?? 100}
                      onChange={(e) => onUpdateAdjustments({ ...adjustments, opacity: Number(e.target.value) })}
                      className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-300">Image Scale</span>
                      <span className="font-mono text-[11px] text-zinc-400 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">{Math.round(transform.scale * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="3"
                      step="0.05"
                      value={transform.scale}
                      onChange={(e) => onUpdateTransform({ ...transform, scale: Number(e.target.value) })}
                      className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>

                  {isBaseImageSelected && (
                    <button
                      type="button"
                      onClick={onDeleteBaseImage}
                      className="w-full rounded-xl border border-red-900/80 bg-red-950/40 px-3 py-2.5 text-red-200 hover:bg-red-950 transition font-medium text-xs text-center"
                    >
                      Delete Selected Base Image
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : activeTool === 'pan' ? (
            <div className="space-y-2 text-zinc-300">
              <div className="font-semibold text-zinc-200">Pan / Hand</div>
              <p>Drag the canvas to move it. You can also hold Space and drag, or drag with the middle mouse button.</p>
            </div>
          ) : null}
        </section>,
        toolOptionsHost,
      )}

      {/* Settings & Help Modals */}
      {openPanel && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpenPanel(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="tool-palette-panel-title"
            className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-5 text-zinc-100 shadow-2xl"
          >
            <div className="mb-4 flex items-center justify-between border-b border-zinc-800 pb-3">
              <h2 id="tool-palette-panel-title" className="text-sm font-semibold">
                {openPanel === 'settings' ? 'Studio Settings' : 'Shortcuts & Help'}
              </h2>
              <button
                type="button"
                onClick={() => setOpenPanel(null)}
                aria-label="Close panel"
                className="rounded-md px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-white"
              >
                Close
              </button>
            </div>
            {openPanel === 'settings' ? (
              <div className="space-y-3 text-xs leading-relaxed text-zinc-300">
                <p>Adjust image appearance using the <strong>Adjust</strong> sidebar panel.</p>
                <p>Use the <strong>Layers</strong> panel to control object visibility and locking.</p>
                <p className="text-zinc-500">Zoom, fit, and export controls are in the bottom right and top header.</p>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <div>
                  <h3 className="mb-2 font-medium text-zinc-300">Shortcuts</h3>
                  <div className="space-y-2 text-zinc-400">
                    <p className="flex justify-between"><span>Select Tool</span><kbd className="font-mono text-zinc-200">V</kbd></p>
                    <p className="flex justify-between"><span>Pan Tool</span><kbd className="font-mono text-zinc-200">H</kbd></p>
                    <p className="flex justify-between"><span>Crop Canvas</span><kbd className="font-mono text-zinc-200">C</kbd></p>
                    <p className="flex justify-between"><span>Brush Tool</span><kbd className="font-mono text-zinc-200">B</kbd></p>
                    <p className="flex justify-between"><span>Text Layer</span><kbd className="font-mono text-zinc-200">T</kbd></p>
                    <p className="flex justify-between"><span>Eraser</span><kbd className="font-mono text-zinc-200">E</kbd></p>
                    <p className="flex justify-between"><span>Eyedropper</span><kbd className="font-mono text-zinc-200">I</kbd></p>
                    <p className="flex justify-between"><span>Shapes</span><kbd className="font-mono text-zinc-200">U</kbd></p>
                    <p className="flex justify-between"><span>Undo / Redo</span><kbd className="font-mono text-zinc-200">Ctrl+Z / Y</kbd></p>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};
