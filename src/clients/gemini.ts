import { GoogleGenerativeAI } from "@google/generative-ai";
import { Question } from "../types";

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is not set");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

const MAX_RETRIES = 3;

/**
 * ノート内容から4択クイズを生成（リトライ機能付き）
 */
export async function generateQuiz(
  noteContent: string,
  questionCount: number = 10
): Promise<Question[]> {
  const prompt = buildPrompt(noteContent, questionCount);

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      return parseQuizResponse(text);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`Attempt ${attempt}/${MAX_RETRIES} failed: ${lastError.message}`);

      if (attempt < MAX_RETRIES) {
        // リトライ前に少し待機
        await sleep(1000 * attempt);
      }
    }
  }

  throw new Error(`Failed to generate quiz after ${MAX_RETRIES} attempts: ${lastError?.message}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * クイズ生成用プロンプトを構築
 */
function buildPrompt(noteContent: string, questionCount: number): string {
  return `
あなたは教育コンテンツの専門家です。

【タスク】
以下のノート内容に基づいて4択問題を${questionCount}問作成してください。

【ノートの分野】
プログラミング・技術系、またはビジネス・マーケティング系の内容です。

【ノート内容】
${noteContent}

【出力形式】
以下のJSON形式で出力してください。JSON以外は出力しないでください。

{
  "questions": [
    {
      "question": "問題文",
      "choices": ["選択肢A", "選択肢B", "選択肢C", "選択肢D"],
      "correctIndex": 0,
      "explanation": "解説（なぜこれが正解か、関連する補足情報）"
    }
  ]
}

【問題作成のガイドライン】
- 重要な概念や実務で使う知識を優先
- 単純な暗記より、理解を問う問題を心がける
- 誤答の選択肢も、よくある誤解や似た概念にする
- 解説は簡潔だが学びになる内容にする
`.trim();
}

/**
 * Geminiのレスポンスからクイズをパース
 */
function parseQuizResponse(text: string): Question[] {
  // JSONブロックを抽出（```json ... ``` または直接JSON）
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) ||
                    text.match(/```\s*([\s\S]*?)\s*```/) ||
                    [null, text];

  const jsonText = jsonMatch[1]?.trim() || text.trim();

  const parsed = JSON.parse(jsonText);

  if (!parsed.questions || !Array.isArray(parsed.questions)) {
    throw new Error("Invalid response format: missing questions array");
  }

  return parsed.questions.map(validateQuestion);
}

/**
 * 問題の形式を検証
 */
function validateQuestion(q: unknown, index: number): Question {
  const question = q as Record<string, unknown>;

  if (typeof question.question !== "string") {
    throw new Error(`Question ${index + 1}: missing question text`);
  }

  if (!Array.isArray(question.choices) || question.choices.length !== 4) {
    throw new Error(`Question ${index + 1}: choices must be an array of 4 items`);
  }

  if (typeof question.correctIndex !== "number" ||
      question.correctIndex < 0 ||
      question.correctIndex > 3) {
    throw new Error(`Question ${index + 1}: correctIndex must be 0-3`);
  }

  if (typeof question.explanation !== "string") {
    throw new Error(`Question ${index + 1}: missing explanation`);
  }

  return {
    question: question.question,
    choices: question.choices as string[],
    correctIndex: question.correctIndex,
    explanation: question.explanation,
  };
}
