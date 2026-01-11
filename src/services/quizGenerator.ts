import { fetchContentByDateRange } from "../clients/notion";
import { generateQuiz } from "../clients/gemini";
import { Quiz } from "../types";

export interface GenerateQuizOptions {
  days?: number;
  questionCount?: number;
}

const DEFAULT_DAYS = 7;
const DEFAULT_QUESTION_COUNT = 10;

/**
 * 当日を含む過去N日間のノート内容からクイズを生成
 */
export async function generateQuizFromRecentNotes(
  options: GenerateQuizOptions = {}
): Promise<Quiz> {
  const { days = DEFAULT_DAYS, questionCount = DEFAULT_QUESTION_COUNT } = options;

  // 今日の日付
  const today = new Date();

  // 開始日を計算（今日からdays日前）
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - days + 1);

  console.log(`対象期間: ${formatDate(startDate)} 〜 ${formatDate(today)}`);

  // 指定期間のコンテンツを取得
  const content = await fetchContentByDateRange(startDate, today);

  if (!content || content.trim().length === 0) {
    throw new Error(
      `対象期間（${formatDate(startDate)} 〜 ${formatDate(today)}）のノートが見つかりませんでした`
    );
  }

  console.log(`取得したコンテンツ: ${content.length}文字`);

  // クイズを生成
  const questions = await generateQuiz(content, questionCount);

  const quiz: Quiz = {
    noteTitle: `${formatDate(startDate)} 〜 ${formatDate(today)} の学習内容`,
    questions,
  };

  // バリデーション
  validateQuiz(quiz);

  return quiz;
}

/**
 * 日付をYYYY-MM-DD形式にフォーマット
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * クイズのバリデーション
 */
function validateQuiz(quiz: Quiz): void {
  if (!quiz.noteTitle) {
    throw new Error("クイズのタイトルがありません");
  }

  if (!quiz.questions || quiz.questions.length === 0) {
    throw new Error("クイズの問題がありません");
  }

  for (let i = 0; i < quiz.questions.length; i++) {
    const q = quiz.questions[i];

    if (!q.question) {
      throw new Error(`問題${i + 1}: 問題文がありません`);
    }

    if (!q.choices || q.choices.length !== 4) {
      throw new Error(`問題${i + 1}: 選択肢は4つ必要です`);
    }

    if (q.correctIndex < 0 || q.correctIndex > 3) {
      throw new Error(`問題${i + 1}: 正解インデックスが不正です`);
    }

    if (!q.explanation) {
      throw new Error(`問題${i + 1}: 解説がありません`);
    }
  }
}
