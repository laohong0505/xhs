import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-loaded GoogleGenAI helper to prevent startup crashes if GEMINI_API_KEY is missing
function getAiClient(customKey?: string, customUrl?: string): GoogleGenAI {
  const activeKey = customKey?.trim() || process.env.GEMINI_API_KEY;
  const activeUrl = customUrl?.trim() || undefined;

  if (!activeKey) {
    throw new Error("请在设置中配置有效的 API Key，或在前端输入您自己的自定义密钥。");
  }

  return new GoogleGenAI({
    apiKey: activeKey,
    baseURL: activeUrl,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

// 1. Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// 2. Gemini-powered XHS Cover Generation Endpoint
app.post("/api/gemini/generate", async (req, res) => {
  try {
    const { draftText, preferredCategory, apiKey, apiUrl } = req.body;
    
    if (!draftText || typeof draftText !== "string" || draftText.trim() === "") {
      return res.status(400).json({ error: "请提供文案或大纲内容！" });
    }

    const ai = getAiClient(apiKey, apiUrl);

    const systemInstruction = `你是一位顶级的小红书封面排版与视觉设计大师。你的任务是分析用户的文案内容，并**完全从零开始**动态生成一个定制的封面排版数据。
画布尺寸默认为宽 600px，高 800px（3:4 比例）。

你需要发挥你的排版专业知识，生成以下内容的 JSON：
1. \`background\`: 封面的背景配置，可以是纯色或渐变色，也可以带图案（如网格、圆点、噪点）。
2. \`elements\`: 一个数组，包含各种元素（\`TextElement\`, \`StickerElement\`, \`ShapeElement\`），你需要为每个元素指定坐标 (x, y)、尺寸、旋转角度、颜色、阴影等。

排版原则（非常重要）：
- **标题最大化**：核心标题是最关键的，字号要大（如 60~100），居中或靠左对齐，颜色要与背景形成强烈对比。通常在 y: 150~350 之间。如果文字长可以折行处理。
- **层次分明**：副标题字号适中（30~45），可以放在主标题上方或下方；高光/要点可以通过多个带有背景色（\`bg\` 属性）的 TextElement 并排或堆叠展示。
- **色彩美学**：使用高级感配色。如高饱和度的黑黄红（Brutalist）、温暖的日落渐变、马卡龙少女粉、极简的冷灰+克莱因蓝等。
- **防遮挡**：顶部 80px 和 底部 220px 尽量不要放置核心文字，避免被小红书系统 UI 遮挡。
- **元素丰富**：合理使用形状（\`ShapeElement\`）作为文字的衬底或点缀，以及使用 Emoji（\`StickerElement\` 设置 \`isEmoji: true\`）来增加趣味性。

返回的必须是符合特定数据结构的完整排版数据。`;

    const userPrompt = `需要排版的文案内容如下：
---
${draftText}
---
${preferredCategory ? `用户偏好的风格意向：${preferredCategory}` : "请自动根据文案调性选择最合适的风格配色。"}

请务必直接输出排版 JSON 数据，不需要任何额外的推荐理由。`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            background: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING, enum: ["solid", "gradient"] },
                color: { type: Type.STRING, description: "Solid background color (e.g. #FFD700)" },
                gradient: {
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING, enum: ["linear", "radial"] },
                    angle: { type: Type.INTEGER },
                    stops: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          color: { type: Type.STRING },
                          offset: { type: Type.INTEGER }
                        }
                      }
                    }
                  }
                },
                pattern: { type: Type.STRING, enum: ["none", "dots", "grid", "stripes", "noise"] },
                patternOpacity: { type: Type.NUMBER },
                patternColor: { type: Type.STRING }
              }
            },
            elements: {
              type: Type.ARRAY,
              description: "Array of canvas elements (text, sticker, shape)",
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  type: { type: Type.STRING, enum: ["text", "sticker", "shape"] },
                  
                  // For TextElement
                  text: { type: Type.STRING },
                  fontSize: { type: Type.INTEGER },
                  fontFamily: { type: Type.STRING },
                  fontWeight: { type: Type.STRING, enum: ["normal", "medium", "bold", "black"] },
                  color: { type: Type.STRING },
                  textAlign: { type: Type.STRING, enum: ["left", "center", "right"] },
                  letterSpacing: { type: Type.NUMBER },
                  lineHeight: { type: Type.NUMBER },
                  shadow: {
                    type: Type.OBJECT,
                    properties: {
                      type: { type: Type.STRING },
                      color: { type: Type.STRING },
                      x: { type: Type.NUMBER },
                      y: { type: Type.NUMBER },
                      blur: { type: Type.NUMBER }
                    }
                  },
                  stroke: {
                    type: Type.OBJECT,
                    properties: {
                      enabled: { type: Type.BOOLEAN },
                      color: { type: Type.STRING },
                      width: { type: Type.NUMBER }
                    }
                  },
                  bg: {
                    type: Type.OBJECT,
                    properties: {
                      enabled: { type: Type.BOOLEAN },
                      bgStyle: { type: Type.STRING, enum: ["solid", "glass", "outline"] },
                      shape: { type: Type.STRING, enum: ["rectangle", "pill", "oval"] },
                      color: { type: Type.STRING },
                      paddingX: { type: Type.NUMBER },
                      paddingY: { type: Type.NUMBER },
                      borderRadius: { type: Type.NUMBER },
                      borderWidth: { type: Type.NUMBER },
                      borderColor: { type: Type.STRING },
                      skew: { type: Type.NUMBER }
                    }
                  },
                  
                  // For StickerElement
                  src: { type: Type.STRING },
                  isEmoji: { type: Type.BOOLEAN },
                  
                  // For ShapeElement
                  shapeType: { type: Type.STRING, enum: ["rect", "circle", "triangle", "arrow", "line", "badge"] },
                  fill: { type: Type.STRING },
                  strokeWidth: { type: Type.NUMBER },
                  badgeStyle: { type: Type.STRING },
                  badgeText: { type: Type.STRING },
                  badgeTextColor: { type: Type.STRING },
                  
                  // Common
                  x: { type: Type.NUMBER },
                  y: { type: Type.NUMBER },
                  width: { type: Type.NUMBER },
                  height: { type: Type.NUMBER },
                  rotation: { type: Type.NUMBER },
                  opacity: { type: Type.NUMBER }
                },
                required: ["id", "type", "x", "y", "width", "height", "rotation", "opacity"]
              }
            }
          },
          required: ["background", "elements"]
        }
      }
    });

    const resultText = response.text?.trim() || "{}";
    const data = JSON.parse(resultText);

    res.json(data);
  } catch (error: any) {
    console.error("Gemini Cover Generation error:", error);
    res.status(500).json({ 
      error: error.message || "AI 封面生成失败，请检查密钥或稍后重试。" 
    });
  }
});

// 3. Vite development vs Production static routing
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in development mode with Vite HMR middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in production mode serving static dist folder...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express custom server listening on port ${PORT}`);
  });
}

startServer();
