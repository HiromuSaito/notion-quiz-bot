import "dotenv/config";
import { fetchRecentNotes } from "./clients/notion";

async function main() {
  console.log("Notion Quiz Bot - テスト実行");
  console.log("================================\n");

  // 過去7日間に更新されたノートを取得
  console.log("過去7日間のノートを取得中...\n");
  const notes = await fetchRecentNotes({ days: 7 });

  console.log(`取得件数: ${notes.length}件\n`);

  for (const note of notes) {
    console.log("--------------------------------");
    console.log(`タイトル: ${note.title}`);
    console.log(`ID: ${note.id}`);
    console.log(`最終更新: ${note.lastEdited.toISOString()}`);
    console.log(`内容:\n${note.content.slice(0, 500)}${note.content.length > 500 ? "..." : ""}`);
    console.log("--------------------------------\n");
  }
}

main().catch(console.error);
