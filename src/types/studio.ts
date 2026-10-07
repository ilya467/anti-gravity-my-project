export type ToolType = 
  | 'select' 
  | 'pan' 
  | 'crop' 
  | 'filters' 
  | 'brush' 
  | 'text' 
  | 'eraser' 
  | 'eyedropper' 
  | 'shapes'
  | 'blur';

export interface ImageAdjustments {
  brightness: number;
  contrast: number;
  saturation: number;
  exposure: number;
  blur: number;
  hueRotate: number;
  sepia: number;
  grayscale: number;
  invert: number;
  opacity?: number;
}

export interface ImageTransform {
  rotation: number;
  scale: number;
  flipHorizontal: boolean;
  flipVertical: boolean;
}

export interface LayerItem {
  id: string;
  name: string;
  type: 'image' | 'adjustment' | 'overlay' | 'text' | 'shape';
  visible: boolean;
  locked: boolean;
  opacity: number;
}
