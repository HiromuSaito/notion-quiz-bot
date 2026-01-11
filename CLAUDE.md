# Notion Quiz Bot - 実装仕様書

## 概要

Notionにまとめた学習ノートの内容を定着させるための、自動クイズ配信ボット。

## 背景・課題

- Notionに仕事やプライベートで学んだことをまとめている
- 書くだけで満足してしまい、知識として定着していない
- 「思い出す」プロセスを通じて知識を定着させたい

## 解決策

毎朝自動で以下を実行：
1. Notionから最近のノートを取得
2. AIで4択問題を10問生成
3. LINEに配信

---

## 技術選定

### 言語・ランタイム
- **TypeScript** + Node.js

### API
| 用途 | サービス | 理由 |
|------|---------|------|
| ノート取得 | Notion API | - |
| 問題生成 | **Gemini API (2.5 Flash)** | 無料枠あり |
| 配信 | LINE Messaging API | 普段使いのLINE、後で双方向対応も可能 |

### インフラ
- **GitHub Actions** で日次実行（毎朝7時 JST）または手動実行

---

## コスト

| 項目 | 費用 |
|------|------|
| Gemini API | 無料（1,000リクエスト/日まで無料） |
| LINE Messaging API | 無料（Push API、月200通まで無料） |
| GitHub Actions | 無料（パブリックリポジトリ or 月2,000分まで無料） |
| **合計** | **$0** |

---

## アーキテクチャ

```
┌─────────────────────────────────────────────────────────────────┐
│                   GitHub Actions (毎朝7時 JST)                   │
│                   cron: '0 22 * * *' (UTC)                      │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                       TypeScript                                 │
│                                                                  │
│  ┌──────────┐    ┌──────────────────┐    ┌──────────┐          │
│  │  Notion  │ -> │  Gemini API      │ -> │   LINE   │          │
│  │  Client  │    │  (問題生成)       │    │  Sender  │          │
│  └──────────┘    └──────────────────┘    └──────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 処理フロー

```typescript
async function main() {
  // 1. Notionから最近更新されたノートを取得（過去7日間）
  const notes = await fetchRecentNotes({ days: 7 });
  
  // 2. ランダムに1つ選択
  const targetNote = notes[Math.floor(Math.random() * notes.length)];
  
  // 3. Gemini APIで問題生成
  //    - ノート内容から4択問題を10問生成
  const quiz = await generateQuiz(targetNote.content);
  
  // 4. LINEに送信
  await sendToLine(quiz);
}
```

---

## ディレクトリ構成

```
notion-quiz-bot/
├── .github/
│   └── workflows/
│       └── daily_quiz.yml      # GitHub Actions定義
├── src/
│   ├── index.ts                # エントリーポイント
│   ├── clients/
│   │   ├── notion.ts           # Notion APIクライアント
│   │   ├── gemini.ts           # Gemini APIクライアント
│   │   └── line.ts             # LINE送信クライアント
│   ├── services/
│   │   └── quizGenerator.ts    # 問題生成ロジック
│   └── types/
│       └── index.ts            # 型定義
├── package.json
├── tsconfig.json
└── README.md
```

---

## 型定義

```typescript
// src/types/index.ts

export interface NotionNote {
  id: string;
  title: string;
  content: string;
  lastEdited: Date;
}

export interface Question {
  question: string;
  choices: string[];      // 4つの選択肢
  correctIndex: number;   // 正解のインデックス (0-3)
  explanation: string;    // 解説
}

export interface Quiz {
  noteTitle: string;
  questions: Question[];
}
```

---

## 環境変数

```bash
# .env（ローカル開発用）
# GitHub Actionsでは Secrets に設定

# Notion
NOTION_API_KEY=secret_xxxxx
NOTION_DATABASE_ID=xxxxx           # ノートが格納されているデータベースID

# Gemini
GEMINI_API_KEY=xxxxx

# LINE
LINE_CHANNEL_ACCESS_TOKEN=xxxxx
LINE_USER_ID=Uxxxxx                # 自分のLINE User ID
```

---

## 依存パッケージ

```json
{
  "dependencies": {
    "@notionhq/client": "^2.2.0",
    "@google/generative-ai": "^0.21.0",
    "@line/bot-sdk": "^9.0.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "tsx": "^4.0.0",
    "@types/node": "^20.0.0"
  }
}
```

---

## Gemini APIプロンプト設計

```typescript
const prompt = `
あなたは教育コンテンツの専門家です。

【タスク】
以下のノート内容に基づいて4択問題を10問作成してください。

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
`;
```

---

## LINE送信フォーマット

```
📚 今日のクイズ
━━━━━━━━━━━━━━━
📖 テーマ: ${noteTitle}
━━━━━━━━━━━━━━━

Q1. ${question}

A) ${choices[0]}
B) ${choices[1]}
C) ${choices[2]}
D) ${choices[3]}

━━━━━━━━━━━━━━━
【解答】
Q1: ${correctLetter}
💡 ${explanation}

━━━━━━━━━━━━━━━
...（Q2〜Q10も同様）
```

---

## GitHub Actions設定

```yaml
# .github/workflows/daily_quiz.yml
name: Daily Quiz

on:
  schedule:
    - cron: '0 22 * * *'  # UTC 22:00 = JST 07:00
  workflow_dispatch:       # 手動実行も可能

jobs:
  send-quiz:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run quiz bot
        run: npx tsx src/index.ts
        env:
          NOTION_API_KEY: ${{ secrets.NOTION_API_KEY }}
          NOTION_DATABASE_ID: ${{ secrets.NOTION_DATABASE_ID }}
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
          LINE_CHANNEL_ACCESS_TOKEN: ${{ secrets.LINE_CHANNEL_ACCESS_TOKEN }}
          LINE_USER_ID: ${{ secrets.LINE_USER_ID }}
```

---

## Notionの構成について

ユーザーのノートは**データベース形式**で管理。月ごとにページを作成する運用。

### データベース構成
- 1つのデータベースに全ノートを格納
- 各ページ = 1つの学習ノート
- 月ごとにページを作成（例: 「2025年1月」「2025年2月」など）

### 取得方法
- Database Query APIでページ一覧を取得
- `last_edited_time` でフィルタリング（過去7日間）
- ページ内容は Blocks API で取得

### 注意点
- データベースのプロパティ（タイトル等）も取得可能
- ブロックの種類（paragraph, heading, code, etc.）に応じてテキスト抽出

---

## 実装の優先順位（MVP）

1. **Notion Client** - ページ取得が動くことを確認
2. **Gemini Client** - プロンプトで問題生成が動くことを確認
3. **LINE Client** - メッセージ送信が動くことを確認
4. **統合** - 全体を繋げる
5. **GitHub Actions** - 自動実行の設定

---

## 将来の拡張（Phase 2以降）

- [ ] ファクトチェック機能（Web検索でノート内容を検証）
- [ ] 双方向対応（LINEで回答を送ると正誤判定）
- [ ] 回答記録の保存（正答率の追跡）
- [ ] 他の問題形式（○×、穴埋め、自由記述）
- [ ] 間違えた問題の復習機能
- [ ] 特定のタグやカテゴリのノートを指定して出題

---

## 参考リンク

- [Notion API Documentation](https://developers.notion.com/)
- [Google AI for Developers - Gemini API](https://ai.google.dev/)
- [LINE Messaging API](https://developers.line.biz/ja/docs/messaging-api/)
