import { useState, useCallback, useEffect } from 'react';
import type { ToolType, ImageAdjustments, ImageTransform, LayerItem } from './types/studio';
import { SAMPLE_IMAGES } from './constants/samples';
import type { SampleImage } from './constants/samples';
import { Navbar } from './components/Navbar';
import { ToolPalette } from './components/ToolPalette';
import { Canvas } from './components/Canvas';
import type { CanvasHistory, CanvasImageElement } from './components/Canvas';

const DEFAULT_ADJUSTMENTS: ImageAdjustments = {
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
};

const DEFAULT_TRANSFORM: ImageTransform = {
  rotation: 0,
  scale: 1,
  flipHorizontal: false,
  flipVertical: false,
};

const DEFAULT_CANVAS_HISTORY: CanvasHistory = {
  brushStrokes: [],
  eraserStrokes: [],
  textLayers: [],
  vectorShapes: [],
};

const INITIAL_LAYERS: LayerItem[] = [
  { id: 'layer-image', name: 'Base Image', type: 'image', visible: true, locked: false, opacity: 1 },
  { id: 'layer-adjustments', name: 'Color Adjustments', type: 'adjustment', visible: true, locked: false, opacity: 1 },
  { id: 'layer-overlay', name: 'Drawing & Overlay', type: 'overlay', visible: true, locked: false, opacity: 1 },
];

interface HistoryState {
  adjustments: ImageAdjustments;
  transform: ImageTransform;
  canvasHistory: CanvasHistory;
  imageUrl: string;
  imageName: string;
  selectedPresetId: string;
}

export default function App() {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [imageName, setImageName] = useState<string>('Untitled Canvas');
  const [canvasBgColor, setCanvasBgColor] = useState<string>('#ffffff');
  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [zoom, setZoom] = useState<number>(1.0);
  const [fitCanvasTrigger, setFitCanvasTrigger] = useState<number>(0);
  const [adjustments, setAdjustments] = useState<ImageAdjustments>(DEFAULT_ADJUSTMENTS);
  const [transform, setTransform] = useState<ImageTransform>(DEFAULT_TRANSFORM);
  const [layers, setLayers] = useState<LayerItem[]>(INITIAL_LAYERS);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('default');
  const [selectedColor, setSelectedColor] = useState<string>('#4f46e5');
  const [canvasHistory, setCanvasHistory] = useState<CanvasHistory>(DEFAULT_CANVAS_HISTORY);
  const [canvasHistoryToken, setCanvasHistoryToken] = useState<number>(0);
  const [isBaseImageSelected, setIsBaseImageSelected] = useState<boolean>(false);
  const [showToolOptions, setShowToolOptions] = useState<boolean>(false);
  const [toolOptionsHost, setToolOptionsHost] = useState<HTMLDivElement | null>(null);

  // Undo / Redo history stack
  const [historyStack, setHistoryStack] = useState<HistoryState[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryState[]>([]);

  // Export state
  const [exportTrigger, setExportTrigger] = useState<number>(0);
  const [exportFormat, setExportFormat] = useState<'png' | 'jpeg' | 'pdf'>('png');
  const [transparentBackground, setTransparentBackground] = useState<boolean>(false);

  // Push current state onto undo stack before modifying
  const pushHistory = useCallback(() => {
    const currentState: HistoryState = {
      adjustments: { ...adjustments },
      transform: { ...transform },
      canvasHistory: { ...canvasHistory },
      imageUrl,
      imageName,
      selectedPresetId,
    };
    setHistoryStack((prev) => [...prev.slice(-30), currentState]);
    setRedoStack([]);
  }, [adjustments, transform, canvasHistory, imageUrl, imageName, selectedPresetId]);

  const handleUndo = useCallback(() => {
    if (historyStack.length === 0) return;
    const previous = historyStack[historyStack.length - 1];
    const currentState: HistoryState = {
      adjustments: { ...adjustments },
      transform: { ...transform },
      canvasHistory: { ...canvasHistory },
      imageUrl,
      imageName,
      selectedPresetId,
    };

    setRedoStack((prev) => [...prev, currentState]);
    setHistoryStack((prev) => prev.slice(0, -1));

    setAdjustments(previous.adjustments);
    setTransform(previous.transform);
    setCanvasHistory(previous.canvasHistory);
    setCanvasHistoryToken((prev) => prev + 1);
    setImageUrl(previous.imageUrl);
    setImageName(previous.imageName);
    setSelectedPresetId(previous.selectedPresetId);
  }, [historyStack, adjustments, transform, canvasHistory, imageUrl, imageName, selectedPresetId]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    const currentState: HistoryState = {
      adjustments: { ...adjustments },
      transform: { ...transform },
      canvasHistory: { ...canvasHistory },
      imageUrl,
      imageName,
      selectedPresetId,
    };

    setHistoryStack((prev) => [...prev, currentState]);
    setRedoStack((prev) => prev.slice(0, -1));

    setAdjustments(next.adjustments);
    setTransform(next.transform);
    setCanvasHistory(next.canvasHistory);
    setCanvasHistoryToken((prev) => prev + 1);
    setImageUrl(next.imageUrl);
    setImageName(next.imageName);
    setSelectedPresetId(next.selectedPresetId);
  }, [redoStack, adjustments, transform, canvasHistory, imageUrl, imageName, selectedPresetId]);

  // Adjustments update handler
  const handleUpdateAdjustments = (newAdjustments: ImageAdjustments) => {
    pushHistory();
    setAdjustments(newAdjustments);
    setSelectedPresetId('custom');
  };

  // Transform update handler
  const handleUpdateTransform = (newTransform: ImageTransform) => {
    pushHistory();
    setTransform(newTransform);
  };

  // Apply filter preset handler
  const handleApplyPreset = (presetId: string, presetAdjustments: Partial<ImageAdjustments>) => {
    pushHistory();
    setAdjustments({
      ...DEFAULT_ADJUSTMENTS,
      ...presetAdjustments,
    });
    setSelectedPresetId(presetId);
  };

  // Reset adjustments handler
  const handleResetAdjustments = () => {
    pushHistory();
    setAdjustments(DEFAULT_ADJUSTMENTS);
    setSelectedPresetId('default');
  };

  // Canvas drawing history change handler
  const handleCanvasHistoryChange = (newSnapshot: CanvasHistory) => {
    pushHistory();
    setCanvasHistory(newSnapshot);
  };

  // Helper to add overlay image with responsive natural sizing
  const addOverlayImageElement = (url: string, name: string) => {
    const applyNewElement = (naturalW: number, naturalH: number) => {
      const maxDim = 520;
      let width = naturalW;
      let height = naturalH;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((maxDim / width) * height);
          width = maxDim;
        } else {
          width = Math.round((maxDim / height) * width);
          height = maxDim;
        }
      }
      const existingCount = canvasHistory.imageElements?.length || 0;
      const elementId = `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const layerId = `layer-${elementId}`;
      const newImgEl: CanvasImageElement = {
        id: elementId,
        layerId,
        url,
        name,
        x: Math.max(20, Math.round((1000 - width) / 2) + (existingCount % 5) * 25),
        y: Math.max(20, Math.round((700 - height) / 2) + (existingCount % 5) * 25),
        width,
        height,
        locked: false,
      };
      const newLayer: LayerItem = {
        id: layerId,
        name: name || `Image ${existingCount + 1}`,
        type: 'overlay',
        visible: true,
        locked: false,
        opacity: 1,
      };
      setLayers((prev) => [...prev, newLayer]);
      setCanvasHistory((prev) => ({
        ...prev,
        imageElements: [...(prev.imageElements || []), newImgEl],
      }));
      setCanvasHistoryToken((prev) => prev + 1);
      setActiveTool('select');
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('image-studio:select-image-element', { detail: newImgEl.id }));
      }, 50);
    };

    const img = new Image();
    img.onload = () => {
      applyNewElement(img.naturalWidth || 600, img.naturalHeight || 450);
    };
    img.onerror = () => {
      applyNewElement(500, 360);
    };
    img.src = url;
  };

  // Image upload handler
  const handleImageUpload = (file: File) => {
    pushHistory();
    const url = URL.createObjectURL(file);
    addOverlayImageElement(url, file.name);
  };

  // Sample image selector handler
  const handleSelectSample = (sample: SampleImage) => {
    pushHistory();
    addOverlayImageElement(sample.url, sample.name);
  };

  // Crop handler
  const handleCropImage = (croppedUrl: string, croppedCanvas: CanvasHistory) => {
    pushHistory();
    setImageUrl(croppedUrl);
    setCanvasHistory(croppedCanvas);
    setCanvasHistoryToken((prev) => prev + 1);
    setFitCanvasTrigger((prev) => prev + 1);
  };

  // Delete base image
  const handleDeleteBaseImage = () => {
    pushHistory();
    setImageUrl('');
    setImageName('Empty Canvas');
    setIsBaseImageSelected(false);
  };

  // Layer handlers
  const handleToggleLayerVisibility = (id: string) => {
    setLayers((prev) =>
      prev.map((layer) => (layer.id === id ? { ...layer, visible: !layer.visible } : layer))
    );
  };

  const handleToggleLayerLock = (id: string) => {
    let nextLocked = false;
    setLayers((prev) =>
      prev.map((layer) => {
        if (layer.id === id) {
          nextLocked = !layer.locked;
          return { ...layer, locked: nextLocked };
        }
        return layer;
      })
    );
    setCanvasHistory((prev) => ({
      ...prev,
      imageElements: prev.imageElements?.map((img) =>
        img.layerId === id || img.id === id ? { ...img, locked: nextLocked } : img
      ),
      vectorShapes: prev.vectorShapes?.map((s) =>
        s.layerId === id || s.id === id ? { ...s, locked: nextLocked } : s
      ),
      textLayers: prev.textLayers?.map((t) =>
        t.layerId === id || t.id === id ? { ...t, locked: nextLocked } : t
      ),
    }));
    setCanvasHistoryToken((prev) => prev + 1);
  };

  const handleAddLayer = () => {
    const newId = `layer-${Date.now()}`;
    const newLayer: LayerItem = {
      id: newId,
      name: `Overlay ${layers.length + 1}`,
      type: 'overlay',
      visible: true,
      locked: false,
      opacity: 1,
    };
    setLayers((prev) => [...prev, newLayer]);
  };

  // Zoom handlers
  const handleZoomIn = () => setZoom((prev) => Number(Math.min(prev + 0.15, 4.0).toFixed(2)));
  const handleZoomOut = () => setZoom((prev) => Number(Math.max(prev - 0.15, 0.2).toFixed(2)));
  const handleResetZoom = () => setZoom(1.0);
  const handleFitZoom = () => setFitCanvasTrigger((prev) => prev + 1);

  // Export handler
  const handleTriggerExport = (format: 'png' | 'jpeg' | 'pdf', transparent: boolean) => {
    setExportFormat(format);
    setTransparentBackground(transparent);
    setExportTrigger((prev) => prev + 1);
  };

  // Save Project as JSON file
  const handleSaveProject = () => {
    const projectData = {
      version: '1.0',
      savedAt: new Date().toISOString(),
      imageName,
      imageUrl,
      adjustments,
      transform,
      canvasHistory,
      layers,
    };
    const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${imageName.replace(/\.[^/.]+$/, '')}-project.imagestudio`;
    link.click();
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        handleResetZoom();
      } else if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        switch (e.key.toLowerCase()) {
          case 'v':
            setActiveTool('select');
            break;
          case 'h':
            setActiveTool('pan');
            break;
          case 'c':
            setActiveTool('crop');
            break;
          case 'f':
            setActiveTool('filters');
            break;
          case 'b':
            setActiveTool('brush');
            break;
          case 't':
            setActiveTool('text');
            window.dispatchEvent(new Event('image-studio:create-text-layer'));
            break;
          case 'e':
            setActiveTool('eraser');
            break;
          case 'i':
            setActiveTool('eyedropper');
            break;
          case 'u':
            setActiveTool('shapes');
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  useEffect(() => {
    const handleAddImageUrl = (e: Event) => {
      const { url, name } = (e as CustomEvent<{ url: string; name: string }>).detail;
      if (url) {
        pushHistory();
        addOverlayImageElement(url, name || 'Dropped Image');
      }
    };
    window.addEventListener('image-studio:add-image-url', handleAddImageUrl);
    return () => window.removeEventListener('image-studio:add-image-url', handleAddImageUrl);
  }, [pushHistory, canvasHistory]);

  useEffect(() => {
    const handleActivateEyedropper = () => {
      setActiveTool('eyedropper');
      setShowToolOptions(true);
    };
    const handleShowToolOptions = () => setShowToolOptions(true);
    const handleSelectToolEvent = (e: Event) => {
      const tool = (e as CustomEvent<ToolType>).detail;
      if (tool) {
        setActiveTool(tool);
        setShowToolOptions(true);
      }
    };

    const handleHideToolOptions = () => {
      setShowToolOptions(false);
    };

    window.addEventListener('image-studio:activate-eyedropper', handleActivateEyedropper);
    window.addEventListener('image-studio:show-tool-options', handleShowToolOptions);
    window.addEventListener('image-studio:hide-tool-options', handleHideToolOptions);
    window.addEventListener('image-studio:select-tool', handleSelectToolEvent);

    const handleToggleObjectLock = (e: Event) => {
      const { id, layerId, locked } = (e as CustomEvent<{ id: string; layerId?: string; locked?: boolean }>).detail;
      setLayers((prev) =>
        prev.map((l) => {
          if (l.id === id || (layerId && l.id === layerId)) {
            return { ...l, locked: locked !== undefined ? locked : !l.locked };
          }
          return l;
        })
      );
      setCanvasHistory((prev) => ({
        ...prev,
        imageElements: prev.imageElements?.map((img) =>
          img.id === id || (layerId && img.layerId === layerId)
            ? { ...img, locked: locked !== undefined ? locked : !img.locked }
            : img
        ),
        vectorShapes: prev.vectorShapes?.map((s) =>
          s.id === id || (layerId && s.layerId === layerId)
            ? { ...s, locked: locked !== undefined ? locked : !s.locked }
            : s
        ),
        textLayers: prev.textLayers?.map((t) =>
          t.id === id || (layerId && t.layerId === layerId)
            ? { ...t, locked: locked !== undefined ? locked : !t.locked }
            : t
        ),
      }));
      setCanvasHistoryToken((prev) => prev + 1);
    };
    window.addEventListener('image-studio:toggle-object-lock', handleToggleObjectLock);

    return () => {
      window.removeEventListener('image-studio:activate-eyedropper', handleActivateEyedropper);
      window.removeEventListener('image-studio:show-tool-options', handleShowToolOptions);
      window.removeEventListener('image-studio:hide-tool-options', handleHideToolOptions);
      window.removeEventListener('image-studio:select-tool', handleSelectToolEvent);
      window.removeEventListener('image-studio:toggle-object-lock', handleToggleObjectLock);
    };
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans antialiased">
      {/* Top Navbar */}
      <Navbar
        imageName={imageName}
        zoom={zoom}
        canUndo={historyStack.length > 0}
        canRedo={redoStack.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetZoom={handleResetZoom}
        onFitZoom={handleFitZoom}
        onImageUpload={handleImageUpload}
        onSelectSample={handleSelectSample}
        onExport={handleTriggerExport}
        onSaveProject={handleSaveProject}
        activeTool={activeTool}
        showToolOptions={showToolOptions}
        onToggleToolOptions={() => setShowToolOptions((prev) => !prev)}
        onToolOptionsHostChange={setToolOptionsHost}
      />

      {/* Main Studio Workspace */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Toolbar */}
        <ToolPalette
          activeTool={activeTool}
          onSelectTool={(tool) => {
            setActiveTool(tool);
            if (tool !== 'select') {
              setIsBaseImageSelected(false);
            }
            setShowToolOptions(true);
          }}
          selectedColor={selectedColor}
          isBaseImageSelected={isBaseImageSelected}
          onDeleteBaseImage={handleDeleteBaseImage}
          onSelectedColorChange={setSelectedColor}
          adjustments={adjustments}
          transform={transform}
          selectedPresetId={selectedPresetId}
          onUpdateAdjustments={handleUpdateAdjustments}
          onUpdateTransform={handleUpdateTransform}
          onApplyPreset={handleApplyPreset}
          onResetAdjustments={handleResetAdjustments}
          toolOptionsHost={toolOptionsHost}
          onImageUpload={handleImageUpload}
          onSelectSample={handleSelectSample}
        />

        {/* Central Canvas Viewport */}
        <Canvas
          imageUrl={imageUrl}
          imageName={imageName}
          canvasBgColor={canvasBgColor}
          onCanvasBgColorChange={setCanvasBgColor}
          zoom={zoom}
          fitCanvasTrigger={fitCanvasTrigger}
          activeTool={activeTool}
          adjustments={adjustments}
          transform={transform}
          layers={layers}
          selectedColor={selectedColor}
          onSelectedColorChange={setSelectedColor}
          canvasHistory={canvasHistory}
          canvasHistoryToken={canvasHistoryToken}
          onCanvasHistoryChange={handleCanvasHistoryChange}
          onImageDrop={handleImageUpload}
          onCropImage={handleCropImage}
          onBaseImageSelectionChange={setIsBaseImageSelected}
          onSelectTool={setActiveTool}
          onZoomChange={setZoom}
          exportTrigger={exportTrigger}
          exportFormat={exportFormat}
          transparentBackground={transparentBackground}
          onExportComplete={() => setExportTrigger(0)}
          toolOptionsHost={toolOptionsHost}
        />
      </div>
    </div>
  );
}
