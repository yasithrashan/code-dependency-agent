import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AnalysisResult } from "../../../types.ts";

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  throw new Error("Please set GEMINI_API_KEY in your environment");
}

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

export async function askGemini(question: string, analysis: AnalysisResult): Promise<string> {
  const prompt = `
You are analyzing a TypeScript/JavaScript codebase.

**Codebase Summary:**
- Files: ${analysis.summary.totalFiles}
- Dependencies: ${analysis.summary.totalDependencies}

**Key Dependencies:**
${analysis.dependencies.slice(0, 10).map(dep =>
  `- ${dep.from} → ${dep.to}`
).join('\n')}

**Main Files:**
${analysis.files
  .sort((a, b) => (b.imports.length + b.exports.length) - (a.imports.length + a.exports.length))
  .slice(0, 8)
  .map(f => `- ${f.path} (${f.imports.length} imports, ${f.exports.length} exports)`)
  .join('\n')}

**Question:** ${question}

Please answer based on the codebase analysis above. Be specific and reference actual files.
  `;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Gemini API error: ${error.message}`);
    } else {
      throw new Error(`Gemini API error: ${String(error)}`);
    }
  }
}