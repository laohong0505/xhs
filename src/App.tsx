import React, { useState, useEffect, useRef } from 'react';
import { AspectRatio, BackgroundConfig, CanvasElement, TextElement, StickerElement, ShapeElement } from './types';
import { TEMPLATES, DEFAULT_BG } from './data/templates';
import Canvas from './components/Canvas';
import EditorPanel from './components/EditorPanel';
import { toPng, toJpeg } from 'html-to-image';
import { 
  Undo2, 
  Redo2, 
  Download, 
  Trash2, 
  HelpCircle, 
  Sparkles, 
  Image as ImageIcon,
  Type,
  Smile,
  Triangle,
  RotateCcw,
  CheckCircle,
  FolderDown,
  Info,
  Save,
  FolderOpen,
  Upload
} from 'lucide-react';

interface HistoryState {
  aspectRatio: AspectRatio;
  background: BackgroundConfig;
  elements: CanvasElement[];
}

export default function App() {
  // Active states
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('3:4');
  const [background, setBackground] = useState<BackgroundConfig>(TEMPLATES[0].background);
  const [elements, setElements] = useState<CanvasElement[]>(TEMPLATES[0].elements);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(TEMPLATES[0].elements[0]?.id || null);
  const [safeZoneVisible, setSafeZoneVisible] = useState<boolean>(true);
  const [canvasScale, setCanvasScale] = useState<number>(0.8);

  // Draft & Import/Export states
  const [currentTemplateId, setCurrentTemplateId] = useState<string | null>(TEMPLATES[0].id);
  const [hasSavedDraft, setHasSavedDraft] = useState<boolean>(() => {
    try {
      return !!localStorage.getItem('xhs_cover_draft');
    } catch {
      return false;
    }
  });
  const [toast, setToast] = useState<{ show: boolean; msg: string; type: 'success' | 'info' | 'error' } | null>(null);
  
  const importInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ show: true, msg, type });
  };

  useEffect(() => {
    if (toast?.show) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Undo/Redo state
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Export settings
  const [exportFormat, setExportFormat] = useState<'png' | 'jpeg'>('png');
  const [exportScale, setExportScale] = useState<number>(2); // 2x by default for crisp 1200x1600 px
  const [exporting, setExporting] = useState<boolean>(false);
  const [exportSuccessToast, setExportSuccessToast] = useState<boolean>(false);

  // Help info modal
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);

  // Save state to undo/redo history
  const commitToHistory = (
    newRatio: AspectRatio,
    newBg: BackgroundConfig,
    newEls: CanvasElement[]
  ) => {
    const freshState: HistoryState = {
      aspectRatio: newRatio,
      background: JSON.parse(JSON.stringify(newBg)),
      elements: JSON.parse(JSON.stringify(newEls)),
    };

    // Remove future history if we were in the middle of undoing
    const updatedHistory = history.slice(0, historyIndex + 1);
    updatedHistory.push(freshState);

    // Limit history stack size to 40 for responsiveness
    if (updatedHistory.length > 40) {
      updatedHistory.shift();
    }

    setHistory(updatedHistory);
    setHistoryIndex(updatedHistory.length - 1);
  };

  // Initial history commit on first load
  useEffect(() => {
    if (history.length === 0) {
      commitToHistory(aspectRatio, background, elements);
    }
  }, []);

  // Save history on major element changes or mouseups after dragging
  const handlePointerUpGlobal = () => {
    // If there is a current mismatch between history and state, commit it
    if (historyIndex >= 0 && historyIndex < history.length) {
      const currentHist = history[historyIndex];
      const hasChanged = 
        currentHist.aspectRatio !== aspectRatio ||
        JSON.stringify(currentHist.background) !== JSON.stringify(background) ||
        JSON.stringify(currentHist.elements) !== JSON.stringify(elements);

      if (hasChanged) {
        commitToHistory(aspectRatio, background, elements);
      }
    }
  };

  useEffect(() => {
    window.addEventListener('pointerup', handlePointerUpGlobal);
    return () => {
      window.removeEventListener('pointerup', handlePointerUpGlobal);
    };
  }, [aspectRatio, background, elements, historyIndex, history]);

  // Handle undo
  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIdx = historyIndex - 1;
      const prevState = history[prevIdx];
      
      setAspectRatio(prevState.aspectRatio);
      setBackground(JSON.parse(JSON.stringify(prevState.background)));
      setElements(JSON.parse(JSON.stringify(prevState.elements)));
      setHistoryIndex(prevIdx);
      setSelectedElementId(null);
    }
  };

  // Handle redo
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIdx = historyIndex + 1;
      const nextState = history[nextIdx];

      setAspectRatio(nextState.aspectRatio);
      setBackground(JSON.parse(JSON.stringify(nextState.background)));
      setElements(JSON.parse(JSON.stringify(nextState.elements)));
      setHistoryIndex(nextIdx);
      setSelectedElementId(null);
    }
  };

  // Save current design state to localStorage as a draft
  const handleSaveDraft = () => {
    try {
      const draftState = {
        version: '1.0',
        aspectRatio,
        background,
        elements,
        currentTemplateId,
      };
      localStorage.setItem('xhs_cover_draft', JSON.stringify(draftState));
      setHasSavedDraft(true);
      showToast('✨ 封面草稿已成功保存在本地浏览器！过段时间来依然可以微调。', 'success');
    } catch (err) {
      showToast('❌ 保存本地草稿失败，可能浏览器隐私模式限制了存储。', 'error');
    }
  };

  // Load design state from localStorage draft
  const handleLoadDraft = () => {
    try {
      const savedStr = localStorage.getItem('xhs_cover_draft');
      if (!savedStr) {
        showToast('ℹ️ 暂无保存的本地草稿。', 'info');
        return;
      }
      const draft = JSON.parse(savedStr);
      setAspectRatio(draft.aspectRatio || '3:4');
      setBackground(JSON.parse(JSON.stringify(draft.background)));
      setElements(JSON.parse(JSON.stringify(draft.elements)));
      setCurrentTemplateId(draft.currentTemplateId || null);
      setSelectedElementId(draft.elements[0]?.id || null);
      
      commitToHistory(draft.aspectRatio || '3:4', draft.background, draft.elements);
      showToast('🎉 已成功载入您上次保存的封面草稿！', 'success');
    } catch (err) {
      showToast('❌ 加载草稿失败，可能草稿数据已损坏。', 'error');
    }
  };

  // Reset current template elements and background to its clean state
  const handleResetTemplate = () => {
    if (!currentTemplateId) {
      showToast('ℹ️ 当前画布无关联的初始模板，无法复位。', 'info');
      return;
    }
    const template = TEMPLATES.find((t) => t.id === currentTemplateId);
    if (!template) {
      showToast('❌ 未找到关联的初始模板，无法重置。', 'error');
      return;
    }
    
    setAspectRatio(template.aspectRatio);
    setBackground(JSON.parse(JSON.stringify(template.background)));
    
    // Copy elements with brand new IDs to avoid conflicts
    const copiedElements = template.elements.map((el) => {
      return {
        ...JSON.parse(JSON.stringify(el)),
        id: Math.random().toString(36).substring(2, 9),
      };
    });
    setElements(copiedElements);
    setSelectedElementId(copiedElements[0]?.id || null);
    
    commitToHistory(template.aspectRatio, template.background, copiedElements);
    showToast('🔄 已成功复位到该模版的初始状态，之前的所有修改已清除！', 'info');
  };

  // Export current design to a JSON project file
  const handleExportProject = () => {
    try {
      const projectData = {
        app: 'xhs-cover-designer',
        version: '1.0',
        exportedAt: new Date().toISOString(),
        aspectRatio,
        background,
        elements,
        currentTemplateId,
      };
      const jsonStr = JSON.stringify(projectData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `xhs-cover-project-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      showToast('📥 封面工程项目 JSON 文件已成功导出！您可以随时在其他电脑导入继续微调。', 'success');
    } catch (err) {
      showToast('❌ 导出工程项目失败，请重试。', 'error');
    }
  };

  // Import project JSON file and load onto canvas
  const handleImportProject = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const jsonStr = event.target?.result as string;
        const project = JSON.parse(jsonStr);
        
        if (!project.elements || !project.background) {
          showToast('❌ 导入失败：该 JSON 文件不包含有效的封面设计工程数据。', 'error');
          return;
        }
        
        setAspectRatio(project.aspectRatio || '3:4');
        setBackground(JSON.parse(JSON.stringify(project.background)));
        setElements(JSON.parse(JSON.stringify(project.elements)));
        setCurrentTemplateId(project.currentTemplateId || null);
        setSelectedElementId(project.elements[0]?.id || null);
        
        commitToHistory(project.aspectRatio || '3:4', project.background, project.elements);
        showToast('📤 封面工程项目上传解析成功！现在可以继续微调您的设计了。', 'success');
      } catch (err) {
        showToast('❌ 读取工程文件失败，可能 JSON 格式损坏。', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // allow uploading same file again
  };

  // Update a single element and queue an optional history save
  const updateElement = (id: string, updates: Partial<CanvasElement>) => {
    setElements((prev) =>
      prev.map((el) => {
        if (el.id === id) {
          return { ...el, ...updates } as CanvasElement;
        }
        return el;
      })
    );
  };

  // Delete element
  const deleteElement = (id: string) => {
    const updatedEls = elements.filter((el) => el.id !== id);
    setElements(updatedEls);
    setSelectedElementId(null);
    commitToHistory(aspectRatio, background, updatedEls);
  };

  // Add new element with diverse style presets
  const addElement = (type: 'text' | 'sticker' | 'shape', options?: any) => {
    const id = Math.random().toString(36).substring(2, 9);
    let newEl: CanvasElement;

    // Center standard coordinates
    const centerX = 150;
    const centerY = aspectRatio === '3:4' ? 300 : aspectRatio === '1:1' ? 220 : 160;

    if (type === 'text') {
      const style = options?.style || 'default';
      let textProps: Partial<TextElement> = {
        text: '点击输入文本',
        fontSize: 36,
        fontWeight: 'bold',
        fontFamily: 'Inter, system-ui, sans-serif',
        color: '#000000',
        textAlign: 'center',
        letterSpacing: 1,
        lineHeight: 1.2,
        shadow: { type: 'none', color: '#000000', x: 0, y: 0, blur: 0 },
        stroke: { enabled: false, color: '#000000', width: 2 },
        bg: {
          enabled: false,
          color: '#fbbf24',
          paddingX: 14,
          paddingY: 6,
          borderRadius: 6,
          borderWidth: 0,
          borderColor: '',
          skew: 0,
        },
      };

      if (style === 'brutalist') {
        textProps = {
          text: '⚡️ 炸街干货 ⚡️',
          fontSize: 48,
          fontWeight: 'black',
          fontFamily: '"ZCOOL QingKe HuangYou", "Space Grotesk", sans-serif',
          color: '#000000',
          textAlign: 'center',
          letterSpacing: 2,
          lineHeight: 1.1,
          shadow: { type: 'hard', color: '#000000', x: 5, y: 5, blur: 0 },
          stroke: { enabled: true, color: '#000000', width: 3 },
          bg: {
            enabled: true,
            color: '#3b82f6', // brutalist cyan/blue
            paddingX: 18,
            paddingY: 10,
            borderRadius: 0,
            borderWidth: 3,
            borderColor: '#000000',
            skew: -5,
          },
        };
      } else if (style === 'glow') {
        textProps = {
          text: '🌙 深夜情绪驿站',
          fontSize: 32,
          fontWeight: 'bold',
          fontFamily: '"ZCOOL XiaoWei", Georgia, serif',
          color: '#ffffff',
          textAlign: 'center',
          letterSpacing: 1.5,
          lineHeight: 1.3,
          shadow: { type: 'glow', color: 'rgba(139, 92, 246, 0.8)', x: 0, y: 0, blur: 12 },
          stroke: { enabled: false, color: '', width: 0 },
          bg: {
            enabled: true,
            color: 'rgba(139, 92, 246, 0.15)',
            paddingX: 16,
            paddingY: 8,
            borderRadius: 999,
            borderWidth: 1.5,
            borderColor: 'rgba(139, 92, 246, 0.4)',
            skew: 0,
          },
        };
      }

      newEl = {
        id,
        type: 'text',
        x: centerX,
        y: centerY,
        width: 320,
        height: 60,
        rotation: 0,
        opacity: 100,
        ...textProps,
      } as TextElement;
    } else if (type === 'sticker') {
      newEl = {
        id,
        type: 'sticker',
        src: options?.src || '🧸',
        isEmoji: options?.isEmoji ?? true,
        x: centerX + 50,
        y: centerY + 50,
        width: options?.width || 100,
        height: options?.height || 100,
        rotation: 0,
        opacity: 100,
      } as StickerElement;
    } else {
      // Shape
      const shapeType = options?.shapeType || 'rect';
      let fill = options?.fill || '#3b82f6';
      let stroke = options?.stroke || '#1e3a8a';
      let strokeWidth = options?.strokeWidth ?? 2;

      newEl = {
        id,
        type: 'shape',
        shapeType,
        x: centerX + 30,
        y: centerY + 60,
        width: options?.width || 120,
        height: options?.height || 120,
        rotation: 0,
        fill,
        stroke,
        strokeWidth,
        opacity: 100,
        badgeText: options?.badgeText,
        badgeStyle: options?.badgeText ? 'standard' : undefined,
      } as ShapeElement;
    }

    const updatedEls = [...elements, newEl];
    setElements(updatedEls);
    setSelectedElementId(id);
    commitToHistory(aspectRatio, background, updatedEls);
  };

  // Clear Canvas to default
  const handleClearCanvas = () => {
    if (window.confirm('确定要清空画布吗？这将会删除所有文字和贴纸。')) {
      const clearedEls: CanvasElement[] = [];
      const clearedBg = { ...DEFAULT_BG };
      setElements(clearedEls);
      setBackground(clearedBg);
      setSelectedElementId(null);
      commitToHistory(aspectRatio, clearedBg, clearedEls);
    }
  };

  // Export/Download implementation
  const handleExportCover = async () => {
    const node = document.getElementById('xhs-cover-canvas');
    if (!node) return;

    setExporting(true);
    // Unselect elements so helper outlines/buttons are completely invisible on output
    setSelectedElementId(null);

    // Give DOM 150ms to settle down without selection state
    setTimeout(async () => {
      try {
        const options = {
          pixelRatio: exportScale,
          style: {
            transform: 'scale(1)',
            transformOrigin: 'top left',
          },
          filter: (node: HTMLElement) => {
            if (node?.classList?.contains('export-ignore')) {
              return false;
            }
            return true;
          }
        };

        let dataUrl = '';
        if (exportFormat === 'png') {
          dataUrl = await toPng(node, options);
        } else {
          dataUrl = await toJpeg(node, { ...options, quality: 0.95 });
        }

        const link = document.createElement('a');
        link.download = `小红书封面_${Date.now()}.${exportFormat}`;
        link.href = dataUrl;
        link.click();

        setExportSuccessToast(true);
        setTimeout(() => setExportSuccessToast(false), 3500);
      } catch (err) {
        console.error('Export failed', err);
        alert('导出图片时出错。可能由于包含来自外部的图片而触发浏览器跨域保护。请尽量使用内置表情包或渐变背景。');
      } finally {
        setExporting(false);
      }
    }, 150);
  };

  return (
    <div id="app-root-container" className="flex flex-col h-screen w-screen bg-slate-950 font-sans overflow-hidden antialiased">
      
      {/* 1. HEADER BRANDING & ACTION BAR */}
      <header id="editor-header" className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800 h-16 shrink-0 z-30 shadow-md">
        
        {/* Logo and Branding */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-500 to-red-600 flex items-center justify-center font-black text-white text-base tracking-tight shadow-lg shadow-red-500/10">
            书
          </div>
          <div className="hidden sm:block">
            <h1 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              小红书封面在线设计器
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">PRO</span>
            </h1>
            <p className="text-[10px] text-slate-500">零门槛 · 轻松搞定爆款吸睛笔记封面</p>
          </div>
        </div>

        {/* Workspace Undo/Redo & Utility Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Undo Button */}
          <button
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            className="p-2 rounded-lg border border-slate-800 bg-slate-900 hover:border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white disabled:opacity-25 disabled:pointer-events-none transition cursor-pointer"
            title="撤销 (Undo)"
          >
            <Undo2 className="w-4 h-4" />
          </button>

          {/* Redo Button */}
          <button
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className="p-2 rounded-lg border border-slate-800 bg-slate-900 hover:border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white disabled:opacity-25 disabled:pointer-events-none transition cursor-pointer"
            title="重做 (Redo)"
          >
            <Redo2 className="w-4 h-4" />
          </button>

          <div className="h-6 w-[1px] bg-slate-800 mx-0.5 sm:mx-1" />

          {/* Reset Template */}
          <button
            onClick={handleResetTemplate}
            disabled={!currentTemplateId}
            className="px-2.5 py-2 rounded-lg border border-slate-800 bg-slate-900 hover:border-slate-700 hover:bg-slate-800 text-xs font-semibold text-slate-300 hover:text-amber-400 disabled:opacity-25 disabled:pointer-events-none transition cursor-pointer flex items-center gap-1.5"
            title="重置为当前模板的初始状态"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">复位模板</span>
          </button>

          {/* Save Draft */}
          <button
            onClick={handleSaveDraft}
            className="px-2.5 py-2 rounded-lg border border-slate-800 bg-slate-900 hover:border-slate-700 hover:bg-slate-800 text-xs font-semibold text-slate-300 hover:text-green-400 transition cursor-pointer flex items-center gap-1.5"
            title="保存当前设计作为本地草稿"
          >
            <Save className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">保存草稿</span>
          </button>

          {/* Load Draft */}
          <button
            onClick={handleLoadDraft}
            disabled={!hasSavedDraft}
            className="px-2.5 py-2 rounded-lg border border-slate-800 bg-slate-900 hover:border-slate-700 hover:bg-slate-800 text-xs font-semibold text-slate-300 hover:text-blue-400 disabled:opacity-25 disabled:pointer-events-none transition cursor-pointer flex items-center gap-1.5"
            title="恢复保存在本地浏览器的草稿"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">恢复草稿</span>
          </button>

          <div className="h-6 w-[1px] bg-slate-800 mx-0.5 sm:mx-1" />

          {/* Import JSON Project */}
          <button
            onClick={() => importInputRef.current?.click()}
            className="px-2.5 py-2 rounded-lg border border-slate-800 bg-slate-900 hover:border-indigo-900/30 hover:bg-indigo-950/10 text-xs font-semibold text-slate-300 hover:text-indigo-400 transition cursor-pointer flex items-center gap-1.5"
            title="上传已导出的 JSON 工程文件进行二次修改"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">上传修改</span>
          </button>

          {/* Export JSON Project */}
          <button
            onClick={handleExportProject}
            className="px-2.5 py-2 rounded-lg border border-slate-800 bg-slate-900 hover:border-indigo-900/30 hover:bg-indigo-950/10 text-xs font-semibold text-slate-300 hover:text-indigo-400 transition cursor-pointer flex items-center gap-1.5"
            title="导出当前设计为工程 JSON 备份文件，以便下次上传修改"
          >
            <FolderDown className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">备份工程</span>
          </button>

          <div className="h-6 w-[1px] bg-slate-800 mx-0.5 sm:mx-1" />

          {/* Clear Canvas */}
          <button
            onClick={handleClearCanvas}
            className="px-3 py-2 rounded-lg border border-slate-800 bg-slate-900 hover:border-red-900/30 hover:bg-red-950/10 text-xs font-semibold text-slate-400 hover:text-red-400 transition cursor-pointer flex items-center gap-1.5"
            title="清空当前所有图层重新设计"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">清空画布</span>
          </button>

          {/* Help button */}
          <button
            onClick={() => setShowHelpModal(true)}
            className="p-2 rounded-lg border border-slate-800 bg-slate-900 hover:border-slate-700 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
            title="设计提示与快捷说明"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>

        {/* Download & Quality Settings */}
        <div className="flex items-center gap-2">
          {/* Format selector */}
          <select
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value as any)}
            className="hidden sm:block bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-slate-700 cursor-pointer"
          >
            <option value="png">PNG 格式</option>
            <option value="jpeg">JPG 高精</option>
          </select>

          {/* Scale/Resolution Selector */}
          <select
            value={exportScale}
            onChange={(e) => setExportScale(parseInt(e.target.value))}
            className="hidden md:block bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-slate-700 cursor-pointer"
            title="导出倍率 (倍数越高分辨率越清晰，推荐2x)"
          >
            <option value="1">普通清晰 (1x)</option>
            <option value="2">高清大图 (2x)</option>
            <option value="3">超清打印 (3x)</option>
          </select>

          {/* Main Download trigger */}
          <button
            onClick={handleExportCover}
            disabled={exporting}
            className="relative px-4 py-2 bg-rose-500 hover:bg-rose-600 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-rose-500/20 active:scale-95 transition cursor-pointer flex items-center gap-2 shrink-0"
          >
            {exporting ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>正在导出高精图...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>导出高清封面</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* 2. MAIN SPLIT EDITOR VIEW */}
      <div id="editor-main-body" className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        
        {/* Central visual editor board workspace */}
        <main id="editor-workspace" className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-950 overflow-hidden relative">
          
          {/* Workspace Hint or active item indicators */}
          <div className="absolute top-4 left-6 right-6 flex items-center justify-between pointer-events-none select-none z-10">
            <span className="text-[10px] tracking-wider text-slate-600 font-mono">
              比例: {aspectRatio} | 渲染比: {Math.round(canvasScale * 100)}%
            </span>
            {selectedElementId ? (
              <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse">
                已选中元素 · 可拖动/旋转/缩放
              </span>
            ) : (
              <span className="text-[10px] text-slate-600">
                提示: 点击画布内的文字或贴纸可以精细修改样式
              </span>
            )}
          </div>

          {/* Interactive Canvas board */}
          <Canvas
            aspectRatio={aspectRatio}
            background={background}
            elements={elements}
            selectedElementId={selectedElementId}
            setSelectedElementId={setSelectedElementId}
            updateElement={updateElement}
            deleteElement={deleteElement}
            safeZoneVisible={safeZoneVisible}
            canvasScale={canvasScale}
            setCanvasScale={setCanvasScale}
          />

          {/* Quick Creator Toolbar below canvas */}
          <div id="quick-creator-toolbar" className="mt-5 bg-slate-900/60 backdrop-blur border border-slate-800 rounded-2xl p-2 flex items-center gap-2 shadow-xl shrink-0">
            <button
              onClick={() => addElement('text', { style: 'default' })}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/40 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl transition cursor-pointer"
            >
              <Type className="w-3.5 h-3.5 text-emerald-400" />
              添加文字
            </button>
            <button
              onClick={() => addElement('sticker', { src: '🔥', isEmoji: true })}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/40 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl transition cursor-pointer"
            >
              <Smile className="w-3.5 h-3.5 text-amber-400" />
              加表情贴纸
            </button>
            <button
              onClick={() => addElement('shape', { shapeType: 'badge', badgeText: '🔥 纯干货', fill: '#ef4444' })}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/40 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl transition cursor-pointer"
            >
              <Triangle className="w-3.5 h-3.5 text-blue-400" />
              加指示角标
            </button>
          </div>
        </main>

        {/* Right side styling control sliders and tabs */}
        <EditorPanel
          aspectRatio={aspectRatio}
          setAspectRatio={setAspectRatio}
          background={background}
          setBackground={setBackground}
          elements={elements}
          setElements={setElements}
          selectedElementId={selectedElementId}
          setSelectedElementId={setSelectedElementId}
          updateElement={updateElement}
          deleteElement={deleteElement}
          addElement={addElement}
          safeZoneVisible={safeZoneVisible}
          setSafeZoneVisible={setSafeZoneVisible}
          currentTemplateId={currentTemplateId}
          setCurrentTemplateId={setCurrentTemplateId}
          hasSavedDraft={hasSavedDraft}
          onSaveDraft={handleSaveDraft}
          onLoadDraft={handleLoadDraft}
          onResetTemplate={handleResetTemplate}
          onExportProject={handleExportProject}
          onImportProject={() => importInputRef.current?.click()}
        />
      </div>

      {/* 3. FLOATING SUCCESS TOAST & DIALOG MODALS */}
      {exportSuccessToast && (
        <div id="success-toast" className="fixed bottom-6 left-6 z-50 bg-slate-900 border border-slate-800 text-slate-200 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          <div className="text-xs">
            <p className="font-bold">封面导出成功！</p>
            <p className="text-slate-400 mt-0.5">请在浏览器的下载目录中查看。</p>
          </div>
        </div>
      )}

      {/* Floating dynamic status toast */}
      {toast?.show && (
        <div id="dynamic-toast" className="fixed bottom-6 left-6 z-50 bg-slate-900 border border-slate-800 text-slate-200 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom duration-300">
          {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />}
          {toast.type === 'info' && <Info className="w-5 h-5 text-blue-400 shrink-0" />}
          {toast.type === 'error' && <Info className="w-5 h-5 text-rose-400 shrink-0" />}
          <div className="text-xs font-medium">
            {toast.msg}
          </div>
        </div>
      )}

      {/* Hidden Import file input trigger */}
      <input
        type="file"
        ref={importInputRef}
        onChange={handleImportProject}
        style={{ display: 'none' }}
        accept=".json"
      />

      {/* Help Instructions Dialog Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Info className="w-4 h-4 text-rose-500" />
                排版设计小建议 (XHS Cover Guide)
              </h3>
              <button
                onClick={() => setShowHelpModal(false)}
                className="text-slate-400 hover:text-white text-xs cursor-pointer font-bold"
              >
                关闭
              </button>
            </div>
            <div className="p-5 space-y-4 text-xs text-slate-400 leading-relaxed">
              <p>
                小红书是典型的「视觉驱动」社区，好的封面是决定笔记点击率的关键！
              </p>
              
              <div className="space-y-2">
                <h4 className="font-bold text-slate-300">💡 1. 标题文字大且醒目</h4>
                <p>字数尽量控制在 10 字以内，使用文字反衬色背景（Highlighter）或强对比度的描边，让标题在小图预览状态下依然能瞬间被识别。</p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-300">📱 2. 巧用 3:4 安全区域</h4>
                <p>开启「安全区辅助线」进行排版。顶部 10% 容易在瀑布流中被截断，底部 15% 会被用户头像和点赞按钮遮挡，建议将核心标题放在安全区中上部。</p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-300">🌈 3. 色彩和高光角标</h4>
                <p>酸性亮色背景、或者是高饱和度的 Emoji 表情可以增加趣味性。用箭头形状指向重点内容，大大提高读者的点击欲望。</p>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-[11px] text-slate-500">
                <span className="font-bold text-slate-400 block mb-1">画板快捷键提示:</span>
                • 拖拽图层：选中元素后在画板内直接拉动
                <br />
                • 旋转：拉动顶部的蓝色旋转手柄（按住 Shift 以15度辅助对齐）
                <br />
                • 大小字号：拉动右下角蓝色手柄
              </div>
            </div>
            <div className="p-4 bg-slate-950 border-t border-slate-800 text-right">
              <button
                onClick={() => setShowHelpModal(false)}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg cursor-pointer"
              >
                我知道了
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
