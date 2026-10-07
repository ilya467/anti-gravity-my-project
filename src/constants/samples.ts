import type { ImageAdjustments } from '../types/studio';

export interface SampleImage {
  id: string;
  name: string;
  category: string;
  url: string;
}

export interface FilterPreset {
  id: string;
  name: string;
  thumbnail: string;
  adjustments: Partial<ImageAdjustments>;
}

export const SAMPLE_IMAGES: SampleImage[] = [
  {
    id: 'sample-landscape',
    name: 'Mountain Sunset',
    category: 'Nature',
    url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'sample-portrait',
    name: 'Studio Portrait',
    category: 'People',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'sample-architecture',
    name: 'Modern Building',
    category: 'Architecture',
    url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'sample-urban',
    name: 'Neon Cyberpunk',
    category: 'Urban',
    url: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'sample-abstract',
    name: 'Fluid Colors',
    category: 'Abstract',
    url: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=1200&q=80',
  },
];

export const FILTER_PRESETS: FilterPreset[] = [
  {
    id: 'default',
    name: 'Normal',
    thumbnail: 'ORIGINAL',
    adjustments: {
      brightness: 100,
      contrast: 100,
      saturation: 100,
      exposure: 0,
      blur: 0,
      hueRotate: 0,
      sepia: 0,
      grayscale: 0,
      invert: 0,
    },
  },
  {
    id: 'vivid',
    name: 'Vivid Glow',
    thumbnail: 'VIVID',
    adjustments: {
      brightness: 108,
      contrast: 125,
      saturation: 145,
      exposure: 5,
      blur: 0,
      hueRotate: 0,
      sepia: 0,
      grayscale: 0,
      invert: 0,
    },
  },
  {
    id: 'noir',
    name: 'Film Noir',
    thumbnail: 'NOIR',
    adjustments: {
      brightness: 95,
      contrast: 140,
      saturation: 0,
      exposure: -5,
      blur: 0,
      hueRotate: 0,
      sepia: 0,
      grayscale: 100,
      invert: 0,
    },
  },
  {
    id: 'vintage',
    name: 'Vintage Warm',
    thumbnail: 'VINTAGE',
    adjustments: {
      brightness: 102,
      contrast: 108,
      saturation: 85,
      exposure: 0,
      blur: 0,
      hueRotate: -10,
      sepia: 40,
      grayscale: 0,
      invert: 0,
    },
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    thumbnail: 'CYBER',
    adjustments: {
      brightness: 110,
      contrast: 130,
      saturation: 160,
      exposure: 10,
      blur: 0,
      hueRotate: 180,
      sepia: 0,
      grayscale: 0,
      invert: 0,
    },
  },
  {
    id: 'golden',
    name: 'Golden Hour',
    thumbnail: 'GOLDEN',
    adjustments: {
      brightness: 105,
      contrast: 112,
      saturation: 120,
      exposure: 8,
      blur: 0,
      hueRotate: -15,
      sepia: 25,
      grayscale: 0,
      invert: 0,
    },
  },
  {
    id: 'dramatic',
    name: 'Dramatic Cold',
    thumbnail: 'COLD',
    adjustments: {
      brightness: 90,
      contrast: 135,
      saturation: 90,
      exposure: -10,
      blur: 0,
      hueRotate: 15,
      sepia: 0,
      grayscale: 15,
      invert: 0,
    },
  },
];
