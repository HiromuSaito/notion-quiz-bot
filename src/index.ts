import "dotenv/config";
import { generateQuizFromRecentNotes } from "./services/quizGenerator";
import { sendQuizToLine } from "./clients/line";

async function main() {
  const startTime = Date.now();
  console.log("=====================================");
  console.log("Notion Quiz Bot");
  console.log(`実行開始: ${new Date().toLocaleString("ja-JP")}`);
  console.log("=====================================\n");

  try {
    // 1. クイズを生成
    console.log("[1/2] クイズを生成中...");
    const quiz = await generateQuizFromRecentNotes({
      days: 7,
      questionCount: 10,
    });

    console.log(`  ✓ テーマ: ${quiz.noteTitle}`);
    console.log(`  ✓ 生成された問題数: ${quiz.questions.length}問\n`);

    // クイズ内容をコンソールに表示（デバッグ用）
    console.log("--- 生成されたクイズ ---");
    for (let i = 0; i < quiz.questions.length; i++) {
      const q = quiz.questions[i];
      console.log(`Q${i + 1}. ${q.question}`);
      console.log(`  A) ${q.choices[0]}`);
      console.log(`  B) ${q.choices[1]}`);
      console.log(`  C) ${q.choices[2]}`);
      console.log(`  D) ${q.choices[3]}`);
      console.log(`  正解: ${["A", "B", "C", "D"][q.correctIndex]}`);
      console.log("");
    }
    console.log("------------------------\n");

    // 2. LINEに送信
    console.log("[2/2] LINEに送信中...");
    await sendQuizToLine(quiz);
    console.log("  ✓ 送信完了\n");

    // 完了
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log("=====================================");
    console.log("処理完了");
    console.log(`所要時間: ${elapsed}秒`);
    console.log("=====================================");

  } catch (error) {
    // エラーハンドリング
    console.error("\n=====================================");
    console.error("エラーが発生しました");
    console.error("=====================================");

    if (error instanceof Error) {
      console.error(`メッセージ: ${error.message}`);
      if (error.stack) {
        console.error(`スタックトレース:\n${error.stack}`);
      }
    } else {
      console.error(error);
    }

    process.exit(1);
  }
}

main();
