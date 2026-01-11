import "dotenv/config";
import { generateQuizFromRecentNotes } from "./services/quizGenerator";
import { sendQuizToLine } from "./clients/line";

async function main() {
  console.log("Notion Quiz Bot - テスト実行");
  console.log("================================\n");

  // 1. 最近のノートからクイズを生成（テスト用に3問）
  console.log("クイズを生成中...\n");
  const quiz = await generateQuizFromRecentNotes({
    days: 7,
    questionCount: 3,
  });

  console.log(`テーマ: ${quiz.noteTitle}`);
  console.log(`生成された問題数: ${quiz.questions.length}問\n`);

  // 2. クイズをコンソールに表示
  for (let i = 0; i < quiz.questions.length; i++) {
    const q = quiz.questions[i];
    console.log("--------------------------------");
    console.log(`Q${i + 1}. ${q.question}\n`);
    console.log(`  A) ${q.choices[0]}`);
    console.log(`  B) ${q.choices[1]}`);
    console.log(`  C) ${q.choices[2]}`);
    console.log(`  D) ${q.choices[3]}`);
    console.log(`\n  正解: ${["A", "B", "C", "D"][q.correctIndex]}`);
    console.log(`  解説: ${q.explanation}`);
    console.log("--------------------------------\n");
  }

  // 3. LINEに送信
  console.log("LINEに送信中...\n");
  await sendQuizToLine(quiz);

  console.log("送信完了！");
}

main().catch(console.error);
