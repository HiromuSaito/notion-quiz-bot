import "dotenv/config";
import { fetchRecentNotes } from "./clients/notion";
import { generateQuiz } from "./clients/gemini";

async function main() {
  console.log("Notion Quiz Bot - テスト実行");
  console.log("================================\n");

  // 1. 過去7日間に更新されたノートを取得
  console.log("過去7日間のノートを取得中...\n");
  const notes = await fetchRecentNotes({ days: 7 });

  console.log(`取得件数: ${notes.length}件\n`);

  if (notes.length === 0) {
    console.log("ノートが見つかりませんでした。");
    return;
  }

  // 2. ランダムに1つ選択
  const targetNote = notes[Math.floor(Math.random() * notes.length)];
  console.log(`選択されたノート: ${targetNote.title}`);
  console.log(`内容:\n${targetNote.content.slice(0, 300)}...\n`);

  // 3. Gemini APIでクイズ生成（テスト用に3問）
  console.log("クイズを生成中...\n");
  const questions = await generateQuiz(targetNote.content, 3);

  console.log(`生成された問題数: ${questions.length}問\n`);

  // 4. クイズを表示
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
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
}

main().catch(console.error);
