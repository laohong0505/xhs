import React, { useState, useEffect } from 'react';
import {
  AspectRatio,
  BackgroundConfig,
  CanvasElement,
  Template,
  TextElement,
  StickerElement,
  ShapeElement,
} from '../types';
import { TEMPLATES } from '../data/templates';
import {
  Sparkles,
  Image as ImageIcon,
  Type,
  Smile,
  Triangle as TriangleIcon,
  Layers,
  ChevronRight,
  Plus,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Sliders,
  Maximize2,
  HelpCircle,
  Wand2,
} from 'lucide-react';

interface EditorPanelProps {
  aspectRatio: AspectRatio;
  setAspectRatio: (ratio: AspectRatio) => void;
  background: BackgroundConfig;
  setBackground: React.Dispatch<React.SetStateAction<BackgroundConfig>>;
  elements: CanvasElement[];
  setElements: React.Dispatch<React.SetStateAction<CanvasElement[]>>;
  selectedElementId: string | null;
  setSelectedElementId: (id: string | null) => void;
  updateElement: (id: string, updates: Partial<CanvasElement>) => void;
  deleteElement: (id: string) => void;
  addElement: (type: 'text' | 'sticker' | 'shape', options?: any) => void;
  safeZoneVisible: boolean;
  setSafeZoneVisible: (visible: boolean) => void;
}

const PRESET_GRADIENTS = [
  { name: '夏日橘红', stops: [{ color: '#f97316', offset: 0 }, { color: '#ef4444', offset: 100 }] },
  { name: '多肉葡萄', stops: [{ color: '#7c3aed', offset: 0 }, { color: '#db2777', offset: 100 }] },
  { name: '薄荷苏打', stops: [{ color: '#0d9488', offset: 0 }, { color: '#06b6d4', offset: 100 }] },
  { name: '桃之夭夭', stops: [{ color: '#f43f5e', offset: 0 }, { color: '#fb7185', offset: 50 }, { color: '#fbcfe8', offset: 100 }] },
  { name: '梦幻极光', stops: [{ color: '#1e1b4b', offset: 0 }, { color: '#312e81', offset: 40 }, { color: '#4f46e5', offset: 100 }] },
  { name: '暖色椰风', stops: [{ color: '#fed7aa', offset: 0 }, { color: '#fdba74', offset: 50 }, { color: '#fef08a', offset: 100 }] },
  { name: '太空灰阶', stops: [{ color: '#18181b', offset: 0 }, { color: '#3f3f46', offset: 100 }] },
];

const POPULAR_EMOJIS = [
  '🔥', '✨', '💡', '🧸', '🎀', '🎯', '📌', '🚀', '💎', '🎓', 
  '💻', '🧁', '🍓', '🥑', '🌈', '🎨', '📅', '🔔', '👑', '💯', 
  '👍', '🙌', '👀', '💖', '⭐', '🎬', '📚', '🌻', '🌙', '🌊',
  '☕', '🍕', '🍰', '🌸', '🎈', '🎉', '🎁', '📱', '💰', '🔑',
  '🏡', '🐾', '💭', '⚠️', '✅', '❌', '➡️', '💥', '👻', '🍿'
];

const FONTS = [
  { name: '系统默认', value: 'Inter, system-ui, sans-serif' },
  { name: '典雅宋体', value: '"Playfair Display", "Noto Serif SC", STSong, serif' },
  { name: '硬核等宽', value: '"JetBrains Mono", Fira Code, monospace' },
  { name: '现代无衬线', value: '"Space Grotesk", sans-serif' },
  { name: '圆润萌系', value: '"Comic Sans MS", "ZCOOL KuaiLe", sans-serif' },
  { name: '经典楷书', value: 'Kaiti, "STKaiti", cursive' },
  { name: '优美黑体', value: '"Noto Sans SC", "Microsoft YaHei", sans-serif' },
  { name: '文艺手写', value: '"Liu Jian Mao Cao", cursive' },
  { name: '复古像素', value: '"ZCOOL QingKe HuangYou", sans-serif' }
];

export default function EditorPanel({
  aspectRatio,
  setAspectRatio,
  background,
  setBackground,
  elements,
  setElements,
  selectedElementId,
  setSelectedElementId,
  updateElement,
  deleteElement,
  addElement,
  safeZoneVisible,
  setSafeZoneVisible,
}: EditorPanelProps) {
  const [activeTab, setActiveTab] = useState<'ai' | 'templates' | 'background' | 'text' | 'stickers' | 'shapes' | 'layers'>('ai');

  // AI Generator state
  const [draftText, setDraftText] = useState('');
  const [preferredVibe, setPreferredVibe] = useState('auto');
  const [customApiKey, setCustomApiKey] = useState(() => {
    try {
      return localStorage.getItem('xhs_custom_api_key') || '';
    } catch {
      return '';
    }
  });
  const [customApiUrl, setCustomApiUrl] = useState(() => {
    try {
      return localStorage.getItem('xhs_custom_api_url') || '';
    } catch {
      return '';
    }
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [lastGenResult, setLastGenResult] = useState<{
    recommendedTemplateId: string;
    mainTitle: string;
    subtitle: string;
    highlights: string[];
    emojis: string[];
    justification: string;
  } | null>(null);

  // Find the currently selected element
  const selectedElement = elements.find((el) => el.id === selectedElementId);

  // Automatically focus corresponding tab when an element is selected
  useEffect(() => {
    if (selectedElementId) {
      const el = elements.find((x) => x.id === selectedElementId);
      if (el) {
        if (el.type === 'text') {
          setActiveTab('text');
        } else if (el.type === 'sticker') {
          setActiveTab('stickers');
        } else if (el.type === 'shape') {
          setActiveTab('shapes');
        }
      }
    }
  }, [selectedElementId]);

  // Apply template
  const handleApplyTemplate = (template: Template) => {
    setAspectRatio(template.aspectRatio);
    setBackground(JSON.parse(JSON.stringify(template.background)));
    
    // Copy elements with brand new IDs to avoid ID conflicts
    const copiedElements = template.elements.map((el) => {
      return {
        ...JSON.parse(JSON.stringify(el)),
        id: Math.random().toString(36).substring(2, 9),
      };
    });
    setElements(copiedElements);
    setSelectedElementId(copiedElements[0]?.id || null);
  };

  // AI-powered cover content applicator
  const handleAiGenerate = async () => {
    if (!draftText.trim()) {
      setGenError('请输入您的笔记文案内容或创意灵感草稿！');
      return;
    }

    setIsGenerating(true);
    setGenError(null);

    try {
      const response = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          draftText,
          preferredCategory: preferredVibe === 'auto' ? undefined : preferredVibe,
          apiKey: customApiKey.trim() || undefined,
          apiUrl: customApiUrl.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        let errMsg = errData.error || errData.message;
        if (typeof errData.error === 'object' && errData.error !== null) {
          errMsg = errData.error.message || JSON.stringify(errData.error);
        }
        
        if (typeof errMsg === 'string' && (errMsg.includes('high demand') || errMsg.includes('503') || response.status === 503)) {
           errMsg = '当前 AI 模型请求量过大，API 限流中，请稍等几秒后再次点击重试！(503 High Demand)';
        }

        throw new Error(errMsg || `请求失败（错误码 ${response.status}）。请确认您已配置了有效的 API 密钥，或者在下方输入了正确的自定义 Key 和代理地址。`);
      }

      const data = await response.json();
      
      // We expect the AI to return `background` and `elements` directly
      if (!data || !data.background || !data.elements) {
        throw new Error('AI 返回的数据格式不正确，请重试');
      }

      setLastGenResult(data);

      // The AI generates for 3:4 canvas aspect ratio by default
      setAspectRatio('3:4');
      
      // Update background
      setBackground(data.background);

      // Give elements fresh local IDs and apply to canvas
      const generatedElements = data.elements.map((el: any) => {
        const newId = Math.random().toString(36).substring(2, 9);
        return {
          ...el,
          id: newId
        };
      });

      setElements(generatedElements);
      setSelectedElementId(generatedElements[0]?.id || null);
    } catch (err: any) {
      console.error('AI Cover Generation error:', err);
      setGenError(err.message || '网络或接口故障，请稍后重试');
    } finally {
      setIsGenerating(false);
    }
  };


  // Set preset gradient stop
  const applyPresetGradient = (stops: any[]) => {
    setBackground((prev) => ({
      ...prev,
      type: 'gradient',
      gradient: {
        ...prev.gradient,
        stops: stops.map((s) => ({ ...s })),
      },
    }));
  };

  // Add custom gradient stop or modify existing ones
  const handleGradientStopColorChange = (index: number, color: string) => {
    setBackground((prev) => {
      const newStops = [...prev.gradient.stops];
      newStops[index] = { ...newStops[index], color };
      return {
        ...prev,
        gradient: { ...prev.gradient, stops: newStops },
      };
    });
  };

  // Custom background image file upload
  const handleBackgroundImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setBackground((prev) => ({
          ...prev,
          type: 'image',
          image: {
            ...prev.image,
            src: reader.result as string,
          },
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Custom transparent sticker file upload
  const handleStickerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        addElement('sticker', {
          src: reader.result as string,
          isEmoji: false,
          width: 140,
          height: 140,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // Move element layer index up/down
  const moveLayer = (id: string, direction: 'up' | 'down') => {
    const index = elements.findIndex((el) => el.id === id);
    if (index === -1) return;

    const nextElements = [...elements];
    if (direction === 'up' && index < elements.length - 1) {
      nextElements[index] = elements[index + 1];
      nextElements[index + 1] = elements[index];
    } else if (direction === 'down' && index > 0) {
      nextElements[index] = elements[index - 1];
      nextElements[index - 1] = elements[index];
    }
    setElements(nextElements);
  };

  // Duplicate selected element
  const duplicateElement = (id: string) => {
    const el = elements.find((x) => x.id === id);
    if (!el) return;

    const duplicate: CanvasElement = {
      ...JSON.parse(JSON.stringify(el)),
      id: Math.random().toString(36).substring(2, 9),
      x: Math.min(500, el.x + 30), // offset slightly
      y: Math.min(700, el.y + 30),
    };

    setElements((prev) => [...prev, duplicate]);
    setSelectedElementId(duplicate.id);
  };

  return (
    <div id="editor-side-panel" className="w-full lg:w-[440px] flex flex-col h-full bg-slate-900 border-l border-slate-800 shrink-0 overflow-hidden">
      {/* Tab bar header */}
      <div className="flex border-b border-slate-800 bg-slate-950/40 px-2 overflow-x-auto scrollbar-none shrink-0">
        {[
          { id: 'ai', label: 'AI爆款生成', icon: Wand2 },
          { id: 'templates', label: '模板', icon: Sparkles },
          { id: 'background', label: '背景', icon: ImageIcon },
          { id: 'text', label: '文字', icon: Type },
          { id: 'stickers', label: '贴纸', icon: Smile },
          { id: 'shapes', label: '形状', icon: TriangleIcon },
          { id: 'layers', label: '图层', icon: Layers },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex flex-col items-center gap-1.5 px-4 py-3 text-xs font-medium cursor-pointer border-b-2 transition-colors shrink-0 ${
                isActive
                  ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Editor Content Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 select-none text-slate-200">
        
        {/* TAB 0: AI VIRAL GENERATOR */}
        {activeTab === 'ai' && (
          <div className="space-y-5">
            <div className="bg-gradient-to-r from-pink-500/10 to-violet-500/10 p-4 rounded-2xl border border-pink-500/20 space-y-2">
              <div className="flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-pink-400" />
                <h3 className="text-sm font-bold text-slate-100">AI 爆款大纲智能生成器</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                只需输入你的小红书笔记文案、大纲或灵感，AI 会智能推荐最契合的排版模板，并一键定制吸睛的核心大字标题与干货亮点！
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 block">
                输入您的笔记文案 / 创意灵感草稿
              </label>
              <textarea
                rows={5}
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                placeholder="例如：我做了一个自律学习app，想跟大家分享我是怎么克服拖延症的，我的秘诀是：1. 康奈尔笔记法，2. 番茄时间专注。希望给考研党一些参考建议..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:border-pink-500 focus:ring-1 focus:ring-pink-500 focus:outline-none placeholder:text-slate-600 resize-none font-sans"
              />
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3.5 space-y-3">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  🔑 智能排版密钥设置
                </span>
                <p className="text-[10.5px] leading-relaxed text-slate-400">
                  <span className="font-semibold text-pink-400">为什么要输入 Key？</span>
                  本系统基于前沿的大语言模型进行智能分析。当您输入笔记草稿或创意灵感后，AI 将自动提炼出极具爆款吸引力的主标题、副标题与三条核心干货亮点，并智能推荐、一键套用最匹配的封面设计及热门贴纸。
                  使用自定义密钥，可为您带来<span className="text-white font-medium">更稳定、更快速</span>的专属生成体验，免受公共免费额度与频次限制的影响。
                </p>
              </div>

              <div className="space-y-2 pt-1.5 border-t border-slate-800/60">
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-slate-400">API 访问密钥 (API Key)</span>
                    <span className="text-[10px] text-slate-500 font-normal">可选，未填时使用内置通道</span>
                  </div>
                  <input
                    type="password"
                    value={customApiKey}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCustomApiKey(val);
                      try {
                        localStorage.setItem('xhs_custom_api_key', val);
                      } catch (err) {}
                    }}
                    placeholder="输入您的 API Key (如 sk-... 或 AI 密钥)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:border-pink-500 focus:outline-none placeholder:text-slate-600"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-slate-400">自定义 API 代理地址 (Base URL)</span>
                    <span className="text-[10px] text-slate-500 font-normal">国内或代理渠道可选填</span>
                  </div>
                  <input
                    type="text"
                    value={customApiUrl}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCustomApiUrl(val);
                      try {
                        localStorage.setItem('xhs_custom_api_url', val);
                      } catch (err) {}
                    }}
                    placeholder="例如: https://api.your-proxy.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:border-pink-500 focus:outline-none placeholder:text-slate-600"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 block">
                意向风格偏好（选填）
              </label>
              <select
                value={preferredVibe}
                onChange={(e) => setPreferredVibe(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:border-pink-500 focus:outline-none cursor-pointer"
              >
                <option value="auto">🌟 AI 自动根据文案调性推荐</option>
                <option value="brutalist-yellow">重金属酸性极简 (brutalist)</option>
                <option value="qa-card-minimal">深夜倾诉问答卡片 (minimal/emotional)</option>
                <option value="vlog-aesthetic-sunset">黄昏慵懒生活随笔 (vlog)</option>
                <option value="cute-sticker-bomb">可爱碎花拼贴手账 (cute)</option>
                <option value="minimal-grid-tech">硬核数码极简网格 (tech)</option>
                <option value="hot-sale-brutalist">爆款红黑高瞩目风 (hot warning)</option>
                <option value="beauty-makeup-rose">法式优雅美妆浪漫粉 (beauty)</option>
                <option value="food-recipe-cream">温暖奶油萌系食记 (food)</option>
                <option value="study-notes-paper">自律高效手账格子本 (study)</option>
                <option value="travel-adventure">野生野奢户外探索指南 (travel)</option>
              </select>
            </div>

            <button
              onClick={handleAiGenerate}
              disabled={isGenerating}
              className="w-full py-3 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 disabled:from-slate-850 disabled:to-slate-850 disabled:text-slate-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-pink-500/15 active:scale-95 transition duration-150 flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              {isGenerating ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>正在深度解析并排版设计...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>AI 智能生成排版封面</span>
                </>
              )}
            </button>

            {genError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] leading-relaxed">
                🚨 {genError}
              </div>
            )}

            {lastGenResult && (
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3.5 animate-in fade-in duration-300 text-slate-300">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-bold text-pink-400 flex items-center gap-1">✨ AI 智能排版结果</span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    已套用: {TEMPLATES.find(t => t.id === lastGenResult.recommendedTemplateId)?.name || lastGenResult.recommendedTemplateId}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block">核心爆款标题：</span>
                    <strong className="text-slate-100 font-bold text-sm">{lastGenResult.mainTitle}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">痛点爆款副标题：</span>
                    <span className="text-slate-300 font-medium">{lastGenResult.subtitle}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">提取核心亮点：</span>
                    <ul className="list-disc pl-4 text-slate-400 space-y-0.5">
                      {lastGenResult.highlights.map((h, i) => (
                        <li key={i}>{h}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="text-[11px] bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60 text-slate-400 italic">
                  <strong>设计推荐理由：</strong>{lastGenResult.justification}
                </div>
              </div>
            )}

            {/* Little design suggestions / optimizations (结合小红书算法和风格的建议) */}
            <div className="pt-4 border-t border-slate-800/80 space-y-3">
              <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                小红书爆款封面视觉密码 & 算法建议
              </h4>
              <div className="space-y-2.5 text-[11px] text-slate-400 leading-relaxed">
                <div className="p-2.5 bg-slate-950/40 rounded-xl border border-slate-800/50">
                  <span className="font-bold text-slate-200 block">📈 1. 痛点醒目，前2秒黄金停留</span>
                  小红书推荐算法极其看重首图点击率 (CTR)。封面中央大字必须足够显眼、字数要少（控制在10字内），让读者在瀑布流刷过时瞬间识别痛点利益。
                </div>
                <div className="p-2.5 bg-slate-950/40 rounded-xl border border-slate-800/50">
                  <span className="font-bold text-slate-200 block">🎭 2. 情绪价值与反衬撞色</span>
                  极简或高对比度的红、黄、黑撞色能帮助突破视觉盲区。使用「文字反色背景块（Highlighter）」并适当偏斜角度，能有效打破呆板排版，增加高潮情绪。
                </div>
                <div className="p-2.5 bg-slate-950/40 rounded-xl border border-slate-800/50">
                  <span className="font-bold text-slate-200 block">🚨 3. 规避小红书安全区红线</span>
                  发布笔记时顶部的10%和底部的15%容易被交互组件和长短边裁切遮挡。建议开启「安全区辅助线」使主标题处于中上部的安全红利区，保留完美观感。
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: TEMPLATES */}
        {activeTab === 'templates' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold tracking-wide text-slate-400 uppercase">推荐排版模板</h3>
              <span className="text-xs text-slate-500">点击立即套用</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.id}
                  onClick={() => handleApplyTemplate(tmpl)}
                  className="flex flex-col text-left rounded-xl overflow-hidden border border-slate-800 bg-slate-950/40 hover:border-blue-500/50 hover:bg-slate-800/20 hover:shadow-lg transition group cursor-pointer"
                >
                  {/* Miniature canvas thumbnail representation */}
                  <div className={`h-28 w-full relative flex items-center justify-center p-3 overflow-hidden ${tmpl.thumbnailColor || 'bg-slate-800'}`}>
                    {tmpl.background.type === 'gradient' && (
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          backgroundImage: `linear-gradient(${tmpl.background.gradient.angle}deg, ${tmpl.background.gradient.stops
                            .map((s) => `${s.color} ${s.offset}%`)
                            .join(', ')})`,
                        }}
                      />
                    )}
                    {tmpl.background.type === 'solid' && (
                      <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: tmpl.background.color }} />
                    )}
                    {/* Visual hints for thumbnail */}
                    <div className="relative z-10 text-center select-none scale-90">
                      <p className="text-[10px] font-black leading-tight truncate max-w-[120px]" style={{ color: tmpl.elements.find(e => e.type === 'text')?.color || '#ffffff' }}>
                        {tmpl.elements.find((e) => e.type === 'text')?.text || tmpl.name}
                      </p>
                      {tmpl.elements.some((e) => e.type === 'sticker') && (
                        <div className="mt-1 flex gap-1 justify-center text-sm">
                          {tmpl.elements.filter((e) => e.type === 'sticker').slice(0, 2).map((s, i) => (
                            <span key={i}>{s.src}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-semibold text-slate-300 group-hover:text-blue-400 truncate">{tmpl.name}</p>
                    <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider">{tmpl.category}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: BACKGROUND */}
        {activeTab === 'background' && (
          <div className="space-y-5">
            {/* Aspect Ratio Selector */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400">尺寸比例 (Xiaohongshu Ratios)</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: '3:4', label: '3:4 竖图', desc: '最佳推荐格式' },
                  { value: '1:1', label: '1:1 方图', desc: '精美标准格式' },
                  { value: '4:3', label: '4:3 横图', desc: '适合横板构图' },
                ].map((ratio) => (
                  <button
                    key={ratio.value}
                    onClick={() => setAspectRatio(ratio.value as AspectRatio)}
                    className={`p-2.5 rounded-xl border text-center transition cursor-pointer flex flex-col items-center justify-center gap-1 ${
                      aspectRatio === ratio.value
                        ? 'border-blue-500 text-blue-400 bg-blue-500/10 font-semibold'
                        : 'border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <span className="text-sm">{ratio.value}</span>
                    <span className="text-[10px] opacity-75">{ratio.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Safe Zone Switch */}
            {aspectRatio === '3:4' && (
              <div className="flex items-center justify-between p-3 bg-slate-950/40 rounded-xl border border-slate-800">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Maximize2 className="w-3.5 h-3.5 text-blue-400" />
                    小红书安全区辅助线
                  </div>
                  <p className="text-[10px] text-slate-500">避开顶部与底部点赞、评论重合区域</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={safeZoneVisible}
                    onChange={(e) => setSafeZoneVisible(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
                </label>
              </div>
            )}

            {/* Background Style Switcher */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400">背景填充类型</label>
              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-950/50 rounded-xl border border-slate-800">
                {[
                  { value: 'solid', label: '纯色' },
                  { value: 'gradient', label: '渐变' },
                  { value: 'image', label: '图片背景' },
                ].map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setBackground((prev) => ({ ...prev, type: type.value as any }))}
                    className={`py-1.5 text-xs rounded-lg transition-all text-center cursor-pointer ${
                      background.type === type.value
                        ? 'bg-slate-800 text-white shadow font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Background subfields depending on selection */}
            {background.type === 'solid' && (
              <div className="space-y-3 bg-slate-950/30 p-3.5 rounded-xl border border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-slate-700 shadow shrink-0">
                    <input
                      type="color"
                      value={background.color}
                      onChange={(e) => setBackground((prev) => ({ ...prev, color: e.target.value }))}
                      className="absolute inset-0 w-full h-full p-0 border-0 cursor-pointer scale-125"
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <label className="text-xs font-medium text-slate-400 block">选择纯色背景</label>
                    <input
                      type="text"
                      value={background.color}
                      onChange={(e) => setBackground((prev) => ({ ...prev, color: e.target.value }))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-md px-2 py-1 text-xs text-slate-300 font-mono focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1.5 pt-2">
                  {['#ffffff', '#f8fafc', '#fb7185', '#fbbf24', '#34d399', '#60a5fa', '#a78bfa', '#09090b'].map((color) => (
                    <button
                      key={color}
                      onClick={() => setBackground((prev) => ({ ...prev, color }))}
                      className="w-full aspect-square rounded-md border border-slate-800 hover:scale-105 active:scale-95 transition cursor-pointer"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            )}

            {background.type === 'gradient' && (
              <div className="space-y-4 bg-slate-950/30 p-3.5 rounded-xl border border-slate-800">
                {/* Preset gradients */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-slate-500 block uppercase">精选潮流双色渐变</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {PRESET_GRADIENTS.map((p, idx) => (
                      <button
                        key={idx}
                        onClick={() => applyPresetGradient(p.stops)}
                        className="w-full h-7 rounded-md hover:scale-[1.03] active:scale-95 transition cursor-pointer border border-slate-800/80"
                        style={{
                          backgroundImage: `linear-gradient(135deg, ${p.stops[0].color}, ${p.stops[p.stops.length - 1].color})`,
                        }}
                        title={p.name}
                      />
                    ))}
                  </div>
                </div>

                {/* Gradient direction / angles */}
                <div className="space-y-2 pt-2 border-t border-slate-800/50">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">渐变方向 / 角度</span>
                    <span className="font-mono text-slate-500">{background.gradient.angle}°</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={background.gradient.angle}
                    onChange={(e) =>
                      setBackground((prev) => ({
                        ...prev,
                        gradient: { ...prev.gradient, angle: parseInt(e.target.value) },
                      }))
                    }
                    className="w-full accent-blue-500"
                  />
                </div>

                {/* Gradient Stops editing */}
                <div className="space-y-2.5 pt-2 border-t border-slate-800/50">
                  <label className="text-[11px] font-medium text-slate-500 block uppercase">自定义两端颜色</label>
                  <div className="flex items-center justify-between gap-4">
                    {background.gradient.stops.slice(0, 2).map((stop, index) => (
                      <div key={index} className="flex items-center gap-2 flex-1">
                        <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-slate-800">
                          <input
                            type="color"
                            value={stop.color}
                            onChange={(e) => handleGradientStopColorChange(index, e.target.value)}
                            className="absolute inset-0 w-full h-full p-0 border-0 cursor-pointer scale-125"
                          />
                        </div>
                        <input
                          type="text"
                          value={stop.color}
                          onChange={(e) => handleGradientStopColorChange(index, e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-md px-1.5 py-1 text-[11px] text-slate-300 font-mono focus:border-blue-500 focus:outline-none text-center"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {background.type === 'image' && (
              <div className="space-y-4 bg-slate-950/30 p-3.5 rounded-xl border border-slate-800">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-400 block">上传自定义底图 (PNG/JPG)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleBackgroundImageUpload}
                    className="block w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-500/10 file:text-blue-400 hover:file:bg-blue-500/20 file:cursor-pointer"
                  />
                </div>

                {background.image.src && (
                  <div className="space-y-3 pt-2 border-t border-slate-800/50">
                    {/* Image Settings */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">毛玻璃高斯模糊</span>
                        <span className="font-mono text-slate-500">{background.image.blur}px</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="30"
                        value={background.image.blur}
                        onChange={(e) =>
                          setBackground((prev) => ({
                            ...prev,
                            image: { ...prev.image, blur: parseInt(e.target.value) },
                          }))
                        }
                        className="w-full accent-blue-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">底图亮度 (Brightness)</span>
                        <span className="font-mono text-slate-500">{background.image.brightness}%</span>
                      </div>
                      <input
                        type="range"
                        min="50"
                        max="150"
                        value={background.image.brightness}
                        onChange={(e) =>
                          setBackground((prev) => ({
                            ...prev,
                            image: { ...prev.image, brightness: parseInt(e.target.value) },
                          }))
                        }
                        className="w-full accent-blue-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">对比度 (Contrast)</span>
                        <span className="font-mono text-slate-500">{background.image.contrast}%</span>
                      </div>
                      <input
                        type="range"
                        min="50"
                        max="200"
                        value={background.image.contrast}
                        onChange={(e) =>
                          setBackground((prev) => ({
                            ...prev,
                            image: { ...prev.image, contrast: parseInt(e.target.value) },
                          }))
                        }
                        className="w-full accent-blue-500"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-slate-400">灰度 (Grayscale)</span>
                          <span className="font-mono text-slate-500">{background.image.grayscale || 0}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={background.image.grayscale || 0}
                          onChange={(e) =>
                            setBackground((prev) => ({
                              ...prev,
                              image: { ...prev.image, grayscale: parseInt(e.target.value) },
                            }))
                          }
                          className="w-full accent-blue-500 h-1"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-slate-400">复古 (Sepia)</span>
                          <span className="font-mono text-slate-500">{background.image.sepia || 0}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={background.image.sepia || 0}
                          onChange={(e) =>
                            setBackground((prev) => ({
                              ...prev,
                              image: { ...prev.image, sepia: parseInt(e.target.value) },
                            }))
                          }
                          className="w-full accent-blue-500 h-1"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-slate-400">饱和度 (Saturate)</span>
                          <span className="font-mono text-slate-500">{background.image.saturate ?? 100}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="200"
                          value={background.image.saturate ?? 100}
                          onChange={(e) =>
                            setBackground((prev) => ({
                              ...prev,
                              image: { ...prev.image, saturate: parseInt(e.target.value) },
                            }))
                          }
                          className="w-full accent-blue-500 h-1"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-slate-400">色相偏移 (Hue)</span>
                          <span className="font-mono text-slate-500">{background.image.hueRotate || 0}°</span>
                        </div>
                        <input
                          type="range"
                          min="-180"
                          max="180"
                          value={background.image.hueRotate || 0}
                          onChange={(e) =>
                            setBackground((prev) => ({
                              ...prev,
                              image: { ...prev.image, hueRotate: parseInt(e.target.value) },
                            }))
                          }
                          className="w-full accent-blue-500 h-1"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">暗角遮罩颜色 & 不透明度</span>
                        <span className="font-mono text-slate-500">{background.image.overlayOpacity}%</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={background.image.overlayColor}
                          onChange={(e) =>
                            setBackground((prev) => ({
                              ...prev,
                              image: { ...prev.image, overlayColor: e.target.value },
                            }))
                          }
                          className="w-8 h-8 rounded border border-slate-800 cursor-pointer"
                        />
                        <input
                          type="range"
                          min="0"
                          max="90"
                          value={background.image.overlayOpacity}
                          onChange={(e) =>
                            setBackground((prev) => ({
                              ...prev,
                              image: { ...prev.image, overlayOpacity: parseInt(e.target.value) },
                            }))
                          }
                          className="flex-1 accent-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Background Texture Patterns */}
            <div className="space-y-3 bg-slate-950/30 p-3.5 rounded-xl border border-slate-800">
              <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-blue-400" />
                磨砂网格与微肌理
              </label>

              <div className="grid grid-cols-5 gap-1">
                {[
                  { value: 'none', label: '无肌理' },
                  { value: 'dots', label: '点阵' },
                  { value: 'grid', label: '网格' },
                  { value: 'stripes', label: '斜线' },
                  { value: 'noise', label: '斑驳' },
                ].map((pat) => (
                  <button
                    key={pat.value}
                    onClick={() => setBackground((prev) => ({ ...prev, pattern: pat.value as any }))}
                    className={`py-1 rounded-md text-[11px] border transition cursor-pointer text-center ${
                      background.pattern === pat.value
                        ? 'border-blue-500 text-blue-400 bg-blue-500/5 font-semibold'
                        : 'border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {pat.label}
                  </button>
                ))}
              </div>

              {background.pattern !== 'none' && (
                <div className="space-y-3 pt-2.5">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>肌理不透明度</span>
                      <span>{background.patternOpacity}%</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="80"
                      value={background.patternOpacity}
                      onChange={(e) =>
                        setBackground((prev) => ({ ...prev, patternOpacity: parseInt(e.target.value) }))
                      }
                      className="w-full accent-blue-500"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400">肌理线条颜色</span>
                    <input
                      type="color"
                      value={background.patternColor}
                      onChange={(e) => setBackground((prev) => ({ ...prev, patternColor: e.target.value }))}
                      className="w-6 h-6 rounded border border-slate-800 cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: TEXTS */}
        {activeTab === 'text' && (
          <div className="space-y-5">
            {/* If NO element is selected or selected element is NOT a text element */}
            {(!selectedElement || selectedElement.type !== 'text') ? (
              <div className="space-y-4">
                <div className="p-4 bg-slate-950/40 rounded-xl border border-dashed border-slate-800 text-center space-y-2">
                  <p className="text-xs text-slate-400">在画板上添加精美的艺术排版</p>
                  <p className="text-[10px] text-slate-500">点击下方预设一键添加</p>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => addElement('text', { style: 'default' })}
                    className="w-full p-3 rounded-xl border border-slate-800 bg-slate-900/60 hover:border-blue-500/50 hover:bg-slate-800/40 text-left flex items-center justify-between group transition cursor-pointer"
                  >
                    <div>
                      <h4 className="text-xs font-semibold text-slate-200">标准无边框文本</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">普通极简设计文字</p>
                    </div>
                    <Plus className="w-4 h-4 text-slate-500 group-hover:text-blue-400" />
                  </button>

                  <button
                    onClick={() => addElement('text', { style: 'brutalist' })}
                    className="w-full p-3 rounded-xl border border-slate-800 bg-slate-900/60 hover:border-blue-500/50 hover:bg-slate-800/40 text-left flex items-center justify-between group transition cursor-pointer"
                  >
                    <div>
                      <h4 className="text-xs font-semibold text-rose-400">酸性亮色反白标签</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">带倾斜和重金属描边的黑字背景</p>
                    </div>
                    <Plus className="w-4 h-4 text-slate-500 group-hover:text-blue-400" />
                  </button>

                  <button
                    onClick={() => addElement('text', { style: 'glow' })}
                    className="w-full p-3 rounded-xl border border-slate-800 bg-slate-900/60 hover:border-blue-500/50 hover:bg-slate-800/40 text-left flex items-center justify-between group transition cursor-pointer"
                  >
                    <div>
                      <h4 className="text-xs font-semibold text-blue-400">霓虹柔光气泡</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">柔和发光投影，常用于深夜话题</p>
                    </div>
                    <Plus className="w-4 h-4 text-slate-500 group-hover:text-blue-400" />
                  </button>
                </div>
              </div>
            ) : (
              // Selected Text element editor panel
              <div className="space-y-4">
                <div className="flex items-center justify-between p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                  <span className="text-xs font-semibold text-blue-400">正在编辑文字元素</span>
                  <button
                    onClick={() => setSelectedElementId(null)}
                    className="text-[10px] text-slate-400 hover:text-white cursor-pointer underline"
                  >
                    取消选择
                  </button>
                </div>

                {/* Text Content Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-400">文字内容 (支持换行)</label>
                  <textarea
                    rows={2}
                    value={(selectedElement as TextElement).text}
                    onChange={(e) => updateElement(selectedElement.id, { text: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    placeholder="输入封面文字..."
                  />
                </div>

                {/* Typography Selectors */}
                <div className="grid grid-cols-2 gap-3.5 pt-2 border-t border-slate-800/60">
                  <div className="space-y-1.5 col-span-2">
                    <label className="text-xs font-medium text-slate-400 block">字体家族</label>
                    <select
                      value={(selectedElement as TextElement).fontFamily}
                      onChange={(e) => updateElement(selectedElement.id, { fontFamily: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:border-blue-500 focus:outline-none cursor-pointer"
                    >
                      {FONTS.map((f) => (
                        <option key={f.value} value={f.value}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-400 block">字体粗细</label>
                    <select
                      value={(selectedElement as TextElement).fontWeight}
                      onChange={(e) => updateElement(selectedElement.id, { fontWeight: e.target.value as any })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:border-blue-500 focus:outline-none cursor-pointer"
                    >
                      <option value="normal">标准 (Normal)</option>
                      <option value="medium">中等 (Medium)</option>
                      <option value="bold">粗体 (Bold)</option>
                      <option value="black">超粗 (Black)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-400 block">对齐方式</label>
                    <select
                      value={(selectedElement as TextElement).textAlign || 'left'}
                      onChange={(e) => updateElement(selectedElement.id, { textAlign: e.target.value as any })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:border-blue-500 focus:outline-none cursor-pointer"
                    >
                      <option value="left">居左 (Left)</option>
                      <option value="center">居中 (Center)</option>
                      <option value="right">居右 (Right)</option>
                    </select>
                  </div>
                </div>

                {/* Font Size & Letter Spacing */}
                <div className="space-y-3.5 pt-2 border-t border-slate-800/60">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">字号大小 (Font Size)</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="8"
                          max="200"
                          value={(selectedElement as TextElement).fontSize}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            if (!isNaN(val)) {
                              updateElement(selectedElement.id, { fontSize: Math.max(8, Math.min(200, val)) });
                            }
                          }}
                          className="w-14 text-center bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-xs font-mono text-slate-300 focus:outline-none focus:border-blue-500"
                        />
                        <span className="text-slate-500 font-mono">px</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="12"
                      max="150"
                      value={(selectedElement as TextElement).fontSize}
                      onChange={(e) => updateElement(selectedElement.id, { fontSize: parseInt(e.target.value) })}
                      className="w-full accent-blue-500 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">字间距 (Letter Spacing)</span>
                      <span className="font-mono text-slate-500">{(selectedElement as TextElement).letterSpacing}px</span>
                    </div>
                    <input
                      type="range"
                      min="-4"
                      max="20"
                      value={(selectedElement as TextElement).letterSpacing}
                      onChange={(e) => updateElement(selectedElement.id, { letterSpacing: parseInt(e.target.value) })}
                      className="w-full accent-blue-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">行高 (Line Height)</span>
                      <span className="font-mono text-slate-500">{(selectedElement as TextElement).lineHeight}</span>
                    </div>
                    <input
                      type="range"
                      min="0.8"
                      max="2"
                      step="0.1"
                      value={(selectedElement as TextElement).lineHeight}
                      onChange={(e) => updateElement(selectedElement.id, { lineHeight: parseFloat(e.target.value) })}
                      className="w-full accent-blue-500"
                    />
                  </div>
                </div>

                {/* Colors (Text Color) */}
                <div className="space-y-2 pt-2 border-t border-slate-800/60">
                  <label className="text-xs font-medium text-slate-400 block">文字颜色</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={(selectedElement as TextElement).color}
                      onChange={(e) => updateElement(selectedElement.id, { color: e.target.value })}
                      className="w-8 h-8 rounded border border-slate-800 cursor-pointer shrink-0"
                    />
                    <input
                      type="text"
                      value={(selectedElement as TextElement).color}
                      onChange={(e) => updateElement(selectedElement.id, { color: e.target.value })}
                      className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 font-mono focus:border-blue-500 focus:outline-none flex-1"
                    />
                    {/* Tiny Palette for quick select */}
                    <div className="flex gap-1">
                      {['#ffffff', '#000000', '#ef4444', '#f59e0b', '#3b82f6'].map((col) => (
                        <button
                          key={col}
                          onClick={() => updateElement(selectedElement.id, { color: col })}
                          className="w-5 h-5 rounded border border-slate-800 cursor-pointer shrink-0"
                          style={{ backgroundColor: col }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* TEXT BACKGROUND / HIGHLIGHT BANNER */}
                <div className="space-y-3 pt-3 border-t border-slate-800/60">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-100 flex items-center gap-1.5">
                      文本框背景颜色 (Text Box Background Color)
                    </label>
                    <input
                      type="checkbox"
                      checked={(selectedElement as TextElement).bg?.enabled || false}
                      onChange={(e) =>
                        updateElement(selectedElement.id, {
                          bg: {
                            ...((selectedElement as TextElement).bg || {}),
                            enabled: e.target.checked,
                            color: (selectedElement as TextElement).bg?.color || '#000000',
                            paddingX: (selectedElement as TextElement).bg?.paddingX ?? 12,
                            paddingY: (selectedElement as TextElement).bg?.paddingY ?? 6,
                            borderRadius: (selectedElement as TextElement).bg?.borderRadius ?? 6,
                            borderWidth: (selectedElement as TextElement).bg?.borderWidth ?? 0,
                            borderColor: (selectedElement as TextElement).bg?.borderColor || '#ffffff',
                            skew: (selectedElement as TextElement).bg?.skew ?? 0,
                          },
                        })
                      }
                      className="accent-blue-500 cursor-pointer h-4 w-4 rounded"
                    />
                  </div>

                  {(selectedElement as TextElement).bg?.enabled && (
                    <div className="space-y-3 bg-slate-950/40 p-3 rounded-lg border border-slate-800 space-y-2.5">
                      <div className="space-y-2">
                        <span className="text-[11px] text-slate-400 block">背景样式 (Background Style)</span>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { value: 'solid', label: '纯色填充' },
                            { value: 'glass', label: '磨砂毛玻璃' },
                            { value: 'outline', label: '线框' },
                            { value: 'gradient', label: '渐变填充' }
                          ].map(styleOpt => (
                            <button
                              key={styleOpt.value}
                              onClick={() =>
                                updateElement(selectedElement.id, {
                                  bg: { ...(selectedElement as TextElement).bg, bgStyle: styleOpt.value as any },
                                })
                              }
                              className={`py-1.5 px-2 text-[11px] rounded border transition-colors ${
                                ((selectedElement as TextElement).bg.bgStyle || 'solid') === styleOpt.value
                                  ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'
                              }`}
                            >
                              {styleOpt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2 pt-1 border-t border-slate-800/50">
                        <span className="text-[11px] text-slate-400 block">形状 (Shape)</span>
                        <div className="grid grid-cols-3 gap-1">
                          {[
                            { value: 'rectangle', label: '矩形' },
                            { value: 'pill', label: '胶囊' },
                            { value: 'oval', label: '椭圆' }
                          ].map(shapeOpt => (
                            <button
                              key={shapeOpt.value}
                              onClick={() =>
                                updateElement(selectedElement.id, {
                                  bg: { ...(selectedElement as TextElement).bg, shape: shapeOpt.value as any },
                                })
                              }
                              className={`py-1 rounded text-[10px] border transition-colors text-center ${
                                ((selectedElement as TextElement).bg.shape || 'rectangle') === shapeOpt.value
                                  ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'
                              }`}
                              title={shapeOpt.label}
                            >
                              {shapeOpt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-800/50">
                        <span className="text-[11px] text-slate-400">颜色</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={(selectedElement as TextElement).bg.color}
                            onChange={(e) =>
                              updateElement(selectedElement.id, {
                                bg: { ...(selectedElement as TextElement).bg, color: e.target.value },
                              })
                            }
                            className="w-6 h-6 rounded border border-slate-800 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={(selectedElement as TextElement).bg.color}
                            onChange={(e) =>
                              updateElement(selectedElement.id, {
                                bg: { ...(selectedElement as TextElement).bg, color: e.target.value },
                              })
                            }
                            className="bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-[10px] text-slate-300 font-mono w-16"
                          />
                        </div>
                      </div>

                      {/* Skew & Border Radius */}
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <div className="space-y-1">
                          <span className="text-[11px] text-slate-400 block">左右内边距</span>
                          <input
                            type="number"
                            min="0"
                            max="40"
                            value={(selectedElement as TextElement).bg.paddingX}
                            onChange={(e) =>
                              updateElement(selectedElement.id, {
                                bg: { ...(selectedElement as TextElement).bg, paddingX: parseInt(e.target.value) || 0 },
                              })
                            }
                            className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300"
                          />
                        </div>

                        <div className="space-y-1">
                          <span className="text-[11px] text-slate-400 block">倾斜度 (Skew)</span>
                          <input
                            type="number"
                            min="-25"
                            max="25"
                            value={(selectedElement as TextElement).bg.skew}
                            onChange={(e) =>
                              updateElement(selectedElement.id, {
                                bg: { ...(selectedElement as TextElement).bg, skew: parseInt(e.target.value) || 0 },
                              })
                            }
                            className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <div className="space-y-1">
                          <span className="text-[11px] text-slate-400 block">圆角半径 (Radius)</span>
                          <input
                            type="number"
                            min="0"
                            max="99"
                            value={(selectedElement as TextElement).bg.borderRadius}
                            onChange={(e) =>
                              updateElement(selectedElement.id, {
                                bg: { ...(selectedElement as TextElement).bg, borderRadius: parseInt(e.target.value) || 0 },
                              })
                            }
                            className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300"
                          />
                        </div>

                        <div className="space-y-1">
                          <span className="text-[11px] text-slate-400 block">边框宽度 (Stroke)</span>
                          <input
                            type="number"
                            min="0"
                            max="10"
                            value={(selectedElement as TextElement).bg.borderWidth}
                            onChange={(e) =>
                              updateElement(selectedElement.id, {
                                bg: { ...(selectedElement as TextElement).bg, borderWidth: parseInt(e.target.value) || 0 },
                              })
                            }
                            className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* TEXT OUTLINE / STROKE */}
                <div className="space-y-3 pt-3 border-t border-slate-800/60">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      文字描边 (Text Stroke Outline)
                    </label>
                    <input
                      type="checkbox"
                      checked={(selectedElement as TextElement).stroke?.enabled || false}
                      onChange={(e) =>
                        updateElement(selectedElement.id, {
                          stroke: {
                            ...((selectedElement as TextElement).stroke || {}),
                            enabled: e.target.checked,
                            color: (selectedElement as TextElement).stroke?.color || '#000000',
                            width: (selectedElement as TextElement).stroke?.width ?? 3,
                          },
                        })
                      }
                      className="accent-blue-500 cursor-pointer h-4 w-4 rounded"
                    />
                  </div>

                  {(selectedElement as TextElement).stroke?.enabled && (
                    <div className="flex items-center gap-3 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800 justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-400">描边粗细</span>
                        <input
                          type="number"
                          min="1"
                          max="8"
                          value={(selectedElement as TextElement).stroke.width}
                          onChange={(e) =>
                            updateElement(selectedElement.id, {
                              stroke: { ...(selectedElement as TextElement).stroke, width: parseInt(e.target.value) || 1 },
                            })
                          }
                          className="w-12 bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-xs text-slate-300"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-slate-400">描边颜色</span>
                        <input
                          type="color"
                          value={(selectedElement as TextElement).stroke.color}
                          onChange={(e) =>
                            updateElement(selectedElement.id, {
                              stroke: { ...(selectedElement as TextElement).stroke, color: e.target.value },
                            })
                          }
                          className="w-6 h-6 rounded border border-slate-800 cursor-pointer"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* TEXT SHADOW & 3D EFFECT */}
                <div className="space-y-3 pt-3 border-t border-slate-800/60">
                  <label className="text-xs font-semibold text-slate-300 block">文字阴影与3D效果 (Shadow Effects)</label>
                  <div className="grid grid-cols-3 gap-1 p-1 bg-slate-950/50 rounded-xl border border-slate-800">
                    {[
                      { value: 'none', label: '无阴影' },
                      { value: 'soft', label: '柔和投影' },
                      { value: 'elegant', label: '优雅弥散' },
                      { value: 'float', label: '立体浮雕' },
                      { value: 'neon', label: '赛博霓虹' },
                      { value: 'glitch', label: '故障风' },
                    ].map((sh) => (
                      <button
                        key={sh.value}
                        onClick={() =>
                          updateElement(selectedElement.id, {
                            shadow: {
                              ...((selectedElement as TextElement).shadow || {}),
                              type: sh.value as any,
                              color: (selectedElement as TextElement).shadow?.color || '#000000',
                              x: sh.value === 'hard' ? 4 : (selectedElement as TextElement).shadow?.x ?? 0,
                              y: sh.value === 'hard' ? 4 : (selectedElement as TextElement).shadow?.y ?? 2,
                              blur: sh.value === 'glow' ? 12 : (selectedElement as TextElement).shadow?.blur ?? 6,
                            },
                          })
                        }
                        className={`py-1.5 rounded-md text-[10px] border transition cursor-pointer text-center ${
                          (selectedElement as TextElement).shadow.type === sh.value
                            ? 'border-blue-500 text-blue-400 bg-blue-500/10 font-semibold shadow-sm'
                            : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                        }`}
                      >
                        {sh.label}
                      </button>
                    ))}
                  </div>

                  {(selectedElement as TextElement).shadow.type !== 'none' && (
                    <div className="space-y-3 bg-slate-950/40 p-3 rounded-lg border border-slate-800 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">阴影颜色</span>
                        <input
                          type="color"
                          value={(selectedElement as TextElement).shadow.color}
                          onChange={(e) =>
                            updateElement(selectedElement.id, {
                              shadow: { ...(selectedElement as TextElement).shadow, color: e.target.value },
                            })
                          }
                          className="w-6 h-6 rounded border border-slate-800 cursor-pointer"
                        />
                      </div>

                      {(selectedElement as TextElement).shadow.type !== 'glow' && (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <span className="text-[11px] text-slate-400 block">水平偏移 (X)</span>
                            <input
                              type="number"
                              min="-20"
                              max="20"
                              value={(selectedElement as TextElement).shadow.x}
                              onChange={(e) =>
                                updateElement(selectedElement.id, {
                                  shadow: { ...(selectedElement as TextElement).shadow, x: parseInt(e.target.value) || 0 },
                                })
                              }
                              className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300"
                            />
                          </div>
                          <div className="space-y-1">
                            <span className="text-[11px] text-slate-400 block">垂直偏移 (Y)</span>
                            <input
                              type="number"
                              min="-20"
                              max="20"
                              value={(selectedElement as TextElement).shadow.y}
                              onChange={(e) =>
                                updateElement(selectedElement.id, {
                                  shadow: { ...(selectedElement as TextElement).shadow, y: parseInt(e.target.value) || 0 },
                                })
                              }
                              className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300"
                            />
                          </div>
                        </div>
                      )}

                      {(selectedElement as TextElement).shadow.type !== 'hard' && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] text-slate-400">
                            <span>阴影羽化模糊</span>
                            <span>{(selectedElement as TextElement).shadow.blur}px</span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="30"
                            value={(selectedElement as TextElement).shadow.blur}
                            onChange={(e) =>
                              updateElement(selectedElement.id, {
                                shadow: { ...(selectedElement as TextElement).shadow, blur: parseInt(e.target.value) || 1 },
                              })
                            }
                            className="w-full accent-blue-500"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Quick actions for selected text element */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    onClick={() => duplicateElement(selectedElement.id)}
                    className="flex items-center justify-center gap-1.5 py-2 rounded-lg border border-slate-800 hover:border-slate-700 hover:bg-slate-800 text-xs text-slate-300 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    克隆此图层
                  </button>
                  <button
                    onClick={() => deleteElement(selectedElement.id)}
                    className="flex items-center justify-center gap-1.5 py-2 rounded-lg border border-red-900/30 bg-red-950/10 hover:bg-red-950/30 text-xs text-red-400 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    删除此文字
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: STICKERS & EMOJIS */}
        {activeTab === 'stickers' && (
          <div className="space-y-4">
            {/* Custom Transparent Sticker Upload */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400 block">上传透明背景贴纸 (PNG/WEBP)</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleStickerUpload}
                className="block w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-500/10 file:text-blue-400 hover:file:bg-blue-500/20 file:cursor-pointer"
              />
            </div>

            {/* Popular Emoji Sticker Bombers */}
            <div className="space-y-2 pt-3 border-t border-slate-800/60">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-400">爆款 Emoji 表情包</label>
                <span className="text-[10px] text-slate-500">点击直接添加至画面</span>
              </div>

              <div className="grid grid-cols-6 gap-2 bg-slate-950/40 p-3 rounded-xl border border-slate-850 max-h-96 overflow-y-auto">
                {POPULAR_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => addElement('sticker', { src: emoji, isEmoji: true })}
                    className="aspect-square flex items-center justify-center text-2xl hover:scale-125 active:scale-95 transition hover:bg-slate-800/40 rounded-lg cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: SHAPES & DECORATIONS */}
        {activeTab === 'shapes' && (
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 block">添加装饰形状 / 矢量块</label>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { type: 'rect', label: '圆角矩形', desc: '卡片及文字背衬' },
                  { type: 'circle', label: '圆形矢量', desc: '点缀和头像背景' },
                  { type: 'triangle', label: '三角形', desc: '角标指示' },
                  { type: 'arrow', label: '引导箭头 ➔', desc: '爆点导流指向' },
                  { type: 'line', label: '分割水平线', desc: '标题隔断分割' },
                ].map((sh) => (
                  <button
                    key={sh.type}
                    onClick={() => addElement('shape', { shapeType: sh.type })}
                    className="p-3 text-left rounded-xl border border-slate-800 bg-slate-900/60 hover:border-blue-500/50 hover:bg-slate-800/40 transition flex flex-col justify-between cursor-pointer group"
                  >
                    <span className="text-xs font-bold text-slate-200 group-hover:text-blue-400">{sh.label}</span>
                    <span className="text-[10px] text-slate-500 mt-1">{sh.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Interactive Badge Labels (Standard Xiaohongshu tags) */}
            <div className="space-y-2 pt-3 border-t border-slate-800/60">
              <label className="text-xs font-semibold text-slate-400 block">小红书高光圆角标签 (Badge Labels)</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { text: '🔥 纯干货', color: '#ef4444' },
                  { text: '💡 保姆级', color: '#fbbf24' },
                  { text: '🧸 萌新必看', color: '#fb7185' },
                  { text: '✨ 深度评测', color: '#8b5cf6' },
                ].map((tag, i) => (
                  <button
                    key={i}
                    onClick={() =>
                      addElement('shape', {
                        shapeType: 'badge',
                        badgeText: tag.text,
                        fill: tag.color,
                        stroke: '#000000',
                        strokeWidth: 2,
                        width: 140,
                        height: 50,
                      })
                    }
                    className="p-2 border border-slate-800 bg-slate-950/40 rounded-lg text-xs font-bold flex items-center justify-center hover:border-blue-500 hover:text-white transition cursor-pointer"
                    style={{ borderLeftColor: tag.color, borderLeftWidth: 4 }}
                  >
                    {tag.text}
                  </button>
                ))}
              </div>
            </div>

            {/* Editing active shape element if one is selected */}
            {selectedElement && selectedElement.type === 'shape' && (
              <div className="space-y-4 pt-3 border-t border-slate-800/60 bg-slate-950/20 p-3.5 rounded-xl border border-slate-850">
                <div className="flex items-center justify-between text-xs font-semibold text-blue-400 pb-1">
                  <span>正在编辑形状元素</span>
                  <button onClick={() => setSelectedElementId(null)} className="text-[10px] text-slate-500 hover:text-white underline cursor-pointer">
                    取消
                  </button>
                </div>

                {/* If badge, edit text */}
                {(selectedElement as ShapeElement).shapeType === 'badge' && (
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-400 block">标签文本</span>
                    <input
                      type="text"
                      value={(selectedElement as ShapeElement).badgeText || ''}
                      onChange={(e) => updateElement(selectedElement.id, { badgeText: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-white focus:border-blue-500"
                    />
                  </div>
                )}

                {/* Fill and Stroke colors */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-400 block">填充颜色</span>
                    <input
                      type="color"
                      value={(selectedElement as ShapeElement).fill || '#ffffff'}
                      onChange={(e) => updateElement(selectedElement.id, { fill: e.target.value })}
                      className="w-full h-8 rounded border border-slate-800 cursor-pointer"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-400 block">边框颜色</span>
                    <input
                      type="color"
                      value={(selectedElement as ShapeElement).stroke || '#000000'}
                      onChange={(e) => updateElement(selectedElement.id, { stroke: e.target.value })}
                      className="w-full h-8 rounded border border-slate-800 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>边框粗细 (Stroke Width)</span>
                    <span>{(selectedElement as ShapeElement).strokeWidth}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="12"
                    value={(selectedElement as ShapeElement).strokeWidth}
                    onChange={(e) => updateElement(selectedElement.id, { strokeWidth: parseInt(e.target.value) || 0 })}
                    className="w-full accent-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    onClick={() => duplicateElement(selectedElement.id)}
                    className="flex items-center justify-center gap-1 py-1.5 rounded border border-slate-800 hover:bg-slate-800 text-xs text-slate-300 cursor-pointer"
                  >
                    克隆
                  </button>
                  <button
                    onClick={() => deleteElement(selectedElement.id)}
                    className="flex items-center justify-center gap-1 py-1.5 rounded bg-red-950/10 hover:bg-red-950/30 border border-red-900/30 text-xs text-red-400 cursor-pointer"
                  >
                    删除
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 6: LAYERS */}
        {activeTab === 'layers' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold tracking-wide text-slate-400 uppercase">图层堆叠结构</h3>
              <span className="text-xs text-slate-500">顶部在最上层</span>
            </div>

            {elements.length === 0 ? (
              <div className="p-8 text-center bg-slate-950/30 rounded-xl border border-slate-800">
                <Layers className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-400">画板中空空如也</p>
                <p className="text-[10px] text-slate-500 mt-1">快在“文字”或“贴纸”选项卡添加元素吧！</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-y-auto">
                {/* Render backwards so top of array is shown at top of panel */}
                {[...elements].reverse().map((el, revIdx) => {
                  const actualIdx = elements.length - 1 - revIdx;
                  const isSelected = selectedElementId === el.id;

                  return (
                    <div
                      key={el.id}
                      onClick={() => setSelectedElementId(el.id)}
                      className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition ${
                        isSelected
                          ? 'border-blue-500 bg-blue-500/5 text-blue-300'
                          : 'border-slate-800 bg-slate-950/30 text-slate-300 hover:border-slate-700 hover:bg-slate-900/40'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        {/* Little type emblem */}
                        <div className="w-6 h-6 rounded bg-slate-800 flex items-center justify-center shrink-0">
                          {el.type === 'text' && <Type className="w-3 h-3 text-emerald-400" />}
                          {el.type === 'sticker' && <Smile className="w-3 h-3 text-amber-400" />}
                          {el.type === 'shape' && <TriangleIcon className="w-3 h-3 text-blue-400" />}
                        </div>
                        <span className="text-xs font-medium truncate max-w-[160px]">
                          {el.type === 'text'
                            ? `文本: "${el.text.substring(0, 15)}${el.text.length > 15 ? '...' : ''}"`
                            : el.type === 'sticker'
                            ? `贴纸: ${el.src.startsWith('data:') ? '本地贴纸' : el.src}`
                            : `形状: ${(el as ShapeElement).shapeType}`}
                        </span>
                      </div>

                      {/* Reorder actions */}
                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => moveLayer(el.id, 'up')}
                          disabled={actualIdx === elements.length - 1}
                          className="p-1 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 hover:text-white text-slate-400 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                          title="移到上一层"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => moveLayer(el.id, 'down')}
                          disabled={actualIdx === 0}
                          className="p-1 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 hover:text-white text-slate-400 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                          title="移到下一层"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => deleteElement(el.id)}
                          className="p-1 rounded bg-red-950/10 border border-red-900/30 text-red-400 hover:bg-red-950/40 cursor-pointer ml-1"
                          title="删除此层"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
