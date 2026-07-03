export type AspectRatio = '3:4' | '1:1' | '4:3';

export interface ShadowConfig {
  type: 'none' | 'soft' | 'glow' | 'neon' | 'float' | 'glitch' | 'elegant' | 'hard' | '3d_layered' | 'outline_thick'; // keep legacy types for fallback
  color: string;
  x: number;
  y: number;
  blur: number;
}

export interface StrokeConfig {
  enabled: boolean;
  color: string;
  width: number;
}

export interface TextBgConfig {
  enabled: boolean;
  bgStyle?: 'solid' | 'glass' | 'outline' | 'gradient'; // Added style option
  shape?: 'rectangle' | 'pill' | 'oval'; // Added shape
  color: string;
  paddingX: number;
  paddingY: number;
  borderRadius: number;
  borderWidth: number;
  borderColor: string;
  skew?: number; // in degrees for dynamic brutalist effects
}

export interface TextElement {
  id: string;
  type: 'text';
  role?: 'title' | 'subtitle' | 'highlights' | 'tag' | 'decoration';
  text: string;
  x: number; // 0-600 coordinate
  y: number; // 0-800 coordinate (depending on height)
  width: number;
  height: number;
  rotation: number; // in degrees
  fontSize: number;
  fontWeight: 'normal' | 'medium' | 'bold' | 'black';
  fontFamily: string;
  color: string;
  opacity: number;
  textAlign: 'left' | 'center' | 'right';
  letterSpacing: number; // px
  lineHeight: number; // multiplier (e.g. 1.2)
  shadow: ShadowConfig;
  stroke: StrokeConfig;
  bg?: TextBgConfig;
}

export interface StickerElement {
  id: string;
  type: 'sticker';
  src: string; // url, emoji character, or vector name
  isEmoji: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
}

export interface ShapeElement {
  id: string;
  type: 'shape';
  shapeType: 'rect' | 'circle' | 'triangle' | 'arrow' | 'line' | 'badge';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  badgeStyle?: 'standard' | 'brutalist' | 'tag';
  badgeText?: string;
  badgeTextColor?: string;
}

export type CanvasElement = TextElement | StickerElement | ShapeElement;

export interface GradientStop {
  color: string;
  offset: number; // 0-100
}

export interface BackgroundConfig {
  type: 'solid' | 'gradient' | 'image';
  color: string; // solid color
  gradient: {
    type: 'linear' | 'radial';
    angle: number; // for linear
    stops: GradientStop[];
  };
  image: {
    src: string;
    blur: number;
    brightness: number;
    contrast: number;
    grayscale?: number;
    sepia?: number;
    saturate?: number;
    hueRotate?: number;
    overlayColor: string;
    overlayOpacity: number;
    fit: 'cover' | 'contain';
  };
  pattern: 'none' | 'dots' | 'grid' | 'stripes' | 'noise';
  patternOpacity: number;
  patternColor: string;
}

export interface Template {
  id: string;
  name: string;
  category: 'hot' | 'minimal' | 'brutalist' | 'vlog' | 'cute' | 'study';
  aspectRatio: AspectRatio;
  background: BackgroundConfig;
  elements: CanvasElement[];
  thumbnailColor?: string; // fallback if thumbnail isn't an image
}

export interface EditorState {
  aspectRatio: AspectRatio;
  background: BackgroundConfig;
  elements: CanvasElement[];
  selectedElementId: string | null;
  safeZoneVisible: boolean;
  canvasScale: number; // for fitting in the viewport
}
