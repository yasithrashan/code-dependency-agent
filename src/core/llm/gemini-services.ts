import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AnalysisResult } from "../../types";

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  throw new Error("GEMINI_API_KEY is not set in the environment variables.");
}

const genAI = new GoogleGenerativeAI(API_KEY);

const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
})

export async function askGemini(question: string, analysis: AnalysisResult): Promise<string> {
  const prompt = `
You are analyzing a TypeScript/JavaScript codebase. Here's what I found:

**Files analyzed:** ${analysis.summary.totalFiles}
**Dependencies:** ${analysis.summary.totalDependencies}

**Key dependencies:**
${analysis.dependencies.slice(0, 15).map(dep => {
  const typeInfo = dep.isTypeOnly ? ' (type-only)' : '';
  const names = dep.names.length > 0 ? ` [${dep.names.join(', ')}]` : '';
  return `- ${dep.from} → ${dep.to}${names}${typeInfo}`;
}).join('\n')}

**Files with most connections:**
${analysis.files
  .sort((a, b) => (b.imports.length + b.exports.length) - (a.imports.length + a.exports.length))
  .slice(0, 8)
  .map(f => `- ${f.path} (${f.imports.length} imports, ${f.exports.length} exports)`)
  .join('\n')}

**Export patterns:**
${Object.entries(
  analysis.files
    .flatMap(f => f.exports)
    .reduce((acc, exp) => {
      acc[exp.type] = (acc[exp.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
).map(([type, count]) => `- ${type}: ${count}`).join('\n')}

**Import patterns:**
${Object.entries(
  analysis.files
    .flatMap(f => f.imports)
    .reduce((acc, imp) => {
      acc[imp.type] = (acc[imp.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
).map(([type, count]) => `- ${type}: ${count}`).join('\n')}

**Question:** ${question}

Please answer the question based on the codebase analysis above. Be specific and reference actual file names when possible.
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Gemini API error: ${error.message}`);
    } else {
      throw new Error(`Gemini API error: ${String(error)}`);
    }
  }
}