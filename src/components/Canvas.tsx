import React, { useRef, useState, useEffect } from 'react';
import { CanvasElement, BackgroundConfig, AspectRatio, TextElement, StickerElement, ShapeElement, TextBgConfig } from '../types';

interface CanvasProps {
  aspectRatio: AspectRatio;
  background: BackgroundConfig;
  elements: CanvasElement[];
  selectedElementId: string | null;
  setSelectedElementId: (id: string | null) => void;
  updateElement: (id: string, updates: Partial<CanvasElement>) => void;
  deleteElement: (id: string) => void;
  safeZoneVisible: boolean;
  canvasScale: number;
  setCanvasScale: (scale: number) => void;
}

export default function Canvas({
  aspectRatio,
  background,
  elements,
  selectedElementId,
  setSelectedElementId,
  updateElement,
  deleteElement,
  safeZoneVisible,
  canvasScale,
  setCanvasScale,
}: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Dragging and transforming state
  const [activeTransform, setActiveTransform] = useState<{
    id: string;
    type: 'drag' | 'resize' | 'rotate';
    startX: number;
    startY: number;
    initX: number;
    initY: number;
    initWidth: number;
    initHeight: number;
    initRotation: number;
    initFontSize: number;
  } | null>(null);

  // Canvas dimensions based on aspect ratio
  const getCanvasDims = () => {
    switch (aspectRatio) {
      case '1:1':
        return { width: 600, height: 600 };
      case '4:3':
        return { width: 600, height: 450 };
      case '3:4':
      default:
        return { width: 600, height: 800 };
    }
  };

  const { width: canvasWidth, height: canvasHeight } = getCanvasDims();

  // Handle scaling to fit viewport
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return;
      const parent = containerRef.current.parentElement;
      if (!parent) return;

      const parentWidth = parent.clientWidth - 48; // padding
      const parentHeight = parent.clientHeight - 48;

      const scaleX = parentWidth / canvasWidth;
      const scaleY = parentHeight / canvasHeight;
      // Fit both dimensions comfortably
      const newScale = Math.min(Math.max(0.3, Math.min(scaleX, scaleY, 1)), 1.2);
      setCanvasScale(newScale);
    };

    handleResize();
    const resizeObserver = new ResizeObserver(handleResize);
    if (containerRef.current?.parentElement) {
      resizeObserver.observe(containerRef.current.parentElement);
    }

    window.addEventListener('resize', handleResize);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [aspectRatio, canvasWidth, canvasHeight, setCanvasScale]);

  // Document-level move & up events for smooth transformation outside elements
  useEffect(() => {
    if (!activeTransform) return;

    const handlePointerMove = (e: PointerEvent) => {
      const scale = canvasScale;
      const dx = (e.clientX - activeTransform.startX) / scale;
      const dy = (e.clientY - activeTransform.startY) / scale;

      const el = elements.find((x) => x.id === activeTransform.id);
      if (!el) return;

      if (activeTransform.type === 'drag') {
        // Simple bounding bounds checks
        const nextX = Math.round(activeTransform.initX + dx);
        const nextY = Math.round(activeTransform.initY + dy);
        updateElement(activeTransform.id, { x: nextX, y: nextY });
      } else if (activeTransform.type === 'resize') {
        if (el.type === 'text') {
          // For text, scale font size proportionally
          const scaleFactor = 1 + dx / activeTransform.initWidth;
          const nextFontSize = Math.max(12, Math.round(activeTransform.initFontSize * scaleFactor));
          const nextWidth = Math.max(80, Math.round(activeTransform.initWidth + dx));
          updateElement(activeTransform.id, {
            fontSize: nextFontSize,
            width: nextWidth,
          });
        } else {
          // For stickers or shapes
          const ratio = activeTransform.initHeight / activeTransform.initWidth;
          const nextWidth = Math.max(30, Math.round(activeTransform.initWidth + dx));
          // Proportional for sticker, free or proportional for shapes
          const nextHeight = el.type === 'sticker' 
            ? Math.round(nextWidth * ratio)
            : Math.max(30, Math.round(activeTransform.initHeight + dy));
          updateElement(activeTransform.id, {
            width: nextWidth,
            height: nextHeight,
          });
        }
      } else if (activeTransform.type === 'rotate') {
        // Calculate rotation angle relative to center of element
        const elDom = document.getElementById(`element-dom-${activeTransform.id}`);
        if (elDom) {
          const rect = elDom.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          const angleRad = Math.atan2(e.clientY - centerY, e.clientX - centerX);
          // Convert to degrees and subtract 90 because handle is at top (12 o'clock)
          let angleDeg = angleRad * (180 / Math.PI) - 90;
          // Normalize to 0-360
          angleDeg = (angleDeg + 360) % 360;
          
          // Snap rotation to 15 degrees when holding shift
          if (e.shiftKey) {
            angleDeg = Math.round(angleDeg / 15) * 15;
          }

          updateElement(activeTransform.id, { rotation: Math.round(angleDeg) });
        }
      }
    };

    const handlePointerUp = () => {
      setActiveTransform(null);
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);

    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };
  }, [activeTransform, canvasScale, elements, updateElement]);

  const startPointerAction = (
    e: React.PointerEvent,
    id: string,
    type: 'drag' | 'resize' | 'rotate'
  ) => {
    e.stopPropagation();
    e.preventDefault();
    const el = elements.find((x) => x.id === id);
    if (!el) return;

    setSelectedElementId(id);

    setActiveTransform({
      id,
      type,
      startX: e.clientX,
      startY: e.clientY,
      initX: el.x,
      initY: el.y,
      initWidth: el.width,
      initHeight: el.height,
      initRotation: el.rotation,
      initFontSize: el.type === 'text' ? el.fontSize : 0,
    });
  };

  // Build the background style
  const getBackgroundStyle = (): React.CSSProperties => {
    const styles: React.CSSProperties = {};

    if (background.type === 'solid') {
      styles.backgroundColor = background.color;
    } else if (background.type === 'gradient') {
      const { stops, type, angle } = background.gradient;
      const sortedStops = [...stops].sort((a, b) => a.offset - b.offset);
      const stopString = sortedStops.map((s) => `${s.color} ${s.offset}%`).join(', ');

      if (type === 'linear') {
        styles.backgroundImage = `linear-gradient(${angle}deg, ${stopString})`;
      } else {
        styles.backgroundImage = `radial-gradient(circle, ${stopString})`;
      }
    } else if (background.type === 'image' && background.image.src) {
      styles.backgroundImage = `url(${background.image.src})`;
      styles.backgroundSize = background.image.fit;
      styles.backgroundPosition = 'center';
      styles.backgroundRepeat = 'no-repeat';
      
      const { blur = 0, brightness = 100, contrast = 100, grayscale = 0, sepia = 0, saturate = 100, hueRotate = 0 } = background.image;
      styles.filter = `blur(${blur}px) brightness(${brightness}%) contrast(${contrast}%) grayscale(${grayscale}%) sepia(${sepia}%) saturate(${saturate}%) hue-rotate(${hueRotate}deg)`;
    }

    return styles;
  };

  // Get background overlay color/opacity for image background
  const getOverlayStyle = (): React.CSSProperties => {
    if (background.type === 'image' && background.image.src) {
      return {
        backgroundColor: background.image.overlayColor,
        opacity: background.image.overlayOpacity / 100,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
      };
    }
    return {};
  };

  // Text Shadow Styling mapper
  const getTextShadowStyle = (el: TextElement) => {
    const shadow = el.shadow;
    if (shadow.type === 'none') return 'none';
    const color = shadow.color || 'rgba(0,0,0,0.5)';
    
    // Calculate a visible offset that accounts for stroke width, preventing shadows from being hidden
    const strokeOffset = (el.stroke?.enabled ? el.stroke.width : 0);
    
    switch (shadow.type) {
      case 'soft':
        return `${shadow.x}px ${shadow.y}px ${shadow.blur}px ${color}`;
      case 'glow':
        return `0px 0px ${shadow.blur || 12}px ${color}, 0px 0px ${Math.round((shadow.blur || 12) / 2)}px ${color}`;
      case 'neon':
        return `0 0 5px #fff, 0 0 10px #fff, 0 0 20px ${color}, 0 0 40px ${color}, 0 0 80px ${color}`;
      case 'float':
        return `0px 2px 2px rgba(255,255,255,0.4), ${shadow.x}px ${shadow.y + 2}px ${shadow.blur || 4}px ${color}`;
      case 'glitch':
        return `${shadow.x || 3}px 0px 0px #0ff, -${shadow.x || 3}px 0px 0px #f00`;
      case 'elegant':
        return `0px ${shadow.y || 8}px ${shadow.blur || 16}px ${color}`;
      case 'hard': 
      case '3d_layered': 
      case 'outline_thick': {
        // Map legacy types to a simple offset so they don't break existing templates but look better
        const hX = (shadow.x || 3) + strokeOffset;
        const hY = (shadow.y || 3) + strokeOffset;
        return `${hX}px ${hY}px 0px ${color}`;
      }
      default:
        return 'none';
    }
  };

  // Text Bg Styling mapper
  const getTextBgStyle = (bg?: TextBgConfig): React.CSSProperties => {
    if (!bg || !bg.enabled) {
      return {
        backgroundColor: 'transparent',
        padding: '0px',
        borderRadius: '0px',
        borderWidth: '0px',
        borderColor: 'transparent',
        borderStyle: 'solid',
        transform: 'none',
      };
    }

    const baseStyle: React.CSSProperties = {
      padding: `${bg.paddingY}px ${bg.paddingX}px`,
      borderRadius: `${bg.borderRadius}px`,
      borderWidth: `${bg.borderWidth}px`,
      borderColor: bg.borderColor,
      borderStyle: 'solid',
      transform: bg.skew ? `skewX(${bg.skew}deg)` : 'none',
    };

    if (bg.shape === 'pill') {
      baseStyle.borderRadius = '9999px';
    } else if (bg.shape === 'oval') {
      baseStyle.borderRadius = '50%';
    }

    switch (bg.bgStyle) {
      case 'glass':
        baseStyle.backgroundColor = bg.color.replace(')', ', 0.3)').replace('rgb', 'rgba'); // simple approximation if it's not hex
        baseStyle.backdropFilter = 'blur(10px)';
        baseStyle.WebkitBackdropFilter = 'blur(10px)';
        baseStyle.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
        baseStyle.borderColor = 'rgba(255,255,255,0.3)';
        baseStyle.borderWidth = '1px';
        break;
      case 'outline':
        baseStyle.backgroundColor = 'transparent';
        baseStyle.borderColor = bg.color;
        baseStyle.borderWidth = `${Math.max(2, bg.borderWidth)}px`;
        break;
      case 'gradient':
        baseStyle.background = `linear-gradient(135deg, ${bg.color}, transparent)`;
        baseStyle.backgroundColor = bg.color;
        break;
      case 'solid':
      default:
        baseStyle.backgroundColor = bg.color;
        break;
    }

    return baseStyle;
  };
  const renderShapeIcon = (shape: ShapeElement) => {
    const { shapeType, fill, stroke, strokeWidth, width, height } = shape;
    const commonProps = {
      width: '100%',
      height: '100%',
      viewBox: '0 0 100 100',
      preserveAspectRatio: 'none',
    };

    switch (shapeType) {
      case 'rect':
        return (
          <svg {...commonProps}>
            <rect x="5" y="5" width="90" height="90" rx="4" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
          </svg>
        );
      case 'circle':
        return (
          <svg {...commonProps}>
            <circle cx="50" cy="50" r="45" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
          </svg>
        );
      case 'triangle':
        return (
          <svg {...commonProps}>
            <polygon points="50,5 95,95 5,95" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
          </svg>
        );
      case 'arrow':
        return (
          <svg {...commonProps} viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <marker id={`arrowhead-${shape.id}`} markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill={fill} />
              </marker>
            </defs>
            {/* Draw dynamic curved arrow or straight block arrow */}
            <path
              d="M 10 50 L 70 50"
              stroke={stroke || fill}
              strokeWidth={strokeWidth * 1.5 || 8}
              fill="none"
              markerEnd={`url(#arrowhead-${shape.id})`}
            />
          </svg>
        );
      case 'line':
        return (
          <svg {...commonProps}>
            <line x1="0" y1="50" x2="100" y2="50" stroke={stroke || fill} strokeWidth={strokeWidth || 4} />
          </svg>
        );
      case 'badge':
        return (
          <div
            className="flex items-center justify-center font-bold px-4 py-2 border-2 text-center rounded-lg shadow-md h-full w-full"
            style={{
              backgroundColor: fill,
              borderColor: stroke,
              borderWidth: strokeWidth,
              color: shape.badgeTextColor || '#ffffff',
            }}
          >
            {shape.badgeText || 'LABEL'}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div
      ref={containerRef}
      id="canvas-workspace-container"
      className="relative flex items-center justify-center w-full h-full min-h-[400px] bg-slate-900/30 overflow-hidden rounded-2xl border border-slate-700/50 p-6 select-none"
      onClick={() => setSelectedElementId(null)}
    >
      {/* Scaled Canvas Wrap */}
      <div
        ref={canvasRef}
        id="xhs-cover-canvas"
        className="relative shadow-2xl transition-shadow duration-300 bg-white overflow-hidden shrink-0 select-none"
        style={{
          width: `${canvasWidth}px`,
          height: `${canvasHeight}px`,
          transform: `scale(${canvasScale})`,
          transformOrigin: 'center center',
        }}
      >
        {/* Pattern Background Overlay */}
        <div
          id="canvas-background-texture"
          className="absolute inset-0 z-0 transition-all pointer-events-none"
          style={getBackgroundStyle()}
        />

        {/* Pattern Decors */}
        {background.pattern !== 'none' && (
          <div
            className="absolute inset-0 pointer-events-none z-1"
            style={{
              opacity: background.patternOpacity / 100,
              backgroundImage:
                background.pattern === 'dots'
                  ? `radial-gradient(${background.patternColor} 1.5px, transparent 1.5px)`
                  : background.pattern === 'grid'
                  ? `linear-gradient(${background.patternColor} 1px, transparent 1px), linear-gradient(90deg, ${background.patternColor} 1px, transparent 1px)`
                  : background.pattern === 'stripes'
                  ? `linear-gradient(45deg, ${background.patternColor} 25%, transparent 25%, transparent 75%, ${background.patternColor} 75%, ${background.patternColor}), linear-gradient(45deg, ${background.patternColor} 25%, transparent 25%, transparent 75%, ${background.patternColor} 75%, ${background.patternColor})`
                  : background.pattern === 'noise'
                  ? `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
                  : 'none',
              backgroundSize:
                background.pattern === 'dots'
                  ? '20px 20px'
                  : background.pattern === 'grid'
                  ? '30px 30px'
                  : background.pattern === 'stripes'
                  ? '40px 40px'
                  : 'auto',
              backgroundPosition: background.pattern === 'stripes' ? '0 0, 20px 20px' : 'auto',
            }}
          />
        )}

        {/* Background Image Color Overlay */}
        <div style={getOverlayStyle()} className="z-1 pointer-events-none" />

        {/* Canvas Elements */}
        <div id="canvas-elements-root" className="absolute inset-0 z-10 w-full h-full">
          {elements.map((el) => {
            const isSelected = selectedElementId === el.id;

            // Element styles
            const elementStyle: React.CSSProperties = {
              position: 'absolute',
              left: `${el.x}px`,
              top: `${el.y}px`,
              width: `${el.width}px`,
              height: el.type === 'text' ? 'auto' : `${el.height}px`,
              transform: `rotate(${el.rotation || 0}deg)`,
              opacity: (el.opacity ?? 100) / 100,
              cursor: activeTransform ? 'grabbing' : 'grab',
              zIndex: isSelected ? 50 : 20,
            };

            return (
              <div
                key={el.id}
                id={`element-dom-${el.id}`}
                className={`group absolute select-none ${
                  isSelected ? 'ring-2 ring-blue-500 ring-offset-1 ring-offset-transparent' : 'hover:ring-1 hover:ring-slate-400'
                }`}
                style={elementStyle}
                onPointerDown={(e) => startPointerAction(e, el.id, 'drag')}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Visual Renderer */}
                <div className="w-full h-full select-none">
                  {el.type === 'text' && (
                    <div
                      className="w-full h-full transition-shadow select-none break-words"
                      style={{
                        fontSize: `${el.fontSize}px`,
                        fontWeight: el.fontWeight,
                        fontFamily: el.fontFamily,
                        color: el.color,
                        textAlign: el.textAlign,
                        letterSpacing: `${el.letterSpacing}px`,
                        lineHeight: el.lineHeight,
                        textShadow: getTextShadowStyle(el as TextElement),
                        // Outline (CSS text stroke)
                        WebkitTextStroke: el.stroke?.enabled
                          ? `${el.stroke.width}px ${el.stroke.color}`
                          : 'undefined',
                        // Optional background highlight
                        ...getTextBgStyle(el.bg),
                      }}
                    >
                      {el.text}
                    </div>
                  )}

                  {el.type === 'sticker' && (
                    <div className="w-full h-full flex items-center justify-center select-none pointer-events-none">
                      {el.isEmoji ? (
                        <span
                          style={{
                            fontSize: `${Math.min(el.width, el.height) * 0.8}px`,
                            lineHeight: 1,
                          }}
                        >
                          {el.src}
                        </span>
                      ) : (
                        <img
                          src={el.src}
                          alt="sticker"
                          referrerPolicy="no-referrer"
                          className="max-w-full max-h-full object-contain pointer-events-none select-none"
                        />
                      )}
                    </div>
                  )}

                  {el.type === 'shape' && (
                    <div className="w-full h-full select-none pointer-events-none">
                      {renderShapeIcon(el as ShapeElement)}
                    </div>
                  )}
                </div>

                {/* Transformer Handles Overlay when Selected */}
                {isSelected && (
                  <>
                    {/* Rotate Handle */}
                    <div
                      className="absolute -top-8 left-1/2 -translate-x-1/2 w-6 h-6 bg-white border-2 border-blue-500 rounded-full flex items-center justify-center shadow-md cursor-alias z-50 hover:bg-blue-50 active:scale-95"
                      onPointerDown={(e) => startPointerAction(e, el.id, 'rotate')}
                      title="拖动旋转 (按住 Shift 15度辅助)"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-blue-500"
                      >
                        <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                      </svg>
                    </div>

                    {/* Resize Handle (Bottom Right) */}
                    <div
                      className="absolute -bottom-2 -right-2 w-5 h-5 bg-blue-500 border-2 border-white rounded-full shadow-md cursor-se-resize z-50 hover:bg-blue-600 active:scale-90"
                      onPointerDown={(e) => startPointerAction(e, el.id, 'resize')}
                      title="拖动调整大小"
                    />

                    {/* Quick Delete Handle (Top Right) */}
                    <button
                      className="absolute -top-3 -right-3 w-6 h-6 bg-red-500 border border-white rounded-full flex items-center justify-center shadow-md cursor-pointer z-50 text-white hover:bg-red-600 active:scale-90"
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        deleteElement(el.id);
                      }}
                      title="删除元素"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Xiaohongshu Safe Zone Overlay Lines */}
        {safeZoneVisible && aspectRatio === '3:4' && (
          <div className="absolute inset-0 pointer-events-none z-40 export-ignore">
            {/* Top cropping boundary line */}
            <div className="absolute top-[80px] left-0 right-0 border-t border-dashed border-white/60 mix-blend-difference opacity-70"></div>

            {/* Bottom cropping boundary line */}
            <div className="absolute bottom-[220px] left-0 right-0 border-b border-dashed border-white/60 mix-blend-difference opacity-70"></div>
          </div>
        )}
      </div>
    </div>
  );
}
