import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { 
  ToolType, 
  ImageAdjustments, 
  ImageTransform,
  LayerItem,
} from '../types/studio';
import { 
  UploadCloud, 
  Move, 
  Crop, 
  Sparkles,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Trash2,
  Copy,
  CopyPlus,
  Check,
  RotateCcw,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Type as TypeIcon,
  Shapes as ShapesIcon,
  Pipette,
  Palette,
  Lock,
  Unlock
} from 'lucide-react';

interface ElementBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SmartGuidesResult {
  lines: Array<{ x1: number; y1: number; x2: number; y2: number }>;
  distances: Array<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    value: number;
    labelX: number;
    labelY: number;
    isEqual?: boolean;
    orientation: 'h' | 'v';
  }>;
}

function computeSmartGuides(
  activeBox: ElementBox,
  allBoxes: ElementBox[],
  canvasWidth: number,
  canvasHeight: number
): SmartGuidesResult {
  const result: SmartGuidesResult = { lines: [], distances: [] };
  if (!activeBox || canvasWidth <= 0 || canvasHeight <= 0) return result;
  const SNAP_THRESHOLD = 8;

  const others = allBoxes.filter((b) => b.id !== activeBox.id);
  if (others.length === 0) return result;

  const targetLeft = activeBox.x;
  const targetRight = activeBox.x + activeBox.width;
  const targetTop = activeBox.y;
  const targetBottom = activeBox.y + activeBox.height;
  const targetCx = activeBox.x + activeBox.width / 2;
  const targetCy = activeBox.y + activeBox.height / 2;

  // 1. Alignment Guides
  others.forEach((other) => {
    const oLeft = other.x;
    const oRight = other.x + other.width;
    const oTop = other.y;
    const oBottom = other.y + other.height;
    const oCx = other.x + other.width / 2;
    const oCy = other.y + other.height / 2;

    const xPairs = [
      [targetLeft, oLeft], [targetLeft, oRight], [targetLeft, oCx],
      [targetRight, oLeft], [targetRight, oRight], [targetRight, oCx],
      [targetCx, oCx], [targetCx, oLeft], [targetCx, oRight],
    ];

    for (const [tX, oX] of xPairs) {
      if (Math.abs(tX - oX) < SNAP_THRESHOLD) {
        const minY = Math.min(targetTop, oTop) - 15;
        const maxY = Math.max(targetBottom, oBottom) + 15;
        result.lines.push({ x1: oX, y1: minY, x2: oX, y2: maxY });
        break;
      }
    }

    const yPairs = [
      [targetTop, oTop], [targetTop, oBottom], [targetTop, oCy],
      [targetBottom, oTop], [targetBottom, oBottom], [targetBottom, oCy],
      [targetCy, oCy], [targetCy, oTop], [targetCy, oBottom],
    ];

    for (const [tY, oY] of yPairs) {
      if (Math.abs(tY - oY) < SNAP_THRESHOLD) {
        const minX = Math.min(targetLeft, oLeft) - 15;
        const maxX = Math.max(targetRight, oRight) + 15;
        result.lines.push({ x1: minX, y1: oY, x2: maxX, y2: oY });
        break;
      }
    }
  });

  // 2. Horizontal & Vertical Distances
  others.forEach((other) => {
    const oLeft = other.x;
    const oRight = other.x + other.width;
    const oTop = other.y;
    const oBottom = other.y + other.height;

    const midY = (Math.max(targetTop, oTop) + Math.min(targetBottom, oBottom)) / 2 || targetCy;
    const midX = (Math.max(targetLeft, oLeft) + Math.min(targetRight, oRight)) / 2 || targetCx;

    // Horizontal gaps
    if (targetLeft > oRight) {
      const gap = Math.round(targetLeft - oRight);
      if (gap > 0 && gap < 400) {
        result.distances.push({
          x1: oRight,
          y1: midY,
          x2: targetLeft,
          y2: midY,
          value: gap,
          labelX: (oRight + targetLeft) / 2,
          labelY: midY,
          orientation: 'h',
        });
      }
    } else if (oLeft > targetRight) {
      const gap = Math.round(oLeft - targetRight);
      if (gap > 0 && gap < 400) {
        result.distances.push({
          x1: targetRight,
          y1: midY,
          x2: oLeft,
          y2: midY,
          value: gap,
          labelX: (targetRight + oLeft) / 2,
          labelY: midY,
          orientation: 'h',
        });
      }
    }

    // Vertical gaps
    if (targetTop > oBottom) {
      const gap = Math.round(targetTop - oBottom);
      if (gap > 0 && gap < 400) {
        result.distances.push({
          x1: midX,
          y1: oBottom,
          x2: midX,
          y2: targetTop,
          value: gap,
          labelX: midX,
          labelY: (oBottom + targetTop) / 2,
          orientation: 'v',
        });
      }
    } else if (oTop > targetBottom) {
      const gap = Math.round(oTop - targetBottom);
      if (gap > 0 && gap < 400) {
        result.distances.push({
          x1: midX,
          y1: targetBottom,
          x2: midX,
          y2: oTop,
          value: gap,
          labelX: midX,
          labelY: (targetBottom + oTop) / 2,
          orientation: 'v',
        });
      }
    }
  });

  // 3. Equal-spacing detection
  if (result.distances.length >= 2) {
    for (let i = 0; i < result.distances.length; i++) {
      for (let j = i + 1; j < result.distances.length; j++) {
        if (Math.abs(result.distances[i].value - result.distances[j].value) <= 2) {
          result.distances[i].isEqual = true;
          result.distances[j].isEqual = true;
        }
      }
    }
  }

  return result;
}

interface CanvasProps {
  imageUrl: string;
  imageName: string;
  canvasBgColor?: string;
  onCanvasBgColorChange?: (color: string) => void;
  zoom: number;
  fitCanvasTrigger: number;
  activeTool: ToolType;
  adjustments: ImageAdjustments;
  transform: ImageTransform;
  layers: LayerItem[];
  selectedColor: string;
  onSelectedColorChange: (color: string) => void;
  canvasHistory: CanvasHistory;
  canvasHistoryToken: number;
  onCanvasHistoryChange: (snapshot: CanvasHistory) => void;
  onImageDrop: (file: File) => void;
  onCropImage: (croppedUrl: string, canvas: CanvasHistory) => void;
  onBaseImageSelectionChange: (selected: boolean) => void;
  onSelectTool: (tool: ToolType) => void;
  onZoomChange: (newZoom: number) => void;
  exportTrigger: number;
  exportFormat: 'png' | 'jpeg' | 'pdf';
  transparentBackground: boolean;
  onExportComplete: () => void;
  toolOptionsHost: HTMLElement | null;
}

export interface CanvasImageElement {
  id: string;
  layerId: string;
  url: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  adjustments?: ImageAdjustments;
  locked?: boolean;
}

export function getImageFilterString(adj?: Partial<ImageAdjustments>) {
  if (!adj) return 'none';
  const brightness = adj.brightness ?? 100;
  const contrast = adj.contrast ?? 100;
  const saturation = adj.saturation ?? 100;
  const exposure = adj.exposure ?? 0;
  const blur = adj.blur ?? 0;
  const hueRotate = adj.hueRotate ?? 0;
  const sepia = adj.sepia ?? 0;
  const grayscale = adj.grayscale ?? 0;
  const invert = adj.invert ?? 0;
  
  const exposureAdjustedBrightness = brightness * (2 ** (exposure / 50));

  return `brightness(${exposureAdjustedBrightness}%) contrast(${contrast}%) saturate(${saturation}%) blur(${blur}px) sepia(${sepia}%) grayscale(${grayscale}%) hue-rotate(${hueRotate}deg) invert(${invert}%)`;
}

export interface BlurStroke {
  layerId: string;
  points: { x: number; y: number }[];
  width: number;
  blurAmount: number;
}

export interface CanvasHistory {
  brushStrokes: BrushStroke[];
  eraserStrokes: EraserStroke[];
  textLayers: CanvasTextLayer[];
  vectorShapes: VectorShape[];
  imageElements?: CanvasImageElement[];
  blurStrokes?: BlurStroke[];
}

interface BrushStroke {
  layerId: string;
  points: { x: number; y: number }[];
  color: string;
  width: number;
  opacity?: number;
}

interface EraserStroke {
  layerId: string;
  points: { x: number; y: number }[];
  width: number;
  hardness?: number;
}

interface VectorShape {
  id: string;
  layerId: string;
  type: 'rectangle' | 'ellipse';
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  strokeWidth?: number;
  filled?: boolean;
  locked?: boolean;
}

interface CanvasTextLayer {
  id: string;
  layerId: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  width?: number;
  height?: number;
  fontFamily?: string;
  bold?: boolean;
  italic?: boolean;
  textAlign?: 'left' | 'center' | 'right';
  locked?: boolean;
}

const BRUSH_CURSOR = 'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2724%27 height=%2724%27 viewBox=%270 0 24 24%27%3E%3Ccircle cx=%2712%27 cy=%2712%27 r=%276%27 fill=%27none%27 stroke=%27white%27 stroke-width=%272%27/%3E%3Ccircle cx=%2712%27 cy=%2712%27 r=%277%27 fill=%27none%27 stroke=%27black%27 stroke-width=%271%27/%3E%3C/svg%3E") 12 12, crosshair';

function drawBrushStrokes(context: CanvasRenderingContext2D, strokes: BrushStroke[]) {
  strokes.forEach((stroke) => {
    if (stroke.points.length === 0) return;
    context.save();
    context.globalCompositeOperation = 'source-over';
    context.strokeStyle = stroke.color;
    context.fillStyle = stroke.color;
    context.globalAlpha = stroke.opacity ?? 1;
    context.lineWidth = stroke.width;
    context.lineCap = 'round';
    context.lineJoin = 'round';

    if (stroke.points.length === 1) {
      context.beginPath();
      context.arc(stroke.points[0].x, stroke.points[0].y, stroke.width / 2, 0, Math.PI * 2);
      context.fill();
    } else {
      context.beginPath();
      context.moveTo(stroke.points[0].x, stroke.points[0].y);
      stroke.points.slice(1).forEach((point) => context.lineTo(point.x, point.y));
      context.stroke();
    }
    context.restore();
  });
}

function drawTextLayers(context: CanvasRenderingContext2D, layers: CanvasTextLayer[]) {
  layers.forEach((layer) => {
    if (!layer.text) return;
    context.save();
    context.fillStyle = layer.color;
    context.font = `${layer.italic ? 'italic ' : ''}${layer.bold ? 'bold ' : ''}${layer.fontSize}px ${layer.fontFamily ?? 'Arial'}, sans-serif`;
    context.textBaseline = 'top';
    const lineHeight = layer.fontSize * 1.2;
    const maxWidth = layer.width ?? Math.max(layer.fontSize * 4, 160);
    const maxHeight = layer.height ?? Math.max(layer.fontSize * 2, 64);
    const textX = layer.textAlign === 'center' ? layer.x + maxWidth / 2 : layer.textAlign === 'right' ? layer.x + maxWidth : layer.x;
    context.textAlign = layer.textAlign ?? 'left';
    context.beginPath();
    context.rect(layer.x, layer.y, maxWidth, maxHeight);
    context.clip();
    let row = 0;
    layer.text.split('\n').forEach((paragraph) => {
      const words = paragraph.split(/\s+/).filter(Boolean);
      let line = '';
      words.forEach((word) => {
        const candidate = line ? `${line} ${word}` : word;
        if (line && context.measureText(candidate).width > maxWidth) {
          if (row * lineHeight < maxHeight) context.fillText(line, textX, layer.y + row * lineHeight);
          row += 1;
          line = word;
        } else {
          line = candidate;
        }
      });
      if (line && row * lineHeight < maxHeight) context.fillText(line, textX, layer.y + row * lineHeight);
      row += 1;
    });
    context.restore();
  });
}

function drawEraserStrokes(context: CanvasRenderingContext2D, strokes: EraserStroke[]) {
  strokes.forEach((stroke) => {
    if (stroke.points.length === 0) return;
    context.save();
    context.globalCompositeOperation = 'destination-out';
    context.strokeStyle = 'rgba(0,0,0,1)';
    context.fillStyle = 'rgba(0,0,0,1)';
    context.lineWidth = stroke.width;
    context.filter = (stroke.hardness ?? 100) < 100 ? `blur(${((100 - (stroke.hardness ?? 100)) / 100) * stroke.width / 5}px)` : 'none';
    context.lineCap = 'round';
    context.lineJoin = 'round';
    if (stroke.points.length === 1) {
      context.beginPath();
      context.arc(stroke.points[0].x, stroke.points[0].y, stroke.width / 2, 0, Math.PI * 2);
      context.fill();
    } else {
      context.beginPath();
      context.moveTo(stroke.points[0].x, stroke.points[0].y);
      stroke.points.slice(1).forEach((point) => context.lineTo(point.x, point.y));
      context.stroke();
    }
    context.restore();
  });
}

function drawVectorShapes(context: CanvasRenderingContext2D, shapes: VectorShape[]) {
  shapes.forEach((shape) => {
    context.save();
    context.strokeStyle = shape.color;
    context.fillStyle = shape.color;
    context.lineWidth = shape.strokeWidth ?? Math.max(2, Math.min(context.canvas.width, context.canvas.height) / 300);
    if (shape.type === 'ellipse') {
      context.beginPath();
      context.ellipse(
        shape.x + shape.width / 2,
        shape.y + shape.height / 2,
        Math.abs(shape.width / 2),
        Math.abs(shape.height / 2),
        0,
        0,
        Math.PI * 2,
      );
      if (shape.filled) context.fill();
      context.stroke();
    } else {
      if (shape.filled) context.fillRect(shape.x, shape.y, shape.width, shape.height);
      context.strokeRect(shape.x, shape.y, shape.width, shape.height);
    }
    context.restore();
  });
}

function createEraserMaskImage(strokes: EraserStroke[], width: number, height: number): string | undefined {
  if (!strokes.length || !width || !height) return undefined;
  const filters = strokes.map((stroke, index) => {
    const hardness = stroke.hardness ?? 100;
    if (hardness >= 100) return '';
    const blur = ((100 - hardness) / 100) * stroke.width / 5;
    return `<filter id="soft-${index}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${blur}"/></filter>`;
  }).join('');
  const maskContent = strokes.map((stroke, index) => {
    const filter = (stroke.hardness ?? 100) < 100 ? `filter="url(#soft-${index})"` : '';
    if (stroke.points.length === 1) {
      const point = stroke.points[0];
      return `<circle cx="${point.x}" cy="${point.y}" r="${stroke.width / 2}" fill="black" ${filter}/>`;
    }
    const points = stroke.points.map((point) => `${point.x},${point.y}`).join(' ');
    return `<polyline points="${points}" fill="none" stroke="black" stroke-width="${stroke.width}" stroke-linecap="round" stroke-linejoin="round" ${filter}/>`;
  }).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs>${filters}<mask id="erase-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="${width}" height="${height}"><rect width="${width}" height="${height}" fill="white"/>${maskContent}</mask></defs><rect width="${width}" height="${height}" fill="white" mask="url(#erase-mask)"/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

function createBlurMaskImage(strokes: BlurStroke[], width: number, height: number): string | undefined {
  if (!strokes.length || !width || !height) return undefined;
  const maskContent = strokes.map((stroke) => {
    if (stroke.points.length === 1) {
      const point = stroke.points[0];
      return `<circle cx="${point.x}" cy="${point.y}" r="${stroke.width / 2}" fill="white"/>`;
    }
    const points = stroke.points.map((point) => `${point.x},${point.y}`).join(' ');
    return `<polyline points="${points}" fill="none" stroke="white" stroke-width="${stroke.width}" stroke-linecap="round" stroke-linejoin="round"/>`;
  }).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><mask id="blur-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="${width}" height="${height}"><rect width="${width}" height="${height}" fill="black"/>${maskContent}</mask></defs><rect width="${width}" height="${height}" fill="white" mask="url(#blur-mask)"/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

function drawBlurStrokes(
  context: CanvasRenderingContext2D,
  strokes: BlurStroke[],
  img: HTMLImageElement | null,
  w: number,
  h: number
) {
  if (!strokes.length || !w || !h || !img) return;

  const strokesByBlur = new Map<number, BlurStroke[]>();
  strokes.forEach((stroke) => {
    const amount = stroke.blurAmount || 12;
    if (!strokesByBlur.has(amount)) strokesByBlur.set(amount, []);
    strokesByBlur.get(amount)!.push(stroke);
  });

  strokesByBlur.forEach((strokeList, blurAmount) => {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = h;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    tempCtx.filter = `blur(${blurAmount}px)`;
    tempCtx.drawImage(img, 0, 0, w, h);

    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = w;
    maskCanvas.height = h;
    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) return;

    maskCtx.fillStyle = '#000000';
    maskCtx.fillRect(0, 0, w, h);
    maskCtx.strokeStyle = '#ffffff';
    maskCtx.fillStyle = '#ffffff';
    maskCtx.lineCap = 'round';
    maskCtx.lineJoin = 'round';

    strokeList.forEach((stroke) => {
      maskCtx.lineWidth = stroke.width;
      if (stroke.points.length === 1) {
        maskCtx.beginPath();
        maskCtx.arc(stroke.points[0].x, stroke.points[0].y, stroke.width / 2, 0, Math.PI * 2);
        maskCtx.fill();
      } else if (stroke.points.length > 1) {
        maskCtx.beginPath();
        maskCtx.moveTo(stroke.points[0].x, stroke.points[0].y);
        stroke.points.slice(1).forEach((p) => maskCtx.lineTo(p.x, p.y));
        maskCtx.stroke();
      }
    });

    tempCtx.globalCompositeOperation = 'destination-in';
    tempCtx.drawImage(maskCanvas, 0, 0);

    context.save();
    context.globalCompositeOperation = 'source-over';
    context.drawImage(tempCanvas, 0, 0);
    context.restore();
  });
}

export const Canvas: React.FC<CanvasProps> = ({
  imageUrl,
  imageName,
  canvasBgColor = '#ffffff',
  onCanvasBgColorChange,
  zoom,
  fitCanvasTrigger,
  activeTool,
  adjustments,
  transform,
  layers,
  selectedColor,
  onSelectedColorChange,
  canvasHistory,
  canvasHistoryToken,
  onCanvasHistoryChange,
  onImageDrop,
  onCropImage,
  onBaseImageSelectionChange,
  onSelectTool,
  onZoomChange,
  exportTrigger,
  exportFormat,
  transparentBackground,
  onExportComplete,
  toolOptionsHost,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement>(null);
  const brushPointerRef = useRef<{ pointerId: number; strokeIndex: number } | null>(null);
  const eraserPointerRef = useRef<{ pointerId: number; strokeIndex: number } | null>(null);
  const textDragRef = useRef<{
    pointerId: number;
    layerId: string;
    mode: 'move' | 'resize';
    resizeHandle?: string;
    startPoint: { x: number; y: number };
    origin: { x: number; y: number };
    originFontSize: number;
    originWidth: number;
    originHeight: number;
    moved: boolean;
  } | null>(null);
  const textInputRef = useRef<HTMLTextAreaElement>(null);
  const selectTextOnEditRef = useRef(false);
  const shapePointerRef = useRef<number | null>(null);
  const shapeDragRef = useRef<{
    pointerId: number;
    mode: 'move' | 'resize';
    shapeId: string;
    resizeHandle?: 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'w' | 'e';
    startPoint: { x: number; y: number };
    origin: { x: number; y: number; width: number; height: number };
  } | null>(null);

  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isImageSelected, setIsImageSelected] = useState(false);
  const [isCanvasBackgroundSelected, setIsCanvasBackgroundSelected] = useState(false);
  const [isMovingImage, setIsMovingImage] = useState(false);
  const [imageOffset, setImageOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [imageDragStart, setImageDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [naturalDimensions, setNaturalDimensions] = useState<{ width: number; height: number }>({
    width: 1000,
    height: 700,
  });
  const [isDragOver, setIsDragOver] = useState(false);
  const [cropRect, setCropRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [cropInteraction, setCropInteraction] = useState<{
    mode: 'draw' | 'move' | 'resize';
    handle: string | null;
    pointerStart: { x: number; y: number };
    rectStart: { x: number; y: number; width: number; height: number };
  } | null>(null);
  const [cropError, setCropError] = useState<string | null>(null);
  const [isApplyingCrop, setIsApplyingCrop] = useState(false);
  const [brushStrokes, setBrushStrokes] = useState<BrushStroke[]>([]);
  const [eraserStrokes, setEraserStrokes] = useState<EraserStroke[]>([]);
  const [blurStrokes, setBlurStrokes] = useState<BlurStroke[]>(canvasHistory.blurStrokes || []);
  const [brushSize, setBrushSize] = useState(5);
  const [brushOpacity, setBrushOpacity] = useState(100);
  const [eraserSize, setEraserSize] = useState(32);
  const [eraserHardness, setEraserHardness] = useState(100);
  const [blurBrushSize, setBlurBrushSize] = useState(24);
  const [blurIntensity, setBlurIntensity] = useState(12);
  const blurPointerRef = useRef<{ pointerId: number; strokeIndex: number } | null>(null);
  const [textDefaults, setTextDefaults] = useState<Pick<CanvasTextLayer, 'fontSize' | 'fontFamily' | 'bold' | 'italic' | 'textAlign'>>({ fontSize: 48, fontFamily: 'Arial', bold: false, italic: false, textAlign: 'left' });
  const [shapeDefaults, setShapeDefaults] = useState({ type: 'rectangle' as 'rectangle' | 'ellipse', filled: false, strokeWidth: 4 });
  const [textLayers, setTextLayers] = useState<CanvasTextLayer[]>([]);
  const [vectorShapes, setVectorShapes] = useState<VectorShape[]>([]);
  const [imageElements, setImageElements] = useState<CanvasImageElement[]>(canvasHistory.imageElements || []);
  const [shapeDraft, setShapeDraft] = useState<VectorShape | null>(null);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [selectedImageElementId, setSelectedImageElementId] = useState<string | null>(null);
  const imageElementDragRef = useRef<{ pointerId: number; mode: 'move' | 'resize'; id: string; resizeHandle?: string; startPoint: { x: number; y: number }; origin: { x: number; y: number; width: number; height: number } } | null>(null);

  const isImageElementLocked = (imgEl?: CanvasImageElement | null) => {
    if (!imgEl) return false;
    if (imgEl.locked) return true;
    const layer = layers.find((l) => l.id === imgEl.layerId);
    return Boolean(layer?.locked);
  };

  const isShapeLocked = (shape?: VectorShape | null) => {
    if (!shape) return false;
    if (shape.locked) return true;
    const layer = layers.find((l) => l.id === shape.layerId);
    return Boolean(layer?.locked);
  };

  const isTextLocked = (text?: CanvasTextLayer | null) => {
    if (!text) return false;
    if (text.locked) return true;
    const layer = layers.find((l) => l.id === text.layerId);
    return Boolean(layer?.locked);
  };

  const baseImageLayer = layers.find((layer) => layer.type === 'image');
  const adjustmentLayer = layers.find((layer) => layer.type === 'adjustment');
  const activeOverlayLayer = [...layers].reverse().find((layer) => layer.type === 'overlay' && layer.visible && !layer.locked);
  const visibleLayerIds = new Set(layers.filter((layer) => layer.visible).map((layer) => layer.id));
  const visibleBrushStrokes = brushStrokes.filter((stroke) => visibleLayerIds.has(stroke.layerId));
  const visibleEraserStrokes = eraserStrokes.filter((stroke) => visibleLayerIds.has(stroke.layerId));
  const visibleBlurStrokes = blurStrokes.filter((stroke) => visibleLayerIds.has(stroke.layerId));
  const visibleTextLayers = textLayers.filter((layer) => visibleLayerIds.has(layer.layerId));
  const visibleVectorShapes = vectorShapes.filter((shape) => visibleLayerIds.has(shape.layerId));
  const visibleImageElements = imageElements.filter((imgEl) => visibleLayerIds.has(imgEl.layerId));
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const activeSelShape = vectorShapes.find((s) => s.id === selectedShapeId && !isShapeLocked(s));
  const activeSelImgEl = imageElements.find((e) => e.id === selectedImageElementId && !isImageElementLocked(e));
  const activeSelTxt = textLayers.find((t) => t.id === selectedTextId && !isTextLocked(t));
  const activeElement = activeSelShape || activeSelImgEl || activeSelTxt || (isImageSelected && !baseImageLayer?.locked ? { id: 'base', x: 0, y: 0, width: naturalDimensions.width || 1000, height: naturalDimensions.height || 700 } : null);
  useEffect(() => {
    console.log("Active Element Updated:", activeElement);
  }, [activeElement]);
  const [activeGuides, setActiveGuides] = useState<SmartGuidesResult>({ lines: [], distances: [] });
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);
  const copiedItemRef = useRef<{ type: 'text' | 'shape' | 'imageElement'; data: any } | null>(null);
  const exposureAdjustedBrightness = adjustments.brightness * (2 ** (adjustments.exposure / 50));

  useEffect(() => {
    setImageElements(canvasHistory.imageElements || []);
  }, [canvasHistoryToken, canvasHistory.imageElements]);

  useEffect(() => {
    if (!selectedImageElementId) return;
    setImageElements((prev) => {
      const current = prev.find((e) => e.id === selectedImageElementId);
      if (!current) return prev;
      if (
        current.adjustments &&
        JSON.stringify(current.adjustments) === JSON.stringify(adjustments)
      ) {
        return prev;
      }
      const updated = prev.map((e) =>
        e.id === selectedImageElementId ? { ...e, adjustments: { ...adjustments } } : e
      );
      reportCanvasHistory({ imageElements: updated });
      return updated;
    });
  }, [adjustments, selectedImageElementId]);

  const reportCanvasHistory = (snapshot?: Partial<CanvasHistory>) => {
    onCanvasHistoryChange({
      brushStrokes,
      eraserStrokes,
      blurStrokes,
      textLayers,
      vectorShapes,
      imageElements,
      ...snapshot,
    });
  };

  useEffect(() => {
    const handleClearBlur = () => {
      setBlurStrokes([]);
      reportCanvasHistory({ blurStrokes: [] });
    };
    window.addEventListener('image-studio:clear-selective-blur', handleClearBlur);
    return () => window.removeEventListener('image-studio:clear-selective-blur', handleClearBlur);
  }, [brushStrokes, eraserStrokes, textLayers, vectorShapes, imageElements]);

  useEffect(() => {
    const handleToolOption = (event: Event) => {
      const { tool, key, value } = (event as CustomEvent<{ tool: string; key: string; value: number | string | boolean }>).detail;
      if (tool === 'brush' && key === 'size') setBrushSize(Number(value));
      if (tool === 'brush' && key === 'opacity') setBrushOpacity(Number(value));
      if (tool === 'eraser' && key === 'size') setEraserSize(Number(value));
      if (tool === 'eraser' && key === 'hardness') setEraserHardness(Number(value));
      if (tool === 'blur' && key === 'size') setBlurBrushSize(Number(value));
      if (tool === 'blur' && key === 'intensity') setBlurIntensity(Number(value));
      if (tool === 'shape' && key === 'type') setShapeDefaults((current) => ({ ...current, type: value as 'rectangle' | 'ellipse' }));
      if (tool === 'shape' && key === 'filled') setShapeDefaults((current) => ({ ...current, filled: Boolean(value) }));
      if (tool === 'shape' && key === 'strokeWidth') setShapeDefaults((current) => ({ ...current, strokeWidth: Number(value) }));
      if (tool === 'shape' && selectedShapeId) {
        const shape = vectorShapes.find((item) => item.id === selectedShapeId);
        if (!shape || layers.find((layer) => layer.id === shape.layerId)?.locked) return;
        const shapeUpdate: Partial<VectorShape> = key === 'type'
          ? { type: value as 'rectangle' | 'ellipse' }
          : key === 'filled'
            ? { filled: Boolean(value) }
            : key === 'strokeWidth'
              ? { strokeWidth: Number(value) }
              : {};
        if (Object.keys(shapeUpdate).length) {
          const updatedShapes = vectorShapes.map((item) => item.id === selectedShapeId ? { ...item, ...shapeUpdate } : item);
          setVectorShapes(updatedShapes);
          reportCanvasHistory({ vectorShapes: updatedShapes });
        }
      }
      if (tool !== 'text') return;

      let textUpdate: Partial<CanvasTextLayer> = {};
      if (key === 'fontSize') textUpdate = { fontSize: Number(value) };
      if (key === 'fontFamily') textUpdate = { fontFamily: String(value) };
      if (key === 'bold') textUpdate = { bold: Boolean(value) };
      if (key === 'italic') textUpdate = { italic: Boolean(value) };
      if (key === 'textAlign') textUpdate = { textAlign: value as 'left' | 'center' | 'right' };
      if (key === 'color') textUpdate = { color: String(value) };
      if (!Object.keys(textUpdate).length) return;
      if (selectedTextId && layers.find((layer) => layer.id === textLayers.find((item) => item.id === selectedTextId)?.layerId)?.locked) return;
      setTextDefaults((current) => ({ ...current, ...textUpdate }));
      if (selectedTextId) {
        const updatedTextLayers = textLayers.map((layer) => layer.id === selectedTextId ? { ...layer, ...textUpdate } : layer);
        setTextLayers(updatedTextLayers);
        reportCanvasHistory({ textLayers: updatedTextLayers });
      }
    };
    window.addEventListener('image-studio:tool-option', handleToolOption);
    return () => window.removeEventListener('image-studio:tool-option', handleToolOption);
  }, [selectedTextId, selectedShapeId, vectorShapes, textLayers, layers]);

  useEffect(() => {
    setIsImageSelected(false);
    onBaseImageSelectionChange(false);
    setIsMovingImage(false);
    setImageOffset({ x: 0, y: 0 });
    setCropRect(null);
    setCropInteraction(null);
    setCropError(null);
    brushPointerRef.current = null;
    eraserPointerRef.current = null;
    textDragRef.current = null;
    setShapeDraft(null);
    shapePointerRef.current = null;
    setEditingTextId(null);
  }, [imageUrl, onBaseImageSelectionChange]);

  useEffect(() => {
    if (activeTool !== 'text' && activeTool !== 'select') {
      setSelectedTextId(null);
      setEditingTextId(null);
    }
    if (activeTool !== 'shapes' && activeTool !== 'select') {
      setSelectedShapeId(null);
      setShapeDraft(null);
    }
    if (activeTool !== 'select') {
      setIsImageSelected(false);
      onBaseImageSelectionChange(false);
      setIsMovingImage(false);
    }
    if (activeTool !== 'crop') {
      setCropInteraction(null);
    }
  }, [activeTool, onBaseImageSelectionChange]);

  useEffect(() => {
    setBrushStrokes(canvasHistory.brushStrokes);
    setEraserStrokes(canvasHistory.eraserStrokes);
    setTextLayers(canvasHistory.textLayers);
    const restoredShapes = canvasHistory.vectorShapes.map((shape, index) => ({
      ...shape,
      id: shape.id || `shape-restored-${canvasHistoryToken}-${index}`,
    }));
    setVectorShapes(restoredShapes);
    setSelectedShapeId((current) => restoredShapes.some((shape) => shape.id === current) ? current : null);
    setSelectedTextId((current) => canvasHistory.textLayers.some((layer) => layer.id === current) ? current : null);
    setShapeDraft(null);
    brushPointerRef.current = null;
    eraserPointerRef.current = null;
    shapePointerRef.current = null;
    shapeDragRef.current = null;
    textDragRef.current = null;
  }, [canvasHistoryToken]);

  useEffect(() => {
    if (fitCanvasTrigger === 0) return;
    const viewport = containerRef.current;
    const frame = imageContainerRef.current;
    if (!viewport || !frame || !frame.offsetWidth || !frame.offsetHeight) return;

    const rotated = transform.rotation % 180 !== 0;
    const imageWidth = (rotated ? frame.offsetHeight : frame.offsetWidth) * transform.scale;
    const imageHeight = (rotated ? frame.offsetWidth : frame.offsetHeight) * transform.scale;
    const availableWidth = Math.max(1, viewport.clientWidth - 48);
    const availableHeight = Math.max(1, viewport.clientHeight - 64);
    const fitZoom = Math.min(availableWidth / imageWidth, availableHeight / imageHeight, 3);
    onZoomChange(Number(Math.max(0.2, fitZoom).toFixed(2)));
    setPanOffset({ x: 0, y: 0 });
  }, [fitCanvasTrigger, transform.rotation, transform.scale, onZoomChange]);

  useEffect(() => {
    if (!editingTextId) return;
    textInputRef.current?.focus();
    if (selectTextOnEditRef.current) {
      textInputRef.current?.select();
      selectTextOnEditRef.current = false;
    }
  }, [editingTextId]);

  useEffect(() => {
    const addTextLayer = (e?: Event) => {
      const detail = (e as CustomEvent<{
        text?: string;
        fontSize?: number;
        color?: string;
        width?: number;
        height?: number;
        x?: number;
        y?: number;
      }>)?.detail;

      const canvasW = naturalDimensions.width || 1000;
      const canvasH = naturalDimensions.height || 700;
      const targetLayer = activeOverlayLayer || layers.find((l) => l.type === 'overlay') || layers[0];
      const width = detail?.width ?? 300;
      const height = detail?.height ?? 60;
      const existingCount = textLayers.length;
      const offset = (existingCount % 6) * 25;
      const x = detail?.x ?? Math.max(20, Math.min(200 + offset, canvasW - width - 20));
      const y = detail?.y ?? Math.max(20, Math.min(200 + offset, canvasH - height - 20));

      const newLayer: CanvasTextLayer = {
        id: `text-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        layerId: targetLayer ? targetLayer.id : 'layer-overlay',
        text: detail?.text ?? 'Double click to edit',
        x,
        y,
        width,
        height,
        fontSize: detail?.fontSize ?? 32,
        fontFamily: textDefaults.fontFamily || 'Arial',
        bold: textDefaults.bold || false,
        italic: textDefaults.italic || false,
        textAlign: textDefaults.textAlign || 'left',
        color: detail?.color ?? selectedColor ?? '#000000',
        locked: false,
      };

      const updatedTextLayers = [...textLayers, newLayer];
      setTextLayers(updatedTextLayers);
      reportCanvasHistory({ textLayers: updatedTextLayers });
      setSelectedTextId(newLayer.id);
      setSelectedShapeId(null);
      setSelectedImageElementId(null);
      setIsImageSelected(false);
      setIsCanvasBackgroundSelected(false);
      onBaseImageSelectionChange(false);
      onSelectTool('select');
      window.dispatchEvent(new Event('image-studio:show-tool-options'));
    };
    window.addEventListener('image-studio:create-text-layer', addTextLayer);
    return () => window.removeEventListener('image-studio:create-text-layer', addTextLayer);
  }, [activeOverlayLayer, layers, naturalDimensions, selectedColor, textDefaults, textLayers, onBaseImageSelectionChange, onSelectTool]);

  useEffect(() => {
    const handleCreateShape = (e: Event) => {
      const detail = (e as CustomEvent<{
        type?: 'rectangle' | 'ellipse';
        filled?: boolean;
        width?: number;
        height?: number;
        strokeWidth?: number;
        color?: string;
      }>).detail || {};

      const shapeType = detail.type || 'rectangle';
      const filled = detail.filled ?? false;
      const strokeWidth = detail.strokeWidth ?? 4;
      const color = detail.color ?? selectedColor ?? '#4f46e5';

      const canvasW = naturalDimensions.width || 1000;
      const canvasH = naturalDimensions.height || 700;
      const width = detail.width ?? (shapeType === 'ellipse' ? 180 : 220);
      const height = detail.height ?? (shapeType === 'ellipse' ? 180 : 150);

      const existingCount = vectorShapes.length;
      const offset = (existingCount % 6) * 25;
      const x = Math.max(20, Math.round((canvasW - width) / 2) + offset);
      const y = Math.max(20, Math.round((canvasH - height) / 2) + offset);

      const targetLayer = activeOverlayLayer || layers.find((l) => l.type === 'overlay') || layers[0];
      const newShape: VectorShape = {
        id: `shape-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        layerId: targetLayer ? targetLayer.id : 'layer-overlay',
        type: shapeType,
        x,
        y,
        width,
        height,
        color,
        filled,
        strokeWidth,
        locked: false,
      };

      const updated = [...vectorShapes, newShape];
      setVectorShapes(updated);
      reportCanvasHistory({ vectorShapes: updated });
      setSelectedShapeId(newShape.id);
      setSelectedImageElementId(null);
      setSelectedTextId(null);
      setIsImageSelected(false);
      onBaseImageSelectionChange(false);
      onSelectTool('select');
      window.dispatchEvent(new Event('image-studio:show-tool-options'));
    };

    window.addEventListener('image-studio:create-shape', handleCreateShape);
    return () => window.removeEventListener('image-studio:create-shape', handleCreateShape);
  }, [activeOverlayLayer, layers, naturalDimensions, selectedColor, vectorShapes, onBaseImageSelectionChange, onSelectTool]);

  useEffect(() => {
    if (activeTool !== 'crop') {
      setCropRect(null);
      setCropInteraction(null);
      setCropError(null);
      return;
    }

    const image = imageRef.current;
    if (!cropRect && image?.clientWidth && image.clientHeight) {
      const marginX = image.clientWidth * 0.1;
      const marginY = image.clientHeight * 0.1;
      setCropRect({
        x: marginX,
        y: marginY,
        width: image.clientWidth - marginX * 2,
        height: image.clientHeight - marginY * 2,
      });
    }
  }, [activeTool, naturalDimensions, cropRect]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Space') return;
      const target = event.target as HTMLElement | null;
      if (target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(target?.tagName ?? '')) {
        return;
      }
      event.preventDefault();
      setIsSpacePressed(true);
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space') setIsSpacePressed(false);
    };
    const handleWindowBlur = () => setIsSpacePressed(false);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleWindowBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, []);

  // Handle Export to file via hidden Canvas
  useEffect(() => {
    if (exportTrigger === 0) return;

    const img = imageRef.current;
    const canvas = hiddenCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = img?.naturalWidth || naturalDimensions.width || 1000;
    const h = img?.naturalHeight || naturalDimensions.height || 700;

    const isRotated90or270 = transform.rotation === 90 || transform.rotation === 270;
    canvas.width = Math.max(1, Math.round((isRotated90or270 ? h : w) * transform.scale));
    canvas.height = Math.max(1, Math.round((isRotated90or270 ? w : h) * transform.scale));

    if (exportFormat !== 'png' || !transparentBackground) {
      ctx.fillStyle = canvasBgColor || '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((transform.rotation * Math.PI) / 180);
    ctx.scale(
      transform.flipHorizontal ? -1 : 1,
      transform.flipVertical ? -1 : 1
    );
    ctx.scale(transform.scale, transform.scale);

    const filterString = `
      brightness(${exposureAdjustedBrightness}%)
      contrast(${adjustments.contrast}%)
      saturate(${adjustments.saturation}%)
      blur(${adjustments.blur}px)
      sepia(${adjustments.sepia}%)
      grayscale(${adjustments.grayscale}%)
      hue-rotate(${adjustments.hueRotate}deg)
      invert(${adjustments.invert}%)
    `.trim();

    ctx.filter = adjustmentLayer?.visible === false ? 'none' : filterString;

    if (baseImageLayer?.visible === true && img) ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.save();
    ctx.translate(-w / 2, -h / 2);
    if (baseImageLayer?.visible === true && visibleBlurStrokes.length > 0) {
      drawBlurStrokes(ctx, visibleBlurStrokes, img, w, h);
    }
    drawBrushStrokes(ctx, visibleBrushStrokes);
    ctx.globalCompositeOperation = 'destination-out';
    drawEraserStrokes(ctx, visibleEraserStrokes);
    ctx.globalCompositeOperation = 'source-over';
    drawTextLayers(ctx, visibleTextLayers);
    drawVectorShapes(ctx, [...visibleVectorShapes, ...(shapeDraft && visibleLayerIds.has(shapeDraft.layerId) ? [shapeDraft] : [])]);
    visibleImageElements.forEach((imgEl) => {
      const elImg = new Image();
      elImg.src = imgEl.url;
      try {
        ctx.save();
        if (imgEl.adjustments) {
          ctx.filter = getImageFilterString(imgEl.adjustments);
        } else {
          ctx.filter = 'none';
        }
        ctx.drawImage(elImg, imgEl.x, imgEl.y, imgEl.width, imgEl.height);
        ctx.restore();
      } catch {
        // ignore
      }
    });
    ctx.restore();
    ctx.restore();

    if (exportFormat === 'pdf') {
      try {
        const pageImage = canvas.toDataURL('image/jpeg', 0.95);
        const baseName = imageName.replace(/\.[^/.]+$/, '');
        void import('jspdf').then(({ jsPDF }) => {
          const pdf = new jsPDF({
            orientation: canvas.width >= canvas.height ? 'landscape' : 'portrait',
            unit: 'pt',
            format: [canvas.width, canvas.height],
            compress: true,
          });
          pdf.addImage(pageImage, 'JPEG', 0, 0, canvas.width, canvas.height);
          pdf.save(`${baseName || 'studio-export'}-edited.pdf`);
          onExportComplete();
        }).catch(() => {
          if (img?.src) window.open(img.src, '_blank');
          onExportComplete();
        });
      } catch {
        if (img?.src) window.open(img.src, '_blank');
        onExportComplete();
      }
      return;
    }

    try {
      const link = document.createElement('a');
      const baseName = imageName.replace(/\.[^/.]+$/, "");
      const mimeType = exportFormat === 'jpeg' ? 'image/jpeg' : 'image/png';
      const dataUrl = canvas.toDataURL(mimeType, exportFormat === 'jpeg' ? 0.92 : undefined);
      link.download = `${baseName || 'studio-export'}-edited.${exportFormat === 'jpeg' ? 'jpg' : 'png'}`;
      link.href = dataUrl;
      link.click();
    } catch {
      if (img?.src) window.open(img.src, '_blank');
    }

    onExportComplete();
  }, [exportTrigger, exportFormat, transparentBackground, shapeDraft, vectorShapes, brushStrokes, eraserStrokes, textLayers, layers]);

  const cssFilter = adjustmentLayer?.visible === false ? 'none' : `
    brightness(${exposureAdjustedBrightness}%)
    contrast(${adjustments.contrast}%)
    saturate(${adjustments.saturation}%)
    blur(${adjustments.blur}px)
    sepia(${adjustments.sepia}%)
    grayscale(${adjustments.grayscale}%)
    hue-rotate(${adjustments.hueRotate}deg)
    invert(${adjustments.invert}%)
  `;

  const cssTransform = `
    scale(${zoom})
    translate(${(panOffset.x + imageOffset.x) / zoom}px, ${(panOffset.y + imageOffset.y) / zoom}px)
    rotate(${transform.rotation}deg)
    scale(${transform.scale})
    scaleX(${transform.flipHorizontal ? -1 : 1})
    scaleY(${transform.flipVertical ? -1 : 1})
  `;
  const eraserMaskImage = createEraserMaskImage(
    visibleEraserStrokes,
    naturalDimensions.width,
    naturalDimensions.height,
  );

  const handleDeselect = () => {
    setSelectedShapeId(null);
    setSelectedImageElementId(null);
    setSelectedTextId(null);
    setEditingTextId(null);
    setIsImageSelected(false);
    onBaseImageSelectionChange(false);
    setIsCanvasBackgroundSelected(false);
    window.dispatchEvent(new Event('image-studio:hide-tool-options'));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // If an element, image, or text drag/resize operation is active, do not move canvas or base image
    if (shapeDragRef.current || imageElementDragRef.current || textDragRef.current) {
      return;
    }

    const targetEl = e.target as Element;
    if (
      targetEl.closest?.('[data-shape-id]') ||
      targetEl.closest?.('[data-shape-resize]') ||
      targetEl.closest?.('[data-image-element-id]') ||
      targetEl.closest?.('[data-img-resize]') ||
      targetEl.closest?.('[data-text-id]') ||
      targetEl.closest?.('[data-text-layer]') ||
      targetEl.closest?.('[data-corner-resize]') ||
      targetEl.closest?.('[data-floating-toolbar]') ||
      targetEl.closest?.('button') ||
      targetEl.closest?.('input') ||
      targetEl.closest?.('textarea')
    ) {
      return;
    }

    // Clicking on blank canvas background deselects active element and activates canvas color toolbar
    setSelectedShapeId(null);
    setSelectedImageElementId(null);
    setSelectedTextId(null);
    setEditingTextId(null);
    setIsImageSelected(false);
    onBaseImageSelectionChange(false);
    setIsCanvasBackgroundSelected(true);
    window.dispatchEvent(new Event('image-studio:hide-tool-options'));

    if (activeTool === 'pan' || e.button === 1 || (isSpacePressed && e.button === 0)) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      return;
    }

    if (activeTool === 'select') {
      const clickedImage = Boolean(imageContainerRef.current?.contains(e.target as Node));
      if (baseImageLayer?.locked) {
        setIsImageSelected(false);
        onBaseImageSelectionChange(false);
        return;
      }
      const selectBaseImage = clickedImage && baseImageLayer?.visible === true && !targetEl.closest?.('svg');
      setIsImageSelected(selectBaseImage);
      onBaseImageSelectionChange(selectBaseImage);
      if (selectBaseImage) {
        e.preventDefault();
        setIsMovingImage(true);
        setImageDragStart({ x: e.clientX - imageOffset.x, y: e.clientY - imageOffset.y });
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (shapeDragRef.current || imageElementDragRef.current || textDragRef.current) {
      return;
    }

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setCursorPos({
        x: Math.round(e.clientX - rect.left),
        y: Math.round(e.clientY - rect.top),
      });
    }

    if (isDragging) {
      setPanOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }

    if (isMovingImage) {
      setImageOffset({
        x: e.clientX - imageDragStart.x,
        y: e.clientY - imageDragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsMovingImage(false);
  };

  const getCropPoint = (clientX: number, clientY: number, clamp = false) => {
    const frame = imageContainerRef.current;
    if (!frame) return null;

    const image = imageRef.current;
    const width = image?.clientWidth || frame.offsetWidth || 1000;
    const height = image?.clientHeight || frame.offsetHeight || 700;

    const bounds = frame.getBoundingClientRect();
    const matrix = new DOMMatrix(getComputedStyle(frame).transform);
    const linearMatrix = new DOMMatrix([matrix.a, matrix.b, matrix.c, matrix.d, 0, 0]);
    const localPoint = linearMatrix.inverse().transformPoint(new DOMPoint(
      clientX - (bounds.left + bounds.width / 2),
      clientY - (bounds.top + bounds.height / 2),
    ));

    const offsetLeft = image ? image.offsetLeft + image.clientLeft : 0;
    const offsetTop = image ? image.offsetTop + image.clientTop : 0;

    const rawX = localPoint.x + frame.offsetWidth / 2 - offsetLeft;
    const rawY = localPoint.y + frame.offsetHeight / 2 - offsetTop;

    if (clamp) {
      return {
        x: Math.min(width, Math.max(0, rawX)),
        y: Math.min(height, Math.max(0, rawY)),
      };
    }

    return {
      x: rawX,
      y: rawY,
    };
  };

  const applyColorToSelection = (color: string) => {
    if (selectedTextId) {
      const updated = textLayers.map((l) => l.id === selectedTextId ? { ...l, color } : l);
      setTextLayers(updated);
      reportCanvasHistory({ textLayers: updated });
    } else if (selectedShapeId) {
      const updated = vectorShapes.map((s) => s.id === selectedShapeId ? { ...s, color } : s);
      setVectorShapes(updated);
      reportCanvasHistory({ vectorShapes: updated });
    }
  };

  const triggerFindColor = () => {
    if (typeof window !== 'undefined' && 'EyeDropper' in window) {
      try {
        const dropper = new (window as any).EyeDropper();
        dropper.open().then((res: { sRGBHex: string }) => {
          if (res?.sRGBHex) {
            const color = res.sRGBHex;
            onSelectedColorChange(color);
            window.dispatchEvent(new CustomEvent('image-studio:selected-color', { detail: color }));
            applyColorToSelection(color);
          }
        }).catch(() => {
          onSelectTool('eyedropper');
        });
      } catch {
        onSelectTool('eyedropper');
      }
    } else {
      onSelectTool('eyedropper');
    }
  };

  const handlePickColor = (e: React.PointerEvent<HTMLElement> | React.MouseEvent<HTMLElement>) => {
    const image = imageRef.current;
    const localPoint = getCropPoint(e.clientX, e.clientY);
    if (!image || !localPoint || !imageUrl) {
      const hex = canvasBgColor || '#ffffff';
      onSelectedColorChange(hex);
      window.dispatchEvent(new CustomEvent('image-studio:selected-color', { detail: hex }));
      applyColorToSelection(hex);
      return;
    }

    const w = image.naturalWidth || image.clientWidth || 800;
    const h = image.naturalHeight || image.clientHeight || 600;
    const scaleX = w / (image.clientWidth || 1);
    const scaleY = h / (image.clientHeight || 1);
    const x = Math.min(w - 1, Math.max(0, Math.floor(localPoint.x * scaleX)));
    const y = Math.min(h - 1, Math.max(0, Math.floor(localPoint.y * scaleY)));

    const sampler = document.createElement('canvas');
    sampler.width = w;
    sampler.height = h;
    const context = sampler.getContext('2d', { willReadFrequently: true });
    if (!context) {
      const hex = canvasBgColor || '#ffffff';
      onSelectedColorChange(hex);
      window.dispatchEvent(new CustomEvent('image-studio:selected-color', { detail: hex }));
      applyColorToSelection(hex);
      return;
    }

    try {
      if (baseImageLayer?.visible === true && imageUrl) context.drawImage(image, 0, 0, w, h);
      context.save();
      drawBrushStrokes(context, visibleBrushStrokes);
      context.globalCompositeOperation = 'destination-out';
      drawEraserStrokes(context, visibleEraserStrokes);
      context.globalCompositeOperation = 'source-over';
      drawTextLayers(context, visibleTextLayers);
      drawVectorShapes(context, [...visibleVectorShapes, ...(shapeDraft && visibleLayerIds.has(shapeDraft.layerId) ? [shapeDraft] : [])]);
      context.restore();

      const sampledCanvas = document.createElement('canvas');
      sampledCanvas.width = w;
      sampledCanvas.height = h;
      const sampledContext = sampledCanvas.getContext('2d', { willReadFrequently: true });
      if (!sampledContext) throw new Error('Could not prepare this image pixel.');
      sampledContext.filter = adjustmentLayer?.visible === false
        ? 'none'
        : `brightness(${exposureAdjustedBrightness}%) contrast(${adjustments.contrast}%) saturate(${adjustments.saturation}%) blur(${adjustments.blur}px) sepia(${adjustments.sepia}%) grayscale(${adjustments.grayscale}%) hue-rotate(${adjustments.hueRotate}deg) invert(${adjustments.invert}%)`;
      sampledContext.drawImage(sampler, 0, 0);
      const [red, green, blue] = sampledContext.getImageData(x, y, 1, 1).data;
      const hex = `#${[red, green, blue].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
      onSelectedColorChange(hex);
      window.dispatchEvent(new CustomEvent('image-studio:selected-color', { detail: hex }));
      applyColorToSelection(hex);
      window.dispatchEvent(new CustomEvent('image-studio:eyedropper-error', { detail: '' }));
    } catch {
      triggerFindColor();
    }
  };

  const getCanvasDimensions = () => {
    const frame = imageContainerRef.current;
    const image = imageRef.current;
    const canvasW = image?.clientWidth || frame?.offsetWidth || 1000;
    const canvasH = image?.clientHeight || frame?.offsetHeight || 700;
    const natW = naturalDimensions.width || 1000;
    const natH = naturalDimensions.height || 700;
    return { canvasW, canvasH, natW, natH };
  };

  const handleShapeGroupPointerDown = (e: React.PointerEvent<SVGElement>, shape: VectorShape) => {
    if (isShapeLocked(shape)) return;
    const { canvasW, canvasH, natW, natH } = getCanvasDimensions();
    const point = getCropPoint(e.clientX, e.clientY);
    if (!point) return;
    const x = point.x * natW / (canvasW || 1);
    const y = point.y * natH / (canvasH || 1);

    const target = e.target as Element;
    const resizeHandle = target.closest<Element>('[data-shape-resize], [data-corner-resize]')?.getAttribute('data-shape-resize') as 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'w' | 'e' | null;

    setSelectedShapeId(shape.id);
    setSelectedImageElementId(null);
    setSelectedTextId(null);
    setIsCanvasBackgroundSelected(false);
    setIsImageSelected(false);
    onBaseImageSelectionChange(false);
    setIsMovingImage(false);
    setIsDragging(false);
    onSelectTool('select');
    window.dispatchEvent(new Event('image-studio:show-tool-options'));

    shapeDragRef.current = {
      pointerId: e.pointerId,
      mode: resizeHandle ? 'resize' : 'move',
      shapeId: shape.id,
      resizeHandle: resizeHandle ?? undefined,
      startPoint: { x, y },
      origin: { x: shape.x, y: shape.y, width: shape.width, height: shape.height },
    };

    e.preventDefault();
    e.stopPropagation();

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const drag = shapeDragRef.current;
      if (!drag || drag.pointerId !== moveEvent.pointerId) return;
      const point = getCropPoint(moveEvent.clientX, moveEvent.clientY);
      if (!point) return;
      const x = point.x * natW / (canvasW || 1);
      const y = point.y * natH / (canvasH || 1);
      const dx = x - drag.startPoint.x;
      const dy = y - drag.startPoint.y;

      const updatedShapes = vectorShapes.map((s) => {
        if (s.id !== drag.shapeId) return s;
        if (drag.mode === 'move') return { ...s, x: drag.origin.x + dx, y: drag.origin.y + dy };

        const resizeHandle = drag.resizeHandle;
        const west = resizeHandle?.includes('w') ?? false;
        const east = resizeHandle?.includes('e') ?? false;
        const north = resizeHandle?.includes('n') ?? false;
        const south = resizeHandle?.includes('s') ?? false;

        let width = drag.origin.width;
        let height = drag.origin.height;
        let newX = drag.origin.x;
        let newY = drag.origin.y;

        if (west) {
          const rawW = drag.origin.width - dx;
          if (rawW >= 10) {
            width = rawW;
            newX = drag.origin.x + drag.origin.width - width;
          } else {
            width = 10;
            newX = drag.origin.x + drag.origin.width - 10;
          }
        } else if (east) {
          const rawW = drag.origin.width + dx;
          if (rawW >= 10) {
            width = rawW;
          } else {
            width = 10;
          }
        }

        if (north) {
          const rawH = drag.origin.height - dy;
          if (rawH >= 10) {
            height = rawH;
            newY = drag.origin.y + drag.origin.height - height;
          } else {
            height = 10;
            newY = drag.origin.y + drag.origin.height - 10;
          }
        } else if (south) {
          const rawH = drag.origin.height + dy;
          if (rawH >= 10) {
            height = rawH;
          } else {
            height = 10;
          }
        }

        return {
          ...s,
          x: newX,
          y: newY,
          width,
          height,
        };
      });

      setVectorShapes(updatedShapes);
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      const drag = shapeDragRef.current;
      if (drag && drag.pointerId === upEvent.pointerId) {
        shapeDragRef.current = null;
        reportCanvasHistory({ vectorShapes });
      }
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const handleShapePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const target = e.target as Element;
    if (target.closest('[data-shape-id]') || target.closest('[data-shape-resize]') || target.closest('[data-corner-resize]')) {
      return;
    }

    const { canvasW, canvasH, natW, natH } = getCanvasDimensions();
    const point = getCropPoint(e.clientX, e.clientY);
    if (!point) return;
    const x = point.x * natW / (canvasW || 1);
    const y = point.y * natH / (canvasH || 1);

    setSelectedShapeId(null);
    if (activeTool !== 'shapes') {
      setSelectedTextId(null);
      if (editingTextId) setEditingTextId(null);
      return;
    }
    if (!activeOverlayLayer) return;
    shapePointerRef.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
    e.stopPropagation();
    const scaleX = natW / (canvasW || 1);
    const scaleY = natH / (canvasH || 1);
    setShapeDraft({
      id: `shape-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      layerId: activeOverlayLayer.id,
      type: shapeDefaults.type,
      color: selectedColor,
      x,
      y,
      width: 0,
      height: 0,
      filled: shapeDefaults.filled,
      strokeWidth: shapeDefaults.strokeWidth * ((scaleX + scaleY) / 2),
    });
  };

  const handleShapePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const drag = shapeDragRef.current;
    const { canvasW, canvasH, natW, natH } = getCanvasDimensions();
    const point = getCropPoint(e.clientX, e.clientY);
    if (!point) return;
    const x = point.x * natW / (canvasW || 1);
    const y = point.y * natH / (canvasH || 1);
    if (drag?.pointerId === e.pointerId) {
      e.preventDefault();
      e.stopPropagation();
      const dx = x - drag.startPoint.x;
      const dy = y - drag.startPoint.y;
      const resizeHandle = drag.resizeHandle;
      const updatedShapes = vectorShapes.map((shape) => {
        if (shape.id !== drag.shapeId) return shape;
        if (drag.mode === 'move') return { ...shape, x: drag.origin.x + dx, y: drag.origin.y + dy };

        const west = resizeHandle?.includes('w') ?? false;
        const east = resizeHandle?.includes('e') ?? false;
        const north = resizeHandle?.includes('n') ?? false;
        const south = resizeHandle?.includes('s') ?? false;

        let width = drag.origin.width;
        let height = drag.origin.height;
        let newX = drag.origin.x;
        let newY = drag.origin.y;

        if (west) {
          const rawW = drag.origin.width - dx;
          if (rawW >= 2) {
            width = rawW;
            newX = drag.origin.x + drag.origin.width - width;
          } else {
            width = Math.max(2, Math.abs(rawW));
            newX = drag.origin.x + drag.origin.width;
          }
        } else if (east) {
          const rawW = drag.origin.width + dx;
          if (rawW >= 2) {
            width = rawW;
          } else {
            width = Math.max(2, Math.abs(rawW));
            newX = drag.origin.x - width;
          }
        }

        if (north) {
          const rawH = drag.origin.height - dy;
          if (rawH >= 2) {
            height = rawH;
            newY = drag.origin.y + drag.origin.height - height;
          } else {
            height = Math.max(2, Math.abs(rawH));
            newY = drag.origin.y + drag.origin.height;
          }
        } else if (south) {
          const rawH = drag.origin.height + dy;
          if (rawH >= 2) {
            height = rawH;
          } else {
            height = Math.max(2, Math.abs(rawH));
            newY = drag.origin.y - height;
          }
        }

        return {
          ...shape,
          x: newX,
          y: newY,
          width,
          height,
        };
      });
      setVectorShapes(updatedShapes);
      const movedShape = updatedShapes.find((shape) => shape.id === drag.shapeId);
      if (movedShape) {
        const allBoxes: ElementBox[] = [
          ...textLayers.map((t) => ({ id: t.id, x: t.x, y: t.y, width: t.width ?? Math.max(t.fontSize * 4, 160), height: t.height ?? Math.max(t.fontSize * 2, 64) })),
          ...updatedShapes.map((s) => ({ id: s.id, x: s.x, y: s.y, width: s.width, height: s.height })),
        ];
        setActiveGuides(computeSmartGuides({ id: movedShape.id, x: movedShape.x, y: movedShape.y, width: movedShape.width, height: movedShape.height }, allBoxes, natW, natH));
      }
      return;
    }
    if (shapePointerRef.current !== e.pointerId || !shapeDraft) return;
    setShapeDraft((current) => current ? {
      ...current,
      x: Math.min(shapeDraft.x, x),
      y: Math.min(shapeDraft.y, y),
      width: Math.abs(x - shapeDraft.x),
      height: Math.abs(y - shapeDraft.y),
    } : null);
  };

  const handleShapePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    setActiveGuides({ lines: [], distances: [] });
    setIsDragging(false);
    setIsMovingImage(false);
    if (shapeDragRef.current?.pointerId === e.pointerId) {
      shapeDragRef.current = null;
      reportCanvasHistory();
      if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
      return;
    }
    if (shapePointerRef.current === e.pointerId) {
      shapePointerRef.current = null;
      if (shapeDraft && shapeDraft.width > 1 && shapeDraft.height > 1) {
        const createdShape = { ...shapeDraft };
        const updatedShapes = [...vectorShapes, createdShape];
        setVectorShapes(updatedShapes);
        reportCanvasHistory({ vectorShapes: updatedShapes });
        setSelectedShapeId(createdShape.id);
      }
      setShapeDraft(null);
    }
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const handleImageElementPointerDown = (e: React.PointerEvent<SVGElement>, imgEl: CanvasImageElement) => {
    if (isImageElementLocked(imgEl)) return;
    const { canvasW, canvasH, natW, natH } = getCanvasDimensions();
    const point = getCropPoint(e.clientX, e.clientY);
    if (!point) return;
    const x = point.x * natW / (canvasW || 1);
    const y = point.y * natH / (canvasH || 1);

    const target = e.target as Element;
    const resizeHandle = target.closest<Element>('[data-img-resize], [data-corner-resize]')?.getAttribute('data-img-resize') || target.closest<Element>('[data-img-resize], [data-corner-resize]')?.getAttribute('data-corner-resize');

    setSelectedImageElementId(imgEl.id);
    setSelectedShapeId(null);
    setSelectedTextId(null);
    setIsCanvasBackgroundSelected(false);
    setIsImageSelected(false);
    onBaseImageSelectionChange(false);
    setIsMovingImage(false);
    setIsDragging(false);
    onSelectTool('select');
    window.dispatchEvent(new Event('image-studio:show-tool-options'));

    imageElementDragRef.current = {
      pointerId: e.pointerId,
      mode: resizeHandle ? 'resize' : 'move',
      id: imgEl.id,
      resizeHandle: resizeHandle ?? undefined,
      startPoint: { x, y },
      origin: { x: imgEl.x, y: imgEl.y, width: imgEl.width, height: imgEl.height },
    };

    e.preventDefault();
    e.stopPropagation();

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const drag = imageElementDragRef.current;
      if (!drag || drag.pointerId !== moveEvent.pointerId) return;
      const point = getCropPoint(moveEvent.clientX, moveEvent.clientY);
      if (!point) return;
      const x = point.x * natW / (canvasW || 1);
      const y = point.y * natH / (canvasH || 1);
      const dx = x - drag.startPoint.x;
      const dy = y - drag.startPoint.y;

      const updated = imageElements.map((imgItem) => {
        if (imgItem.id !== drag.id) return imgItem;
        if (drag.mode === 'move') {
          return { ...imgItem, x: drag.origin.x + dx, y: drag.origin.y + dy };
        }
        const west = drag.resizeHandle?.includes('w') ?? false;
        const north = drag.resizeHandle?.includes('n') ?? false;
        const east = drag.resizeHandle?.includes('e') ?? false;
        const south = drag.resizeHandle?.includes('s') ?? false;

        let width = drag.origin.width;
        let height = drag.origin.height;
        let newX = drag.origin.x;
        let newY = drag.origin.y;

        if (west) {
          const rawW = drag.origin.width - dx;
          if (rawW >= 30) {
            width = rawW;
            newX = drag.origin.x + drag.origin.width - width;
          } else {
            width = 30;
            newX = drag.origin.x + drag.origin.width - 30;
          }
        } else if (east) {
          const rawW = drag.origin.width + dx;
          if (rawW >= 30) {
            width = rawW;
          } else {
            width = 30;
          }
        }

        if (north) {
          const rawH = drag.origin.height - dy;
          if (rawH >= 30) {
            height = rawH;
            newY = drag.origin.y + drag.origin.height - height;
          } else {
            height = 30;
            newY = drag.origin.y + drag.origin.height - 30;
          }
        } else if (south) {
          const rawH = drag.origin.height + dy;
          if (rawH >= 30) {
            height = rawH;
          } else {
            height = 30;
          }
        }

        return {
          ...imgItem,
          x: newX,
          y: newY,
          width,
          height,
        };
      });

      setImageElements(updated);
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      const drag = imageElementDragRef.current;
      if (drag && drag.pointerId === upEvent.pointerId) {
        imageElementDragRef.current = null;
        reportCanvasHistory({ imageElements });
      }
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const handleImageElementPointerMove = (e: React.PointerEvent<SVGElement>) => {
    const drag = imageElementDragRef.current;
    const point = getCropPoint(e.clientX, e.clientY);
    if (!drag || drag.pointerId !== e.pointerId || !point) return;
    const currentDragImg = imageElements.find((item) => item.id === drag.id);
    if (!currentDragImg || isImageElementLocked(currentDragImg)) return;

    const canvasW = imageRef.current?.clientWidth || 1000;
    const canvasH = imageRef.current?.clientHeight || 700;
    const natW = naturalDimensions.width || 1000;
    const natH = naturalDimensions.height || 700;
    const x = point.x * natW / (canvasW || 1);
    const y = point.y * natH / (canvasH || 1);
    const dx = x - drag.startPoint.x;
    const dy = y - drag.startPoint.y;

    const updated = imageElements.map((imgEl) => {
      if (imgEl.id !== drag.id) return imgEl;
      if (drag.mode === 'move') {
        return { ...imgEl, x: drag.origin.x + dx, y: drag.origin.y + dy };
      }
      const west = drag.resizeHandle?.includes('w') ?? false;
      const north = drag.resizeHandle?.includes('n') ?? false;
      const east = drag.resizeHandle?.includes('e') ?? false;
      const south = drag.resizeHandle?.includes('s') ?? false;

      let width = drag.origin.width;
      let height = drag.origin.height;
      let newX = drag.origin.x;
      let newY = drag.origin.y;

      if (west) {
        const rawW = drag.origin.width - dx;
        if (rawW >= 30) {
          width = rawW;
          newX = drag.origin.x + drag.origin.width - width;
        } else {
          width = 30;
          newX = drag.origin.x + drag.origin.width - 30;
        }
      } else if (east) {
        const rawW = drag.origin.width + dx;
        if (rawW >= 30) {
          width = rawW;
        } else {
          width = 30;
        }
      }

      if (north) {
        const rawH = drag.origin.height - dy;
        if (rawH >= 30) {
          height = rawH;
          newY = drag.origin.y + drag.origin.height - height;
        } else {
          height = 30;
          newY = drag.origin.y + drag.origin.height - 30;
        }
      } else if (south) {
        const rawH = drag.origin.height + dy;
        if (rawH >= 30) {
          height = rawH;
        } else {
          height = 30;
        }
      }

      return {
        ...imgEl,
        x: newX,
        y: newY,
        width,
        height,
      };
    });

    setImageElements(updated);
    const activeEl = updated.find((item) => item.id === drag.id);
    if (activeEl) {
      const allBoxes: ElementBox[] = [
        ...textLayers.map((t) => ({ id: t.id, x: t.x, y: t.y, width: t.width ?? 160, height: t.height ?? 64 })),
        ...vectorShapes.map((s) => ({ id: s.id, x: s.x, y: s.y, width: s.width, height: s.height })),
        ...updated.map((i) => ({ id: i.id, x: i.x, y: i.y, width: i.width, height: i.height })),
      ];
      setActiveGuides(computeSmartGuides({ id: activeEl.id, x: activeEl.x, y: activeEl.y, width: activeEl.width, height: activeEl.height }, allBoxes, natW, natH));
    }
  };

  const handleImageElementPointerUp = (e: React.PointerEvent<SVGElement>) => {
    setActiveGuides({ lines: [], distances: [] });
    setIsDragging(false);
    setIsMovingImage(false);
    if (imageElementDragRef.current?.pointerId === e.pointerId) {
      imageElementDragRef.current = null;
      reportCanvasHistory({ imageElements });
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    }
  };

  const handleBrushPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!activeOverlayLayer) return;
    const image = imageRef.current;
    const localPoint = getCropPoint(e.clientX, e.clientY);
    if (!image || !localPoint || !image.clientWidth || !image.clientHeight) return;

    const scaleX = image.naturalWidth / image.clientWidth;
    const scaleY = image.naturalHeight / image.clientHeight;
    const strokeIndex = brushStrokes.length;
    brushPointerRef.current = { pointerId: e.pointerId, strokeIndex };
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setBrushStrokes((prev) => [...prev, {
      layerId: activeOverlayLayer.id,
      points: [{ x: localPoint.x * scaleX, y: localPoint.y * scaleY }],
      color: selectedColor,
      width: brushSize * ((scaleX + scaleY) / 2),
      opacity: brushOpacity / 100,
    }]);
  };

  const handleBrushPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const activeStroke = brushPointerRef.current;
    const image = imageRef.current;
    const localPoint = getCropPoint(e.clientX, e.clientY);
    if (!activeStroke || activeStroke.pointerId !== e.pointerId || !image || !localPoint) return;

    const scaleX = image.naturalWidth / image.clientWidth;
    const scaleY = image.naturalHeight / image.clientHeight;
    setBrushStrokes((prev) => prev.map((stroke, index) => {
      if (index !== activeStroke.strokeIndex) return stroke;
      const point = { x: localPoint.x * scaleX, y: localPoint.y * scaleY };
      const lastPoint = stroke.points[stroke.points.length - 1];
      if (lastPoint && lastPoint.x === point.x && lastPoint.y === point.y) return stroke;
      return { ...stroke, points: [...stroke.points, point] };
    }));
  };

  const handleBrushPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (brushPointerRef.current?.pointerId === e.pointerId) {
      brushPointerRef.current = null;
      reportCanvasHistory();
    }
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const handleEraserPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!activeOverlayLayer) return;
    const image = imageRef.current;
    const localPoint = getCropPoint(e.clientX, e.clientY);
    if (!image || !localPoint || !image.clientWidth || !image.clientHeight) return;

    const scaleX = image.naturalWidth / image.clientWidth;
    const scaleY = image.naturalHeight / image.clientHeight;
    const strokeIndex = eraserStrokes.length;
    eraserPointerRef.current = { pointerId: e.pointerId, strokeIndex };
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setEraserStrokes((prev) => [...prev, {
      layerId: activeOverlayLayer.id,
      points: [{ x: localPoint.x * scaleX, y: localPoint.y * scaleY }],
      width: eraserSize * ((scaleX + scaleY) / 2),
      hardness: eraserHardness,
    }]);
  };

  const handleEraserPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const activeStroke = eraserPointerRef.current;
    const image = imageRef.current;
    const localPoint = getCropPoint(e.clientX, e.clientY);
    if (!activeStroke || activeStroke.pointerId !== e.pointerId || !image || !localPoint) return;

    const scaleX = image.naturalWidth / image.clientWidth;
    const scaleY = image.naturalHeight / image.clientHeight;
    setEraserStrokes((prev) => prev.map((stroke, index) => {
      if (index !== activeStroke.strokeIndex) return stroke;
      const point = { x: localPoint.x * scaleX, y: localPoint.y * scaleY };
      const lastPoint = stroke.points[stroke.points.length - 1];
      if (lastPoint && lastPoint.x === point.x && lastPoint.y === point.y) return stroke;
      return { ...stroke, points: [...stroke.points, point] };
    }));
  };

  const handleEraserPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (eraserPointerRef.current?.pointerId === e.pointerId) {
      eraserPointerRef.current = null;
      reportCanvasHistory();
    }
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const handleBlurPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!activeOverlayLayer) return;
    const localPoint = getCropPoint(e.clientX, e.clientY);
    if (!localPoint) return;

    const image = imageRef.current;
    const scaleX = naturalDimensions.width / (image?.clientWidth || 1000);
    const scaleY = naturalDimensions.height / (image?.clientHeight || 700);
    const strokeIndex = blurStrokes.length;
    blurPointerRef.current = { pointerId: e.pointerId, strokeIndex };
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);

    const newStroke: BlurStroke = {
      layerId: activeOverlayLayer.id,
      points: [{ x: localPoint.x * scaleX, y: localPoint.y * scaleY }],
      width: blurBrushSize * ((scaleX + scaleY) / 2),
      blurAmount: blurIntensity || adjustments.blur || 12,
    };
    const updated = [...blurStrokes, newStroke];
    setBlurStrokes(updated);
  };

  const handleBlurPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const activeStroke = blurPointerRef.current;
    const localPoint = getCropPoint(e.clientX, e.clientY);
    if (!activeStroke || activeStroke.pointerId !== e.pointerId || !localPoint) return;

    const image = imageRef.current;
    const scaleX = naturalDimensions.width / (image?.clientWidth || 1000);
    const scaleY = naturalDimensions.height / (image?.clientHeight || 700);
    const point = { x: localPoint.x * scaleX, y: localPoint.y * scaleY };

    setBlurStrokes((prev) => prev.map((stroke, index) => {
      if (index !== activeStroke.strokeIndex) return stroke;
      const lastPoint = stroke.points[stroke.points.length - 1];
      if (lastPoint && lastPoint.x === point.x && lastPoint.y === point.y) return stroke;
      return { ...stroke, points: [...stroke.points, point] };
    }));
  };

  const handleBlurPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (blurPointerRef.current?.pointerId === e.pointerId) {
      blurPointerRef.current = null;
      reportCanvasHistory({ blurStrokes });
    }
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const handleTextLayerPointerDown = (e: React.PointerEvent<HTMLDivElement | SVGElement>, layer: CanvasTextLayer) => {
    if (editingTextId === layer.id || isTextLocked(layer)) return;
    const { canvasW, canvasH, natW, natH } = getCanvasDimensions();
    const point = getCropPoint(e.clientX, e.clientY);
    if (!point) return;
    const x = point.x * natW / (canvasW || 1);
    const y = point.y * natH / (canvasH || 1);

    const target = e.target as HTMLElement;
    const resizeHandle = target.closest<HTMLElement>('[data-text-resize], [data-corner-resize], [data-shape-resize], [data-img-resize]')?.getAttribute('data-text-resize') || target.closest<HTMLElement>('[data-text-resize], [data-corner-resize], [data-shape-resize], [data-img-resize]')?.getAttribute('data-corner-resize') || target.closest<HTMLElement>('[data-text-resize], [data-corner-resize], [data-shape-resize], [data-img-resize]')?.getAttribute('data-shape-resize') || target.closest<HTMLElement>('[data-text-resize], [data-corner-resize], [data-shape-resize], [data-img-resize]')?.getAttribute('data-img-resize') as 'nw' | 'ne' | 'sw' | 'se' | null;

    setSelectedTextId(layer.id);
    setSelectedShapeId(null);
    setSelectedImageElementId(null);
    setIsCanvasBackgroundSelected(false);
    setIsImageSelected(false);
    onBaseImageSelectionChange(false);
    setIsMovingImage(false);
    setIsDragging(false);
    onSelectTool('select');
    window.dispatchEvent(new Event('image-studio:show-tool-options'));

    const initialWidth = layer.width ?? Math.max(layer.fontSize * 4, 160);
    const initialHeight = layer.height ?? Math.max(layer.fontSize * 2, 64);
    const initialFontSize = layer.fontSize || 32;

    textDragRef.current = {
      pointerId: e.pointerId,
      layerId: layer.id,
      mode: resizeHandle ? 'resize' : 'move',
      resizeHandle: resizeHandle ?? undefined,
      startPoint: { x, y },
      origin: { x: layer.x, y: layer.y },
      originFontSize: initialFontSize,
      originWidth: initialWidth,
      originHeight: initialHeight,
      moved: false,
    };

    e.preventDefault();
    e.stopPropagation();

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const drag = textDragRef.current;
      if (!drag || drag.pointerId !== moveEvent.pointerId) return;
      const movePoint = getCropPoint(moveEvent.clientX, moveEvent.clientY);
      if (!movePoint) return;
      const currentX = movePoint.x * natW / (canvasW || 1);
      const currentY = movePoint.y * natH / (canvasH || 1);
      const dx = currentX - drag.startPoint.x;
      const dy = currentY - drag.startPoint.y;

      if (!drag.moved && Math.hypot(dx, dy) < 2) return;
      drag.moved = true;

      if (drag.mode === 'resize') {
        const handle = drag.resizeHandle ?? 'se';
        const west = handle.includes('w');
        const north = handle.includes('n');
        const east = handle.includes('e');
        const south = handle.includes('s');

        let rawW = drag.originWidth;
        let rawH = drag.originHeight;

        if (west) {
          rawW = drag.originWidth - dx;
        } else if (east) {
          rawW = drag.originWidth + dx;
        }

        if (north) {
          rawH = drag.originHeight - dy;
        } else if (south) {
          rawH = drag.originHeight + dy;
        }

        const baseW = Math.max(10, drag.originWidth);
        const baseH = Math.max(10, drag.originHeight);
        const ratioW = rawW / baseW;
        const ratioH = rawH / baseH;
        const scaleRatio = Math.max(0.1, (west || east) && (north || south) ? (Math.abs(dx) > Math.abs(dy) ? ratioW : ratioH) : (west || east) ? ratioW : ratioH);

        const newFontSize = Math.min(400, Math.max(12, Math.round(drag.originFontSize * scaleRatio)));
        const effectiveScale = newFontSize / drag.originFontSize;

        const width = Math.max(40, Math.round(drag.originWidth * effectiveScale));
        const height = Math.max(20, Math.round(drag.originHeight * effectiveScale));

        let newX = drag.origin.x;
        let newY = drag.origin.y;

        if (west) {
          newX = drag.origin.x + drag.originWidth - width;
        }
        if (north) {
          newY = drag.origin.y + drag.originHeight - height;
        }

        const updatedTextLayers = textLayers.map((l) =>
          l.id === drag.layerId
            ? { ...l, x: newX, y: newY, width, height, fontSize: newFontSize }
            : l
        );
        setTextLayers(updatedTextLayers);

        const currentTargetText = updatedTextLayers.find((l) => l.id === drag.layerId);
        if (currentTargetText) {
          window.dispatchEvent(new CustomEvent('image-studio:selected-text-settings', {
            detail: {
              fontSize: newFontSize,
              fontFamily: currentTargetText.fontFamily ?? 'Arial',
              bold: currentTargetText.bold ?? false,
              italic: currentTargetText.italic ?? false,
              textAlign: currentTargetText.textAlign ?? 'left',
              color: currentTargetText.color ?? '#000000',
              locked: isTextLocked(currentTargetText),
            },
          }));
        }
        return;
      }

      const newX = drag.origin.x + dx;
      const newY = drag.origin.y + dy;
      const updatedTextLayers = textLayers.map((l) =>
        l.id === drag.layerId ? { ...l, x: newX, y: newY } : l
      );
      setTextLayers(updatedTextLayers);

      const activeText = updatedTextLayers.find((t) => t.id === drag.layerId);
      if (activeText) {
        const activeWidth = activeText.width ?? Math.max(activeText.fontSize * 4, 160);
        const activeHeight = activeText.height ?? Math.max(activeText.fontSize * 2, 64);
        const allBoxes: ElementBox[] = [
          ...updatedTextLayers.map((t) => ({
            id: t.id,
            x: t.x,
            y: t.y,
            width: t.width ?? Math.max(t.fontSize * 4, 160),
            height: t.height ?? Math.max(t.fontSize * 2, 64),
          })),
          ...vectorShapes.map((s) => ({ id: s.id, x: s.x, y: s.y, width: s.width, height: s.height })),
        ];
        setActiveGuides(computeSmartGuides({ id: drag.layerId, x: newX, y: newY, width: activeWidth, height: activeHeight }, allBoxes, natW, natH));
      }
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      if (textDragRef.current?.pointerId !== upEvent.pointerId) return;
      setActiveGuides({ lines: [], distances: [] });
      setIsDragging(false);
      setIsMovingImage(false);
      const drag = textDragRef.current;
      textDragRef.current = null;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);

      if (drag?.moved) {
        reportCanvasHistory();
      } else {
        setSelectedTextId(drag?.layerId ?? null);
        window.dispatchEvent(new Event('image-studio:show-tool-options'));
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
  };

  const handleCropPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!cropRect) return;
    const point = getCropPoint(e.clientX, e.clientY, true);
    if (!point) return;

    const target = e.target as HTMLElement;
    const handle = target.closest<HTMLElement>('[data-crop-handle]')?.dataset.cropHandle ?? null;
    const insideSelection = point.x >= cropRect.x && point.x <= cropRect.x + cropRect.width
      && point.y >= cropRect.y && point.y <= cropRect.y + cropRect.height;
    const mode = handle ? 'resize' : insideSelection ? 'move' : 'draw';
    const rectStart = mode === 'draw'
      ? { x: point.x, y: point.y, width: 0, height: 0 }
      : cropRect;

    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setCropInteraction({ mode, handle, pointerStart: point, rectStart });
    if (mode === 'draw') setCropRect(rectStart);
  };

  const handleCropPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!cropInteraction) return;
    const point = getCropPoint(e.clientX, e.clientY, true);
    const image = imageRef.current;
    if (!point || !image) return;

    const { mode, handle, pointerStart, rectStart } = cropInteraction;
    const deltaX = point.x - pointerStart.x;
    const deltaY = point.y - pointerStart.y;
    if (mode === 'draw') {
      setCropRect({
        x: Math.min(pointerStart.x, point.x),
        y: Math.min(pointerStart.y, point.y),
        width: Math.abs(deltaX),
        height: Math.abs(deltaY),
      });
      return;
    }
    if (mode === 'move') {
      setCropRect({
        ...rectStart,
        x: Math.min(image.clientWidth - rectStart.width, Math.max(0, rectStart.x + deltaX)),
        y: Math.min(image.clientHeight - rectStart.height, Math.max(0, rectStart.y + deltaY)),
      });
      return;
    }

    let left = rectStart.x;
    let top = rectStart.y;
    let right = rectStart.x + rectStart.width;
    let bottom = rectStart.y + rectStart.height;
    const minSize = Math.min(16, image.clientWidth, image.clientHeight);
    if (handle?.includes('w')) left = Math.min(right - minSize, Math.max(0, pointerStart.x + deltaX));
    if (handle?.includes('e')) right = Math.max(left + minSize, Math.min(image.clientWidth, pointerStart.x + deltaX));
    if (handle?.includes('n')) top = Math.min(bottom - minSize, Math.max(0, pointerStart.y + deltaY));
    if (handle?.includes('s')) bottom = Math.max(top + minSize, Math.min(image.clientHeight, pointerStart.y + deltaY));
    setCropRect({ x: left, y: top, width: right - left, height: bottom - top });
  };

  const handleCropPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setCropInteraction(null);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const handleApplyCrop = async () => {
    const image = imageRef.current;
    if (!image || !cropRect || !image.naturalWidth || !image.naturalHeight || isApplyingCrop) return;

    const scaleX = image.naturalWidth / image.clientWidth;
    const scaleY = image.naturalHeight / image.clientHeight;
    const sourceX = Math.max(0, Math.floor(cropRect.x * scaleX));
    const sourceY = Math.max(0, Math.floor(cropRect.y * scaleY));
    const sourceWidth = Math.min(image.naturalWidth - sourceX, Math.round(cropRect.width * scaleX));
    const sourceHeight = Math.min(image.naturalHeight - sourceY, Math.round(cropRect.height * scaleY));
    if (sourceWidth < 1 || sourceHeight < 1) return;

    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = sourceWidth;
    cropCanvas.height = sourceHeight;
    const context = cropCanvas.getContext('2d');
    if (!context) {
      setCropError('Could not prepare the cropped image.');
      return;
    }

    setIsApplyingCrop(true);
    setCropError(null);
    try {
      if (baseImageLayer?.visible === true) {
        context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, sourceWidth, sourceHeight);
      }
      const blob = await new Promise<Blob>((resolve, reject) => {
        cropCanvas.toBlob((result) => result ? resolve(result) : reject(new Error('Could not create the cropped image.')), 'image/png');
      });
      const croppedUrl = URL.createObjectURL(blob);
      const croppedCanvas: CanvasHistory = {
        brushStrokes: brushStrokes.map((stroke) => ({ ...stroke, points: stroke.points.map((point) => ({ x: point.x - sourceX, y: point.y - sourceY })) })),
        eraserStrokes: eraserStrokes.map((stroke) => ({ ...stroke, points: stroke.points.map((point) => ({ x: point.x - sourceX, y: point.y - sourceY })) })),
        textLayers: textLayers.map((layer) => ({ ...layer, x: layer.x - sourceX, y: layer.y - sourceY })),
        vectorShapes: vectorShapes.map((shape) => ({ ...shape, x: shape.x - sourceX, y: shape.y - sourceY })),
      };
      onCropImage(croppedUrl, croppedCanvas);
      onSelectTool('select');
    } catch {
      setCropError('Could not crop this image. It may be blocked by cross-origin image permissions.');
    } finally {
      setIsApplyingCrop(false);
    }
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.08 : -0.08;
      const newZoom = Math.min(Math.max(0.2, zoom + delta), 4.0);
      onZoomChange(Number(newZoom.toFixed(2)));
    }
  };

  // Drag and drop image files
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        onImageDrop(file);
        return;
      }
    }
    const shapeData = e.dataTransfer.getData('application/x-shape');
    if (shapeData) {
      try {
        const parsed = JSON.parse(shapeData);
        window.dispatchEvent(new CustomEvent('image-studio:create-shape', { detail: parsed }));
        return;
      } catch {
        // ignore JSON parse error
      }
    }
    const url = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
    if (url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:image/'))) {
      window.dispatchEvent(new CustomEvent('image-studio:add-image-url', { detail: { url, name: 'Dropped Image' } }));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const getCursorClass = () => {
    if (isDragging) return 'cursor-grabbing';
    switch (activeTool) {
      case 'pan':
        return 'cursor-grab';
      case 'crop':
        return 'cursor-crosshair';
      case 'eyedropper':
        return 'cursor-crosshair';
      case 'brush':
        return 'cursor-crosshair';
      case 'eraser':
        return 'cursor-crosshair';
      case 'text':
        return 'cursor-text';
      default:
        return 'cursor-default';
    }
  };

  const selectedTextLayer = textLayers.find((layer) => layer.id === selectedTextId);
  const selectedShape = vectorShapes.find((shape) => shape.id === selectedShapeId);
  const selectedImageElement = imageElements.find((imgEl) => imgEl.id === selectedImageElementId);

  const toggleLockSelectedImageElement = (targetImg?: CanvasImageElement) => {
    const el = targetImg || selectedImageElement;
    if (!el) return;
    const currentlyLocked = isImageElementLocked(el);
    const nextLocked = !currentlyLocked;
    const updated = imageElements.map((item) =>
      item.id === el.id ? { ...item, locked: nextLocked } : item
    );
    setImageElements(updated);
    reportCanvasHistory({ imageElements: updated });
    window.dispatchEvent(
      new CustomEvent('image-studio:toggle-object-lock', {
        detail: { id: el.id, layerId: el.layerId, locked: nextLocked },
      })
    );
    if (nextLocked) {
      setSelectedImageElementId(null);
    } else {
      setSelectedImageElementId(el.id);
    }
  };

  const unlockImageElement = (imgEl: CanvasImageElement) => {
    const updated = imageElements.map((item) =>
      item.id === imgEl.id ? { ...item, locked: false } : item
    );
    setImageElements(updated);
    reportCanvasHistory({ imageElements: updated });
    window.dispatchEvent(
      new CustomEvent('image-studio:toggle-object-lock', {
        detail: { id: imgEl.id, layerId: imgEl.layerId, locked: false },
      })
    );
    setSelectedImageElementId(imgEl.id);
    setSelectedShapeId(null);
    setSelectedTextId(null);
    setIsImageSelected(false);
    onBaseImageSelectionChange(false);
  };

  const toggleLockSelectedShape = (targetShape?: VectorShape) => {
    const shape = targetShape || selectedShape;
    if (!shape) return;
    const currentlyLocked = isShapeLocked(shape);
    const nextLocked = !currentlyLocked;
    const updated = vectorShapes.map((item) =>
      item.id === shape.id ? { ...item, locked: nextLocked } : item
    );
    setVectorShapes(updated);
    reportCanvasHistory({ vectorShapes: updated });
    window.dispatchEvent(
      new CustomEvent('image-studio:toggle-object-lock', {
        detail: { id: shape.id, layerId: shape.layerId, locked: nextLocked },
      })
    );
    if (nextLocked) {
      setSelectedShapeId(null);
    } else {
      setSelectedShapeId(shape.id);
    }
  };

  const unlockShape = (shape: VectorShape) => {
    const updated = vectorShapes.map((item) =>
      item.id === shape.id ? { ...item, locked: false } : item
    );
    setVectorShapes(updated);
    reportCanvasHistory({ vectorShapes: updated });
    window.dispatchEvent(
      new CustomEvent('image-studio:toggle-object-lock', {
        detail: { id: shape.id, layerId: shape.layerId, locked: false },
      })
    );
    setSelectedShapeId(shape.id);
    setSelectedImageElementId(null);
    setSelectedTextId(null);
    setIsImageSelected(false);
    onBaseImageSelectionChange(false);
  };

  const toggleLockSelectedText = (targetText?: CanvasTextLayer) => {
    const layer = targetText || selectedTextLayer;
    if (!layer) return;
    const currentlyLocked = isTextLocked(layer);
    const nextLocked = !currentlyLocked;
    const updated = textLayers.map((item) =>
      item.id === layer.id ? { ...item, locked: nextLocked } : item
    );
    setTextLayers(updated);
    reportCanvasHistory({ textLayers: updated });
    window.dispatchEvent(
      new CustomEvent('image-studio:toggle-object-lock', {
        detail: { id: layer.id, layerId: layer.layerId, locked: nextLocked },
      })
    );
    if (nextLocked) {
      setSelectedTextId(null);
      setEditingTextId(null);
    } else {
      setSelectedTextId(layer.id);
    }
  };

  const unlockText = (layer: CanvasTextLayer) => {
    const updated = textLayers.map((item) =>
      item.id === layer.id ? { ...item, locked: false } : item
    );
    setTextLayers(updated);
    reportCanvasHistory({ textLayers: updated });
    window.dispatchEvent(
      new CustomEvent('image-studio:toggle-object-lock', {
        detail: { id: layer.id, layerId: layer.layerId, locked: false },
      })
    );
    setSelectedTextId(layer.id);
    setSelectedShapeId(null);
    setSelectedImageElementId(null);
    setIsImageSelected(false);
    onBaseImageSelectionChange(false);
  };

  const toggleLockBaseImage = () => {
    if (!baseImageLayer) return;
    const nextLocked = !baseImageLayer.locked;
    window.dispatchEvent(
      new CustomEvent('image-studio:toggle-object-lock', {
        detail: { id: baseImageLayer.id, locked: nextLocked },
      })
    );
    if (nextLocked) {
      setIsImageSelected(false);
      onBaseImageSelectionChange(false);
    }
  };

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('image-studio:selected-text-settings', {
      detail: selectedTextLayer ? {
        fontSize: selectedTextLayer.fontSize,
        fontFamily: selectedTextLayer.fontFamily ?? 'Arial',
        bold: selectedTextLayer.bold ?? false,
        italic: selectedTextLayer.italic ?? false,
        textAlign: selectedTextLayer.textAlign ?? 'left',
        locked: isTextLocked(selectedTextLayer),
      } : null,
    }));
  }, [selectedTextLayer, layers]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('image-studio:selected-shape-settings', {
      detail: selectedShape ? {
        type: selectedShape.type,
        filled: selectedShape.filled ?? false,
        strokeWidth: selectedShape.strokeWidth ?? 4,
        locked: isShapeLocked(selectedShape),
      } : null,
    }));
  }, [selectedShape, layers]);

  const deleteSelectedText = () => {
    if (!selectedTextLayer || isTextLocked(selectedTextLayer)) return;
    const updatedTextLayers = textLayers.filter((layer) => layer.id !== selectedTextLayer.id);
    setTextLayers(updatedTextLayers);
    reportCanvasHistory({ textLayers: updatedTextLayers });
    setSelectedTextId(null);
    setEditingTextId(null);
  };

  const copySelectedText = () => {
    if (!selectedTextLayer) return;
    copiedItemRef.current = { type: 'text', data: selectedTextLayer };
    try {
      void navigator.clipboard.writeText(selectedTextLayer.text);
    } catch {
      // ignore
    }
    setCopiedNotification('Text copied');
    setTimeout(() => setCopiedNotification(null), 1800);
  };

  const duplicateSelectedText = () => {
    if (!selectedTextLayer || isTextLocked(selectedTextLayer)) return;
    const copy = { ...selectedTextLayer, id: `text-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, x: selectedTextLayer.x + 24, y: selectedTextLayer.y + 24 };
    const updatedTextLayers = [...textLayers, copy];
    setTextLayers(updatedTextLayers);
    reportCanvasHistory({ textLayers: updatedTextLayers });
    setSelectedTextId(copy.id);
    setEditingTextId(null);
  };

  const deleteSelectedShape = () => {
    if (!selectedShape || isShapeLocked(selectedShape)) return;
    const updatedShapes = vectorShapes.filter((shape) => shape.id !== selectedShape.id);
    setVectorShapes(updatedShapes);
    reportCanvasHistory({ vectorShapes: updatedShapes });
    setSelectedShapeId(null);
  };

  const copySelectedShape = () => {
    if (!selectedShape) return;
    copiedItemRef.current = { type: 'shape', data: selectedShape };
    setCopiedNotification('Shape copied');
    setTimeout(() => setCopiedNotification(null), 1800);
  };

  const duplicateSelectedShape = () => {
    if (!selectedShape || isShapeLocked(selectedShape)) return;
    const copy = { ...selectedShape, id: `shape-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, x: selectedShape.x + 24, y: selectedShape.y + 24 };
    const updatedShapes = [...vectorShapes, copy];
    setVectorShapes(updatedShapes);
    reportCanvasHistory({ vectorShapes: updatedShapes });
    setSelectedShapeId(copy.id);
  };

  const deleteSelectedImageElement = () => {
    if (!selectedImageElement || isImageElementLocked(selectedImageElement)) return;
    const updated = imageElements.filter((imgEl) => imgEl.id !== selectedImageElement.id);
    setImageElements(updated);
    reportCanvasHistory({ imageElements: updated });
    setSelectedImageElementId(null);
  };

  const copySelectedImageElement = () => {
    if (!selectedImageElement) return;
    copiedItemRef.current = { type: 'imageElement', data: selectedImageElement };
    setCopiedNotification('Image copied');
    setTimeout(() => setCopiedNotification(null), 1800);
  };

  const duplicateSelectedImageElement = () => {
    if (!selectedImageElement || isImageElementLocked(selectedImageElement)) return;
    const copy = {
      ...selectedImageElement,
      id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      x: selectedImageElement.x + 24,
      y: selectedImageElement.y + 24,
      locked: false,
    };
    const updated = [...imageElements, copy];
    setImageElements(updated);
    reportCanvasHistory({ imageElements: updated });
    setSelectedImageElementId(copy.id);
  };

  const pasteCopiedItem = () => {
    if (!copiedItemRef.current) return;
    if (copiedItemRef.current.type === 'text') {
      const src = copiedItemRef.current.data as CanvasTextLayer;
      const copy = {
        ...src,
        id: `text-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        x: src.x + 24,
        y: src.y + 24,
      };
      const updatedTextLayers = [...textLayers, copy];
      setTextLayers(updatedTextLayers);
      reportCanvasHistory({ textLayers: updatedTextLayers });
      setSelectedTextId(copy.id);
      setEditingTextId(null);
    } else if (copiedItemRef.current.type === 'shape') {
      const src = copiedItemRef.current.data as VectorShape;
      const copy = {
        ...src,
        id: `shape-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        x: src.x + 24,
        y: src.y + 24,
      };
      const updatedShapes = [...vectorShapes, copy];
      setVectorShapes(updatedShapes);
      reportCanvasHistory({ vectorShapes: updatedShapes });
      setSelectedShapeId(copy.id);
    } else if (copiedItemRef.current.type === 'imageElement') {
      const src = copiedItemRef.current.data as CanvasImageElement;
      const copy = {
        ...src,
        id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        x: src.x + 24,
        y: src.y + 24,
      };
      const updated = [...imageElements, copy];
      setImageElements(updated);
      reportCanvasHistory({ imageElements: updated });
      setSelectedImageElementId(copy.id);
    }
  };

  useEffect(() => {
    const handleSelectImageElement = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      if (id) {
        setSelectedImageElementId(id);
        setSelectedShapeId(null);
        setSelectedTextId(null);
        setIsCanvasBackgroundSelected(false);
        setIsImageSelected(false);
        onBaseImageSelectionChange(false);
      }
    };
    window.addEventListener('image-studio:select-image-element', handleSelectImageElement);
    return () => window.removeEventListener('image-studio:select-image-element', handleSelectImageElement);
  }, [onBaseImageSelectionChange]);

  useEffect(() => {
    const handleWindowMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        !target.closest?.('[data-floating-toolbar]')
      ) {
        setIsCanvasBackgroundSelected(false);
      }
    };
    window.addEventListener('mousedown', handleWindowMouseDown);
    return () => window.removeEventListener('mousedown', handleWindowMouseDown);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(target?.tagName ?? '')) {
        return;
      }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (selectedImageElementId) {
          event.preventDefault();
          deleteSelectedImageElement();
        } else if (selectedShapeId) {
          event.preventDefault();
          deleteSelectedShape();
        } else if (selectedTextId) {
          event.preventDefault();
          deleteSelectedText();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImageElementId, selectedShapeId, selectedTextId, imageElements, vectorShapes, textLayers, layers]);

  useEffect(() => {
    const handleCopyPasteKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(target?.tagName ?? '')) {
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c') {
        if (selectedTextLayer) copySelectedText();
        else if (selectedShape) copySelectedShape();
        else if (selectedImageElement) copySelectedImageElement();
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'v') {
        pasteCopiedItem();
      }
    };
    window.addEventListener('keydown', handleCopyPasteKey);
    return () => window.removeEventListener('keydown', handleCopyPasteKey);
  }, [selectedTextLayer, selectedShape, selectedImageElement, textLayers, vectorShapes, imageElements]);

  useEffect(() => {
    const handleTextAction = (event: Event) => {
      const action = (event as CustomEvent<'back' | 'duplicate' | 'delete'>).detail;
      if (action === 'duplicate') duplicateSelectedText();
      else if (action === 'delete') deleteSelectedText();
      else if (action === 'back') {
        setEditingTextId(null);
        setSelectedTextId(null);
      }
    };
    window.addEventListener('image-studio:text-action', handleTextAction);
    return () => window.removeEventListener('image-studio:text-action', handleTextAction);
  }, [selectedTextLayer, textLayers, layers]);

  useEffect(() => {
    const handleShapeAction = (event: Event) => {
      const action = (event as CustomEvent<'duplicate' | 'delete'>).detail;
      if (action === 'duplicate') duplicateSelectedShape();
      else if (action === 'delete') deleteSelectedShape();
    };
    window.addEventListener('image-studio:shape-action', handleShapeAction);
    return () => window.removeEventListener('image-studio:shape-action', handleShapeAction);
  }, [selectedShape, vectorShapes, layers]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('image-studio:selected-image-element-settings', {
      detail: selectedImageElement ? {
        id: selectedImageElement.id,
        adjustments: selectedImageElement.adjustments,
        locked: isImageElementLocked(selectedImageElement),
      } : null,
    }));
  }, [selectedImageElement, layers]);

  useEffect(() => {
    const handleImageElementAction = (event: Event) => {
      const action = (event as CustomEvent<'copy' | 'duplicate' | 'delete'>).detail;
      if (action === 'copy') copySelectedImageElement();
      else if (action === 'duplicate') duplicateSelectedImageElement();
      else if (action === 'delete') deleteSelectedImageElement();
    };
    window.addEventListener('image-studio:image-element-action', handleImageElementAction);
    return () => window.removeEventListener('image-studio:image-element-action', handleImageElementAction);
  }, [selectedImageElement, imageElements, layers]);

  return (
    <main 
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`flex-1 relative w-full h-full overflow-hidden bg-zinc-950/70 flex items-center justify-center checkerboard-bg select-none ${getCursorClass()}`}
      style={activeTool === 'brush' ? { cursor: BRUSH_CURSOR } : undefined}
    >
      {/* Hidden processing canvas */}
      <canvas ref={hiddenCanvasRef} className="hidden" />

      {/* Drag & drop overlay */}
      {isDragOver && (
        <div className="absolute inset-0 bg-indigo-950/80 backdrop-blur-md border-2 border-dashed border-indigo-400 z-50 flex flex-col items-center justify-center gap-3 text-white pointer-events-none animate-in fade-in duration-150">
          <UploadCloud className="w-14 h-14 text-indigo-400 animate-bounce" />
          <p className="text-xl font-bold tracking-tight">Drop your image here to import</p>
          <span className="text-xs text-indigo-200 font-mono">Supports PNG, JPG, WebP, SVG</span>
        </div>
      )}

      {/* Canva Floating Contextual Toolbar when an Element/Text/Shape/Image is selected or Canvas Background Color Bar */}
      {(selectedTextLayer || selectedShape || selectedImageElement || isImageSelected) ? (
        <div data-floating-toolbar="true" onMouseDown={(e) => e.stopPropagation()} className="absolute top-4 z-40 bg-zinc-900/90 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-zinc-700/80 shadow-2xl flex items-center gap-2 text-xs animate-in slide-in-from-top-2 duration-150">
          {selectedTextLayer && (
            <>
              <div className="flex items-center gap-1.5 pr-2 border-r border-zinc-800">
                <TypeIcon className="w-3.5 h-3.5 text-indigo-400" />
                <span className="font-semibold text-zinc-200">Text Element</span>
              </div>

              {/* Color Swatch */}
              <div className="flex items-center gap-1">
                <input
                  type="color"
                  value={selectedTextLayer.color}
                  onChange={(e) => {
                    const color = e.target.value;
                    onSelectedColorChange(color);
                    const updated = textLayers.map((l) => l.id === selectedTextLayer.id ? { ...l, color } : l);
                    setTextLayers(updated);
                    reportCanvasHistory({ textLayers: updated });
                  }}
                  className="w-5 h-5 rounded cursor-pointer border border-zinc-700 bg-transparent p-0"
                  title="Text color"
                />
              </div>

              {/* Quick Font Controls */}
              <button
                type="button"
                onClick={() => {
                  const updated = textLayers.map((l) => l.id === selectedTextLayer.id ? { ...l, bold: !l.bold } : l);
                  setTextLayers(updated);
                  reportCanvasHistory({ textLayers: updated });
                }}
                className={`px-2 py-0.5 font-bold rounded ${selectedTextLayer.bold ? 'bg-indigo-600 text-white' : 'text-zinc-300 hover:bg-zinc-800'}`}
              >
                B
              </button>

              <button
                type="button"
                onClick={() => {
                  const updated = textLayers.map((l) => l.id === selectedTextLayer.id ? { ...l, italic: !l.italic } : l);
                  setTextLayers(updated);
                  reportCanvasHistory({ textLayers: updated });
                }}
                className={`px-2 py-0.5 italic rounded ${selectedTextLayer.italic ? 'bg-indigo-600 text-white' : 'text-zinc-300 hover:bg-zinc-800'}`}
              >
                I
              </button>

              <div className="h-4 w-px bg-zinc-800 mx-1" />

              <button
                type="button"
                onClick={triggerFindColor}
                className="p-1.5 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded transition flex items-center gap-1"
                title="Find Color / Sample Color from Canvas"
              >
                <Pipette className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-[10px] font-medium">Find Color</span>
              </button>

              <button
                type="button"
                onClick={copySelectedText}
                className="p-1.5 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded transition flex items-center gap-1"
                title="Copy Text to Clipboard"
              >
                <Copy className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-[10px] font-medium">Copy</span>
              </button>

              <button
                type="button"
                onClick={duplicateSelectedText}
                className="p-1.5 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded transition flex items-center gap-1"
                title="Duplicate Text"
              >
                <CopyPlus className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-[10px] font-medium">Duplicate</span>
              </button>

              <button
                type="button"
                onClick={() => toggleLockSelectedText()}
                className="p-1.5 text-zinc-300 hover:text-amber-400 hover:bg-zinc-800 rounded transition flex items-center gap-1"
                title="Lock Text"
              >
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[10px] font-medium">Lock</span>
              </button>

              <button
                type="button"
                onClick={deleteSelectedText}
                className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-950/50 rounded transition"
                title="Delete Text"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {selectedShape && (
            <>
              <div className="flex items-center gap-1.5 pr-2 border-r border-zinc-800">
                <ShapesIcon className="w-3.5 h-3.5 text-indigo-400" />
                <span className="font-semibold text-zinc-200 capitalize">{selectedShape.type} Shape</span>
              </div>

              <input
                type="color"
                value={selectedShape.color}
                onChange={(e) => {
                  const color = e.target.value;
                  onSelectedColorChange(color);
                  const updated = vectorShapes.map((s) => s.id === selectedShape.id ? { ...s, color } : s);
                  setVectorShapes(updated);
                  reportCanvasHistory({ vectorShapes: updated });
                }}
                className="w-5 h-5 rounded cursor-pointer border border-zinc-700 bg-transparent p-0"
                title="Shape color"
              />

              <button
                type="button"
                onClick={triggerFindColor}
                className="p-1.5 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded transition flex items-center gap-1"
                title="Find Color / Sample Color from Canvas"
              >
                <Pipette className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-[10px] font-medium">Find Color</span>
              </button>

              <button
                type="button"
                onClick={copySelectedShape}
                className="p-1.5 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded transition flex items-center gap-1"
                title="Copy Shape to Clipboard"
              >
                <Copy className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-[10px] font-medium">Copy</span>
              </button>

              <button
                type="button"
                onClick={duplicateSelectedShape}
                className="p-1.5 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded transition flex items-center gap-1"
                title="Duplicate Shape"
              >
                <CopyPlus className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-[10px] font-medium">Duplicate</span>
              </button>

              <button
                type="button"
                onClick={() => toggleLockSelectedShape()}
                className="p-1.5 text-zinc-300 hover:text-amber-400 hover:bg-zinc-800 rounded transition flex items-center gap-1"
                title="Lock Shape"
              >
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[10px] font-medium">Lock</span>
              </button>

              <button
                type="button"
                onClick={deleteSelectedShape}
                className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-950/50 rounded transition"
                title="Delete Shape"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {selectedImageElement && (
            <>
              <div className="flex items-center gap-1.5 pr-2 border-r border-zinc-800">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span className="font-semibold text-zinc-200 truncate max-w-[120px]">{selectedImageElement.name || 'Image Object'}</span>
              </div>

              <button
                type="button"
                onClick={triggerFindColor}
                className="p-1.5 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded transition flex items-center gap-1"
                title="Find Color / Sample Color from Canvas"
              >
                <Pipette className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-[10px] font-medium">Find Color</span>
              </button>

              <button
                type="button"
                onClick={copySelectedImageElement}
                className="p-1.5 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded transition flex items-center gap-1"
                title="Copy Image to Clipboard"
              >
                <Copy className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-[10px] font-medium">Copy</span>
              </button>

              <button
                type="button"
                onClick={duplicateSelectedImageElement}
                className="p-1.5 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded transition flex items-center gap-1"
                title="Duplicate Image Object"
              >
                <CopyPlus className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-[10px] font-medium">Duplicate</span>
              </button>

              <button
                type="button"
                onClick={() => toggleLockSelectedImageElement()}
                className="p-1.5 text-zinc-300 hover:text-amber-400 hover:bg-zinc-800 rounded transition flex items-center gap-1"
                title="Lock Image"
              >
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[10px] font-medium">Lock</span>
              </button>

              <button
                type="button"
                onClick={deleteSelectedImageElement}
                className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-950/50 rounded transition"
                title="Delete Image Object"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {isImageSelected && (
            <>
              <span className="font-semibold text-zinc-200 pr-2 border-r border-zinc-800">Base Image</span>
              <button
                type="button"
                onClick={triggerFindColor}
                className="p-1.5 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded transition flex items-center gap-1"
                title="Find Color / Sample Color from Canvas"
              >
                <Pipette className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-[10px] font-medium">Find Color</span>
              </button>
              <button
                type="button"
                onClick={toggleLockBaseImage}
                className="p-1.5 text-zinc-300 hover:text-amber-400 hover:bg-zinc-800 rounded transition flex items-center gap-1"
                title="Lock Base Image"
              >
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[10px] font-medium">Lock</span>
              </button>
              <button
                type="button"
                onClick={() => onZoomChange(1.0)}
                className="px-2 py-1 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded"
              >
                Reset Zoom
              </button>
            </>
          )}
        </div>
      ) : isCanvasBackgroundSelected ? (
        <div data-floating-toolbar="true" onMouseDown={(e) => e.stopPropagation()} className="absolute top-4 z-40 bg-zinc-900/90 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-zinc-700/80 shadow-2xl flex items-center gap-2.5 text-xs animate-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-1.5 pr-2 border-r border-zinc-800">
            <Palette className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-semibold text-zinc-200">Canvas Color</span>
          </div>
          <input
            type="color"
            value={canvasBgColor}
            onChange={(e) => onCanvasBgColorChange?.(e.target.value)}
            className="w-5 h-5 rounded cursor-pointer border border-zinc-700 bg-transparent p-0"
            title="Custom Canvas Background Color"
          />
          <div className="flex items-center gap-1.5">
            {['#ffffff', '#f4f4f5', '#18181b', '#000000', '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'].map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => onCanvasBgColorChange?.(color)}
                className={`w-4 h-4 rounded-full border transition ${canvasBgColor.toLowerCase() === color ? 'border-white ring-2 ring-indigo-500 scale-110' : 'border-zinc-700 hover:scale-105'}`}
                style={{ backgroundColor: color }}
                title={`Set canvas background color to ${color}`}
              />
            ))}
          </div>
          <div className="h-4 w-px bg-zinc-800 mx-0.5" />
          <button
            type="button"
            onClick={triggerFindColor}
            className="p-1.5 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded transition flex items-center gap-1"
            title="Find Color / Sample Color from Canvas"
          >
            <Pipette className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-[10px] font-medium">Find Color</span>
          </button>
        </div>
      ) : null}

      {/* Canvas Image Container */}
      <div 
        ref={imageContainerRef}
        className="transition-transform duration-75 ease-out relative inline-block shadow-2xl rounded-lg overflow-hidden border border-zinc-800/80"
        style={{
          transform: cssTransform,
          filter: 'none',
          backgroundColor: canvasBgColor,
          minWidth: !imageUrl ? 1000 : undefined,
          minHeight: !imageUrl ? 700 : undefined,
        }}
      >
        {imageUrl ? (
          <img
            ref={imageRef}
            src={imageUrl}
            alt={imageName}
            crossOrigin="anonymous"
            onLoad={(e) => {
              const target = e.currentTarget;
              setNaturalDimensions({
                width: target.naturalWidth,
                height: target.naturalHeight,
              });
            }}
            style={{
              filter: cssFilter,
              opacity: (adjustments.opacity ?? 100) / 100,
              ...(eraserMaskImage ? {
                maskImage: eraserMaskImage,
                WebkitMaskImage: eraserMaskImage,
                maskSize: '100% 100%',
                WebkitMaskSize: '100% 100%',
                visibility: baseImageLayer?.visible === true ? 'visible' : 'hidden',
              } : { visibility: baseImageLayer?.visible === true ? 'visible' : 'hidden' }),
            }}
            className="max-w-[75vw] max-h-[70vh] object-contain rounded shadow-2xl pointer-events-none"
          />
        ) : (
          <div
            style={{ width: 1000, height: 700 }}
            className="w-[1000px] h-[700px] bg-transparent pointer-events-none"
          />
        )}

        {activeTool === 'select' && isImageSelected && (
          <div className="absolute -inset-1 border border-dashed border-indigo-400 pointer-events-none">
            <span className="absolute -left-1 -top-1 h-2.5 w-2.5 border border-indigo-200 bg-indigo-500 rounded-sm" />
            <span className="absolute -right-1 -top-1 h-2.5 w-2.5 border border-indigo-200 bg-indigo-500 rounded-sm" />
            <span className="absolute -bottom-1 -left-1 h-2.5 w-2.5 border border-indigo-200 bg-indigo-500 rounded-sm" />
            <span className="absolute -bottom-1 -right-1 h-2.5 w-2.5 border border-indigo-200 bg-indigo-500 rounded-sm" />
          </div>
        )}

        {imageRef.current && naturalDimensions.width > 0 && (
          <svg
            className="absolute z-20 touch-none"
            style={{
              left: imageRef.current.offsetLeft + imageRef.current.clientLeft,
              top: imageRef.current.offsetTop + imageRef.current.clientTop,
              pointerEvents: activeTool === 'brush' ? 'auto' : 'none',
              maskImage: eraserMaskImage,
              WebkitMaskImage: eraserMaskImage,
              maskSize: '100% 100%',
              WebkitMaskSize: '100% 100%',
            }}
            width={imageRef.current.clientWidth}
            height={imageRef.current.clientHeight}
            viewBox={`0 0 ${naturalDimensions.width} ${naturalDimensions.height}`}
            preserveAspectRatio="none"
            onPointerDown={activeTool === 'brush' ? handleBrushPointerDown : undefined}
            onPointerMove={activeTool === 'brush' ? handleBrushPointerMove : undefined}
            onPointerUp={activeTool === 'brush' ? handleBrushPointerUp : undefined}
            onPointerCancel={activeTool === 'brush' ? handleBrushPointerUp : undefined}
          >
            {visibleBrushStrokes.map((stroke, index) => (
              stroke.points.length === 1 ? (
                <circle
                  key={index}
                  cx={stroke.points[0].x}
                  cy={stroke.points[0].y}
                  r={stroke.width / 2}
                  fill={stroke.color}
                  fillOpacity={stroke.opacity ?? 1}
                />
              ) : (
                <polyline
                  key={index}
                  points={stroke.points.map((point) => `${point.x},${point.y}`).join(' ')}
                  fill="none"
                  stroke={stroke.color}
                  strokeOpacity={stroke.opacity ?? 1}
                  strokeWidth={stroke.width}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )
            ))}
          </svg>
        )}

        {activeTool === 'eraser' && imageRef.current && naturalDimensions.width > 0 && (
          <svg
            className="absolute z-20 touch-none"
            style={{
              left: imageRef.current.offsetLeft + imageRef.current.clientLeft,
              top: imageRef.current.offsetTop + imageRef.current.clientTop,
            }}
            width={imageRef.current.clientWidth}
            height={imageRef.current.clientHeight}
            viewBox={`0 0 ${naturalDimensions.width} ${naturalDimensions.height}`}
            preserveAspectRatio="none"
            onPointerDown={handleEraserPointerDown}
            onPointerMove={handleEraserPointerMove}
            onPointerUp={handleEraserPointerUp}
            onPointerCancel={handleEraserPointerUp}
          >
            <rect width="100%" height="100%" fill="transparent" pointerEvents="all" />
          </svg>
        )}

        {activeTool === 'blur' && imageRef.current && naturalDimensions.width > 0 && (
          <svg
            className="absolute z-25 touch-none cursor-crosshair"
            style={{
              left: imageRef.current.offsetLeft + imageRef.current.clientLeft,
              top: imageRef.current.offsetTop + imageRef.current.clientTop,
            }}
            width={imageRef.current.clientWidth}
            height={imageRef.current.clientHeight}
            viewBox={`0 0 ${naturalDimensions.width} ${naturalDimensions.height}`}
            preserveAspectRatio="none"
            onPointerDown={handleBlurPointerDown}
            onPointerMove={handleBlurPointerMove}
            onPointerUp={handleBlurPointerUp}
            onPointerCancel={handleBlurPointerUp}
          >
            <rect width="100%" height="100%" fill="transparent" pointerEvents="all" />
          </svg>
        )}

        {visibleBlurStrokes.length > 0 && imageRef.current && naturalDimensions.width > 0 && (
          <div
            className="absolute pointer-events-none rounded overflow-hidden z-10"
            style={{
              left: imageRef.current.offsetLeft + imageRef.current.clientLeft,
              top: imageRef.current.offsetTop + imageRef.current.clientTop,
              width: imageRef.current.clientWidth,
              height: imageRef.current.clientHeight,
              visibility: baseImageLayer?.visible === true ? 'visible' : 'hidden',
            }}
          >
            {Array.from(new Set(visibleBlurStrokes.map((s) => s.blurAmount || 12))).map((amount) => {
              const strokesForAmount = visibleBlurStrokes.filter((s) => (s.blurAmount || 12) === amount);
              const blurMask = createBlurMaskImage(strokesForAmount, naturalDimensions.width, naturalDimensions.height);
              if (!blurMask) return null;

              return (
                <img
                  key={`blur-overlay-${amount}`}
                  src={imageUrl}
                  alt=""
                  crossOrigin="anonymous"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    filter: `blur(${amount}px)`,
                    maskImage: blurMask,
                    WebkitMaskImage: blurMask,
                    maskSize: '100% 100%',
                    WebkitMaskSize: '100% 100%',
                  }}
                  className="pointer-events-none"
                />
              );
            })}
          </div>
        )}

        {activeTool === 'eyedropper' && imageRef.current && naturalDimensions.width > 0 && (
          <div
            className="absolute z-30 cursor-crosshair touch-none"
            style={{
              left: imageRef.current.offsetLeft + imageRef.current.clientLeft,
              top: imageRef.current.offsetTop + imageRef.current.clientTop,
              width: imageRef.current.clientWidth,
              height: imageRef.current.clientHeight,
            }}
            onPointerDown={handlePickColor}
            onClick={handlePickColor}
            title="Click canvas to pick color"
          />
        )}

        {naturalDimensions.width > 0 && (
          <svg
            className="absolute z-20 touch-none"
            style={{
              left: imageRef.current ? imageRef.current.offsetLeft + imageRef.current.clientLeft : 0,
              top: imageRef.current ? imageRef.current.offsetTop + imageRef.current.clientTop : 0,
              pointerEvents: activeTool === 'shapes' || activeTool === 'select' ? 'auto' : 'none',
            }}
            width={imageRef.current?.clientWidth || 1000}
            height={imageRef.current?.clientHeight || 700}
            viewBox={`0 0 ${naturalDimensions.width} ${naturalDimensions.height}`}
            preserveAspectRatio="none"
            onPointerDown={activeTool === 'shapes' || activeTool === 'select' ? handleShapePointerDown : undefined}
            onPointerMove={activeTool === 'shapes' || activeTool === 'select' ? handleShapePointerMove : undefined}
            onPointerUp={activeTool === 'shapes' || activeTool === 'select' ? handleShapePointerUp : undefined}
            onPointerCancel={activeTool === 'shapes' || activeTool === 'select' ? handleShapePointerUp : undefined}
          >
            {(activeTool === 'shapes' || activeTool === 'select') && <rect width="100%" height="100%" fill="transparent" pointerEvents="all" />}
            {visibleImageElements.map((imgEl) => {
              const selected = imgEl.id === selectedImageElementId;
              const imgLocked = isImageElementLocked(imgEl);
              const canvasW = imageRef.current?.clientWidth || 1000;
              const canvasH = imageRef.current?.clientHeight || 700;
              const handleWidth = 12 * naturalDimensions.width / canvasW;
              const handleHeight = 12 * naturalDimensions.height / canvasH;

              return (
                <g
                  key={imgEl.id}
                  data-image-element-id={imgEl.id}
                  onPointerDown={(e) => handleImageElementPointerDown(e, imgEl)}
                  onPointerMove={handleImageElementPointerMove}
                  onPointerUp={handleImageElementPointerUp}
                  onPointerCancel={handleImageElementPointerUp}
                >
                  <image
                    href={imgEl.url}
                    x={imgEl.x}
                    y={imgEl.y}
                    width={imgEl.width}
                    height={imgEl.height}
                    preserveAspectRatio="none"
                    style={{
                      cursor: imgLocked ? 'default' : 'move',
                      filter: getImageFilterString(imgEl.adjustments),
                      opacity: (imgEl.adjustments?.opacity ?? 100) / 100,
                    }}
                    pointerEvents={imgLocked ? 'none' : 'all'}
                  />
                  {selected && !imgLocked && (
                    <rect
                      x={imgEl.x}
                      y={imgEl.y}
                      width={imgEl.width}
                      height={imgEl.height}
                      fill="none"
                      stroke="#818cf8"
                      strokeWidth={Math.max(1.5, handleWidth / 5)}
                      strokeDasharray={`${handleWidth * 1.5}`}
                      pointerEvents="none"
                    />
                  )}
                  {selected && !imgLocked && (
                    ([
                      // 4 Corners (dual directions)
                      ['nw', imgEl.x, imgEl.y, 'nwse-resize'],
                      ['ne', imgEl.x + imgEl.width, imgEl.y, 'nesw-resize'],
                      ['sw', imgEl.x, imgEl.y + imgEl.height, 'nesw-resize'],
                      ['se', imgEl.x + imgEl.width, imgEl.y + imgEl.height, 'nwse-resize'],
                      // 4 Sides / Edges (single direction)
                      ['n', imgEl.x + imgEl.width / 2, imgEl.y, 'ns-resize'],
                      ['s', imgEl.x + imgEl.width / 2, imgEl.y + imgEl.height, 'ns-resize'],
                      ['w', imgEl.x, imgEl.y + imgEl.height / 2, 'ew-resize'],
                      ['e', imgEl.x + imgEl.width, imgEl.y + imgEl.height / 2, 'ew-resize'],
                    ] as const).map(([handle, handleX, handleY, cursor]) => (
                      <rect
                        key={handle}
                        data-img-resize={handle}
                        x={handleX - handleWidth / 2}
                        y={handleY - handleHeight / 2}
                        width={handleWidth}
                        height={handleHeight}
                        fill="white"
                        stroke="#4f46e5"
                        strokeWidth={Math.max(1.5, handleWidth / 5)}
                        style={{ cursor }}
                        pointerEvents="all"
                      />
                    ))
                  )}
                  {imgLocked && (
                    <g
                      className="cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        unlockImageElement(imgEl);
                      }}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                      }}
                      pointerEvents="all"
                    >
                      <title>Locked - Click to unlock</title>
                      <rect
                        x={imgEl.x + imgEl.width - Math.max(30, handleWidth * 2.4)}
                        y={imgEl.y + 6}
                        width={Math.max(26, handleWidth * 2)}
                        height={Math.max(26, handleHeight * 2)}
                        rx={6}
                        fill="#18181b"
                        stroke="#f59e0b"
                        strokeWidth={1.5}
                      />
                      <path
                        d={`M ${imgEl.x + imgEl.width - Math.max(30, handleWidth * 2.4) + Math.max(26, handleWidth * 2) / 2 - 4} ${imgEl.y + 6 + Math.max(26, handleHeight * 2) / 2 - 1} v -3 a 4 4 0 0 1 8 0 v 3 m -7 0 h 6 a 1 1 0 0 1 1 1 v 5 a 1 1 0 0 1 -1 1 h -6 a 1 1 0 0 1 -1 -1 v -5 a 1 1 0 0 1 1 -1 z`}
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth={1.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </g>
                  )}
                </g>
              );
            })}
            {[...visibleVectorShapes, ...(shapeDraft && visibleLayerIds.has(shapeDraft.layerId) ? [shapeDraft] : [])].map((shape) => {
              const selected = shape.id === selectedShapeId && !shapeDraft;
              const shapeLocked = isShapeLocked(shape);
              const canvasW = imageRef.current?.clientWidth || 1000;
              const canvasH = imageRef.current?.clientHeight || 700;
              const handleWidth = 9 * naturalDimensions.width / canvasW;
              const handleHeight = 9 * naturalDimensions.height / canvasH;
              return (
                <g 
                  key={shape.id} 
                  data-shape-id={shape.id}
                  onPointerDown={(e) => handleShapeGroupPointerDown(e, shape)}
                  onPointerMove={handleShapePointerMove}
                  onPointerUp={handleShapePointerUp}
                  onPointerCancel={handleShapePointerUp}
                >
                  <rect
                    x={shape.x}
                    y={shape.y}
                    width={shape.width}
                    height={shape.height}
                    rx={shape.type === 'ellipse' ? '50%' : undefined}
                    fill={shape.filled ? shape.color : 'transparent'}
                    stroke={shape.color}
                    strokeWidth={shape.strokeWidth ?? Math.max(2, Math.min(naturalDimensions.width, naturalDimensions.height) / 300)}
                    pointerEvents={shapeLocked ? 'none' : 'all'}
                  />
                  {selected && !shapeLocked && <rect x={shape.x} y={shape.y} width={shape.width} height={shape.height} fill="none" stroke="#818cf8" strokeDasharray={`${handleWidth * 1.5}`} pointerEvents="none" />}
                  {selected && !shapeLocked && ([
                    // 4 Corners (both directions)
                    ['nw', shape.x, shape.y, 'nwse-resize'],
                    ['ne', shape.x + shape.width, shape.y, 'nesw-resize'],
                    ['sw', shape.x, shape.y + shape.height, 'nesw-resize'],
                    ['se', shape.x + shape.width, shape.y + shape.height, 'nwse-resize'],
                    // 4 Sides / Edges (single direction)
                    ['n', shape.x + shape.width / 2, shape.y, 'ns-resize'],
                    ['s', shape.x + shape.width / 2, shape.y + shape.height, 'ns-resize'],
                    ['w', shape.x, shape.y + shape.height / 2, 'ew-resize'],
                    ['e', shape.x + shape.width, shape.y + shape.height / 2, 'ew-resize'],
                  ] as const).map(([handle, handleX, handleY, cursor]) => (
                    <rect
                      key={handle}
                      data-shape-resize={handle}
                      x={handleX - handleWidth / 2}
                      y={handleY - handleHeight / 2}
                      width={handleWidth}
                      height={handleHeight}
                      fill="white"
                      stroke="#4f46e5"
                      strokeWidth={Math.max(1.5, handleWidth / 5)}
                      style={{ cursor }}
                      pointerEvents="all"
                    />
                  ))}
                  {shapeLocked && (
                    <g
                      className="cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        unlockShape(shape);
                      }}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                      }}
                      pointerEvents="all"
                    >
                      <title>Locked - Click to unlock</title>
                      <rect
                        x={shape.x + shape.width - Math.max(26, handleWidth * 2.2)}
                        y={shape.y + 4}
                        width={Math.max(22, handleWidth * 1.8)}
                        height={Math.max(22, handleHeight * 1.8)}
                        rx={5}
                        fill="#18181b"
                        stroke="#f59e0b"
                        strokeWidth={1.5}
                      />
                      <path
                        d={`M ${shape.x + shape.width - Math.max(26, handleWidth * 2.2) + Math.max(22, handleWidth * 1.8) / 2 - 3.5} ${shape.y + 4 + Math.max(22, handleHeight * 1.8) / 2 - 1} v -2.5 a 3.5 3.5 0 0 1 7 0 v 2.5 m -6 0 h 5 a 1 1 0 0 1 1 1 v 4.5 a 1 1 0 0 1 -1 1 h -5 a 1 1 0 0 1 -1 -1 v -4.5 a 1 1 0 0 1 1 -1 z`}
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth={1.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        )}

        {/* Smart Spacing Guides Overlay */}
        {naturalDimensions.width > 0 && (activeGuides.lines.length > 0 || activeGuides.distances.length > 0) && (
          <svg
            className="absolute z-30 pointer-events-none"
            style={{
              left: imageRef.current ? imageRef.current.offsetLeft + imageRef.current.clientLeft : 0,
              top: imageRef.current ? imageRef.current.offsetTop + imageRef.current.clientTop : 0,
            }}
            width={imageRef.current?.clientWidth || 1000}
            height={imageRef.current?.clientHeight || 700}
            viewBox={`0 0 ${naturalDimensions.width} ${naturalDimensions.height}`}
            preserveAspectRatio="none"
          >
            {/* Alignment Lines */}
            {activeGuides.lines.map((line, idx) => (
              <line
                key={`guide-line-${idx}`}
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
                stroke="#ec4899"
                strokeWidth={1.5 * (naturalDimensions.width / (imageRef.current?.clientWidth || 1000))}
                strokeDasharray="4 4"
              />
            ))}

            {/* Distance Lines & Labels */}
            {activeGuides.distances.map((dist, idx) => {
              const canvasW = imageRef.current?.clientWidth || 1000;
              const canvasH = imageRef.current?.clientHeight || 700;
              const strokeWidth = 1.2 * (naturalDimensions.width / canvasW);
              const tickSize = 4 * (naturalDimensions.width / canvasW);
              const color = dist.isEqual ? '#a855f7' : '#ec4899';
              
              return (
                <g key={`dist-${idx}`}>
                  <line
                    x1={dist.x1}
                    y1={dist.y1}
                    x2={dist.x2}
                    y2={dist.y2}
                    stroke={color}
                    strokeWidth={strokeWidth}
                  />
                  {dist.orientation === 'h' ? (
                    <>
                      <line x1={dist.x1} y1={dist.y1 - tickSize} x2={dist.x1} y2={dist.y1 + tickSize} stroke={color} strokeWidth={strokeWidth} />
                      <line x1={dist.x2} y1={dist.y2 - tickSize} x2={dist.x2} y2={dist.y2 + tickSize} stroke={color} strokeWidth={strokeWidth} />
                    </>
                  ) : (
                    <>
                      <line x1={dist.x1 - tickSize} y1={dist.y1} x2={dist.x1 + tickSize} y2={dist.y1} stroke={color} strokeWidth={strokeWidth} />
                      <line x1={dist.x2 - tickSize} y1={dist.y2} x2={dist.x2 + tickSize} y2={dist.y2} stroke={color} strokeWidth={strokeWidth} />
                    </>
                  )}
                  <g transform={`translate(${dist.labelX}, ${dist.labelY})`}>
                    <rect
                      x={-22 * (naturalDimensions.width / canvasW)}
                      y={-10 * (naturalDimensions.height / canvasH)}
                      width={44 * (naturalDimensions.width / canvasW)}
                      height={20 * (naturalDimensions.height / canvasH)}
                      rx={4 * (naturalDimensions.width / canvasW)}
                      fill={color}
                    />
                    <text
                      x="0"
                      y="0"
                      fill="#ffffff"
                      fontSize={11 * (naturalDimensions.height / canvasH)}
                      fontWeight="bold"
                      textAnchor="middle"
                      dominantBaseline="central"
                    >
                      {dist.isEqual ? `= ${dist.value}px` : `${dist.value}px`}
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>
        )}

        {naturalDimensions.width > 0 && (
          <div
            className="absolute inset-0 z-30 touch-none"
            style={{ pointerEvents: 'none' }}
          >
            {visibleTextLayers.map((layer) => {
              const canvasW = imageRef.current?.clientWidth || 1000;
              const canvasH = imageRef.current?.clientHeight || 700;
              const scaleX = canvasW / naturalDimensions.width;
              const scaleY = canvasH / naturalDimensions.height;
              const left = (imageRef.current ? imageRef.current.offsetLeft + imageRef.current.clientLeft : 0) + layer.x * scaleX;
              const top = (imageRef.current ? imageRef.current.offsetTop + imageRef.current.clientTop : 0) + layer.y * scaleY;
              const isEditing = editingTextId === layer.id;
              const isSelected = selectedTextId === layer.id;
              const textLocked = isTextLocked(layer);

              return (
                <div
                  key={layer.id}
                  data-text-layer="true"
                  className={`absolute select-none ${isSelected && !textLocked ? 'outline outline-1 outline-blue-500/40' : ''}`}
                  style={{
                    left,
                    top,
                    pointerEvents: textLocked ? 'none' : (activeTool === 'text' || activeTool === 'select' ? 'auto' : 'none'),
                    width: (layer.width ?? Math.max(layer.fontSize * 4, 160)) * scaleX,
                    height: (layer.height ?? Math.max(layer.fontSize * 2, 64)) * scaleY,
                    fontSize: (layer.fontSize || 32) * scaleY,
                    lineHeight: 1.2,
                    color: layer.color || '#000000',
                    fontFamily: `${layer.fontFamily ?? 'Arial'}, sans-serif`,
                    fontWeight: layer.bold ? 'bold' : 'normal',
                    fontStyle: layer.italic ? 'italic' : 'normal',
                    textAlign: layer.textAlign ?? 'left',
                    whiteSpace: 'pre-wrap',
                    overflowWrap: 'anywhere',
                    zIndex: 10,
                  }}
                  onPointerDown={(e) => handleTextLayerPointerDown(e, layer)}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    if (isTextLocked(layer)) return;
                    setSelectedTextId(layer.id);
                    selectTextOnEditRef.current = false;
                    setEditingTextId(layer.id);
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isTextLocked(layer)) return;
                    setSelectedTextId(layer.id);
                    window.dispatchEvent(new Event('image-studio:show-tool-options'));
                  }}
                >
                  {isEditing ? (
                    <textarea
                      ref={textInputRef}
                      rows={Math.max(1, layer.text.split('\n').length)}
                      value={layer.text}
                      onPointerDown={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        const updatedTextLayers = textLayers.map((textLayer) =>
                          textLayer.id === layer.id
                            ? { ...textLayer, text: e.target.value }
                            : textLayer,
                        );
                        setTextLayers(updatedTextLayers);
                        reportCanvasHistory({ textLayers: updatedTextLayers });
                      }}
                      onBlur={() => {
                        setEditingTextId((current) => current === layer.id ? null : current);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          e.currentTarget.blur();
                        }
                      }}
                      className="min-h-8 min-w-40 select-text resize rounded border border-indigo-400 bg-zinc-950/80 p-1 text-white outline-none"
                      style={{
                        fontSize: layer.fontSize * scaleY,
                        lineHeight: 1.2,
                        width: '100%',
                        height: '100%',
                        boxSizing: 'border-box',
                        color: layer.color,
                        fontFamily: `${layer.fontFamily ?? 'Arial'}, sans-serif`,
                        fontWeight: layer.bold ? 'bold' : 'normal',
                        fontStyle: layer.italic ? 'italic' : 'normal',
                        textAlign: layer.textAlign ?? 'left',
                      }}
                    />
                  ) : (
                    <div className="absolute inset-0 overflow-hidden">
                      {layer.text.split('\n').map((line, index) => (
                        <React.Fragment key={`${layer.id}-${index}`}>
                          {index > 0 && <br />}
                          {line || '\u00a0'}
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                  {isSelected && !isEditing && !textLocked && (
                    <>
                      {[
                        ['nw', '-left-1.5 -top-1.5 cursor-nwse-resize'],
                        ['n', 'left-1/2 -top-1.5 -translate-x-1/2 cursor-ns-resize'],
                        ['ne', '-right-1.5 -top-1.5 cursor-nesw-resize'],
                        ['e', '-right-1.5 top-1/2 -translate-y-1/2 cursor-ew-resize'],
                        ['se', '-right-1.5 -bottom-1.5 cursor-nwse-resize'],
                        ['s', 'left-1/2 -bottom-1.5 -translate-x-1/2 cursor-ns-resize'],
                        ['sw', '-left-1.5 -bottom-1.5 cursor-nesw-resize'],
                        ['w', '-left-1.5 top-1/2 -translate-y-1/2 cursor-ew-resize'],
                      ].map(([handle, positionClass]) => (
                        <span
                          key={handle}
                          data-text-resize={handle}
                          aria-label={`Resize text ${handle}`}
                          className={`absolute z-10 h-3 w-3 rounded-sm border border-indigo-700 bg-white shadow ${positionClass}`}
                        />
                      ))}
                    </>
                  )}
                  {textLocked && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        unlockText(layer);
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                      className="absolute -top-3 -right-3 z-30 p-1 bg-zinc-950 border border-amber-500 rounded-md text-amber-400 hover:text-amber-300 shadow-md cursor-pointer pointer-events-auto"
                      title="Locked - Click to unlock"
                    >
                      <Lock className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {naturalDimensions.width > 0 && activeElement && (() => {
          const frameW = imageContainerRef.current?.clientWidth || naturalDimensions.width || 1000;
          const frameH = imageContainerRef.current?.clientHeight || naturalDimensions.height || 700;
          const scaleX = (imageRef.current?.clientWidth || frameW) / (naturalDimensions.width || 1000);
          const scaleY = (imageRef.current?.clientHeight || frameH) / (naturalDimensions.height || 700);
          const imgLeft = imageRef.current ? imageRef.current.offsetLeft + imageRef.current.clientLeft : 0;
          const imgTop = imageRef.current ? imageRef.current.offsetTop + imageRef.current.clientTop : 0;

          const left = imgLeft + activeElement.x * scaleX;
          const top = imgTop + activeElement.y * scaleY;
          const width = Math.max(10, (activeElement.width ?? 160) * scaleX);
          const height = Math.max(10, (activeElement.height ?? 64) * scaleY);

          return (
            <div
              className="absolute"
              style={{
                left,
                top,
                width,
                height,
                zIndex: 999,
                position: 'absolute',
                pointerEvents: 'none',
                border: '2px solid #3b82f6',
              }}
              onPointerDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                console.log("Handle Dragging: move", activeElement);
                if ('url' in activeElement) {
                  handleImageElementPointerDown(e as unknown as React.PointerEvent<SVGElement>, activeElement as CanvasImageElement);
                } else if ('type' in activeElement) {
                  handleShapeGroupPointerDown(e as unknown as React.PointerEvent<SVGElement>, activeElement as VectorShape);
                } else if ('text' in activeElement) {
                  handleTextLayerPointerDown(e as unknown as React.PointerEvent<HTMLDivElement>, activeElement as CanvasTextLayer);
                }
              }}
            >
              {(['nw', 'ne', 'sw', 'se'] as const).map((corner) => {
                const positionClass = 
                  corner === 'nw' ? '-top-1.5 -left-1.5 cursor-nwse-resize' :
                  corner === 'ne' ? '-top-1.5 -right-1.5 cursor-nesw-resize' :
                  corner === 'sw' ? '-bottom-1.5 -left-1.5 cursor-nesw-resize' :
                  '-bottom-1.5 -right-1.5 cursor-nwse-resize';

                return (
                  <span
                    key={corner}
                    data-shape-resize={corner}
                    data-img-resize={corner}
                    data-text-resize={corner}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      console.log("Handle Dragging:", corner);
                      const target = e.target as HTMLElement;
                      target.dataset.shapeResize = corner;
                      target.dataset.imgResize = corner;
                      target.dataset.textResize = corner;

                      if ('url' in activeElement) {
                        handleImageElementPointerDown(e as unknown as React.PointerEvent<SVGElement>, activeElement as CanvasImageElement);
                      } else if ('type' in activeElement) {
                        handleShapeGroupPointerDown(e as unknown as React.PointerEvent<SVGElement>, activeElement as VectorShape);
                      } else if ('text' in activeElement) {
                        handleTextLayerPointerDown(e as unknown as React.PointerEvent<HTMLDivElement>, activeElement as CanvasTextLayer);
                      }
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                    }}
                    className={`w-3 h-3 bg-white border-2 border-blue-600 rounded-full absolute ${positionClass}`}
                    style={{ pointerEvents: 'auto', position: 'absolute' }}
                  />
                );
              })}
            </div>
          );
        })()}

        {/* Crop Selection Overlay */}
        {activeTool === 'crop' && cropRect && (
          <div
            className="absolute inset-0 z-20 touch-none"
            onPointerDown={handleCropPointerDown}
            onPointerMove={handleCropPointerMove}
            onPointerUp={handleCropPointerUp}
            onPointerCancel={handleCropPointerUp}
          >
            <div
              className="absolute border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"
              style={{
                left: (imageRef.current?.offsetLeft ?? 0) + (imageRef.current?.clientLeft ?? 0) + cropRect.x,
                top: (imageRef.current?.offsetTop ?? 0) + (imageRef.current?.clientTop ?? 0) + cropRect.y,
                width: cropRect.width,
                height: cropRect.height,
              }}
            >
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-50">
                <div className="border-r border-b border-white" />
                <div className="border-r border-b border-white" />
                <div className="border-b border-white" />
                <div className="border-r border-b border-white" />
                <div className="border-r border-b border-white" />
                <div className="border-b border-white" />
                <div className="border-r border-white" />
                <div className="border-r border-white" />
                <div />
              </div>
              {[
                ['nw', '-left-1.5 -top-1.5 cursor-nwse-resize'],
                ['n', 'left-1/2 -top-1.5 -translate-x-1/2 cursor-ns-resize'],
                ['ne', '-right-1.5 -top-1.5 cursor-nesw-resize'],
                ['e', '-right-1.5 top-1/2 -translate-y-1/2 cursor-ew-resize'],
                ['se', '-right-1.5 -bottom-1.5 cursor-nwse-resize'],
                ['s', 'left-1/2 -bottom-1.5 -translate-x-1/2 cursor-ns-resize'],
                ['sw', '-left-1.5 -bottom-1.5 cursor-nesw-resize'],
                ['w', '-left-1.5 top-1/2 -translate-y-1/2 cursor-ew-resize'],
              ].map(([handle, positionClass]) => (
                <span
                  key={handle}
                  data-crop-handle={handle}
                  className={`absolute z-10 h-3 w-3 border border-indigo-700 bg-white shadow ${positionClass}`}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {activeTool === 'crop' && toolOptionsHost && createPortal(
        <section aria-label="Crop tool options" className="space-y-3 text-xs">
          <div className="font-semibold text-zinc-200">Crop</div>
          <p className="text-zinc-400">Drag on the image to create a crop area, then resize or reposition it.</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setCropRect(null);
                setCropError(null);
                onSelectTool('select');
              }}
              className="rounded-md border border-zinc-700 px-3 py-2 font-medium text-zinc-200 hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleApplyCrop()}
              disabled={!cropRect || cropRect.width < 1 || cropRect.height < 1 || isApplyingCrop}
              className="rounded-md bg-indigo-600 px-3 py-2 font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isApplyingCrop ? 'Cropping…' : 'Apply Crop'}
            </button>
          </div>
          {cropError && <p role="alert" className="rounded-md border border-red-500/40 bg-zinc-900 px-3 py-2 text-red-200">{cropError}</p>}
        </section>,
        toolOptionsHost,
      )}

      {/* Canva Floating Zoom Controls Bar at Bottom Right */}
      <div className="absolute bottom-5 right-5 z-30 flex items-center gap-1 bg-zinc-900/90 backdrop-blur-md px-2 py-1 rounded-2xl border border-zinc-800 text-zinc-200 shadow-2xl">
        <button
          type="button"
          onClick={() => onZoomChange(Number(Math.max(0.2, zoom - 0.15).toFixed(2)))}
          className="p-1.5 rounded-xl hover:bg-zinc-800 text-zinc-300 hover:text-white transition"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => onZoomChange(1.0)}
          className="px-2.5 py-1 text-xs font-mono font-medium text-zinc-200 hover:bg-zinc-800 rounded-lg transition min-w-[54px] text-center"
          title="Reset Zoom (100%)"
        >
          {Math.round(zoom * 100)}%
        </button>

        <button
          type="button"
          onClick={() => onZoomChange(Number(Math.min(4.0, zoom + 0.15).toFixed(2)))}
          className="p-1.5 rounded-xl hover:bg-zinc-800 text-zinc-300 hover:text-white transition"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-zinc-800 mx-1" />

        <button
          type="button"
          onClick={() => {
            const viewport = containerRef.current;
            const frame = imageContainerRef.current;
            if (!viewport || !frame) return;
            const availableWidth = Math.max(1, viewport.clientWidth - 64);
            const availableHeight = Math.max(1, viewport.clientHeight - 80);
            const fitZoom = Math.min(availableWidth / (frame.offsetWidth || 1), availableHeight / (frame.offsetHeight || 1), 3);
            onZoomChange(Number(Math.max(0.2, fitZoom).toFixed(2)));
            setPanOffset({ x: 0, y: 0 });
          }}
          className="p-1.5 rounded-xl hover:bg-zinc-800 text-zinc-300 hover:text-white transition"
          title="Fit Canvas to Screen"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* Floating Canvas Info Badge (Top Left) */}
      <div className="absolute top-4 left-4 flex items-center gap-2 pointer-events-none z-10">
        <div className="bg-zinc-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-zinc-800/80 text-[11px] font-mono text-zinc-300 flex items-center gap-2 shadow-lg">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
          <span>
            {naturalDimensions.width > 0 
              ? `${naturalDimensions.width} × ${naturalDimensions.height} px` 
              : 'Canvas ready'}
          </span>
        </div>
      </div>

      {/* Copied Toast Notification */}
      {copiedNotification && (
        <div className="absolute top-16 z-50 bg-indigo-600 text-white px-3.5 py-1.5 rounded-xl shadow-2xl font-medium text-xs flex items-center gap-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
          <Check className="w-3.5 h-3.5" />
          <span>{copiedNotification}</span>
        </div>
      )}
    </main>
  );
};
