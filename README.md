# Notion Quiz Bot

Notionにまとめた学習ノートの内容を定着させるための、自動クイズ配信ボット。

## 概要

- 毎朝自動でNotionから最近のノートを取得
- AIで4択問題を10問生成
- LINEに配信

## アーキテクチャ

```
┌─────────────────────────────────────────────────────────────────┐
│                   GitHub Actions (毎朝7時 JST)                   │
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

## セットアップ

### 1. リポジトリのクローン

```bash
git clone https://github.com/HiromuSaito/notion-quiz-bot.git
cd notion-quiz-bot
npm install
```

### 2. Notion APIの設定

1. [Notion Integrations](https://www.notion.so/my-integrations) にアクセス
2. 「New integration」で新しいインテグレーションを作成
3. 名前を設定（例: `quiz-bot`）
4. 「Internal Integration Secret」をコピー → `NOTION_API_KEY`
5. クイズ対象のNotionデータベースを開く
6. URLから `https://www.notion.so/xxxxx?v=yyyyy` の `xxxxx` 部分をコピー → `NOTION_DATABASE_ID`
7. データベースの右上「...」→「コネクト」→ 作成したIntegrationを追加

### 3. Gemini APIの設定

1. [Google AI Studio](https://aistudio.google.com/app/apikey) にアクセス
2. Googleアカウントでログイン
3. 「Create API key」でAPIキーを作成
4. キーをコピー → `GEMINI_API_KEY`

### 4. LINE Messaging APIの設定

1. [LINE Developers](https://developers.line.biz/console/) にアクセス
2. プロバイダーを作成（または既存のものを選択）
3. 「Messaging API」チャネルを作成
4. チャネル設定 → 「Messaging API設定」タブ
5. 「チャネルアクセストークン（長期）」を発行 → `LINE_CHANNEL_ACCESS_TOKEN`
6. 作成したBotを友だち追加（QRコードから）
7. チャネル設定 → 「チャネル基本設定」タブ
8. 「あなたのユーザーID」をコピー → `LINE_USER_ID`

### 5. 環境変数の設定

ローカル開発用に `.env` ファイルを作成：

```bash
# Notion
NOTION_API_KEY=secret_xxxxx
NOTION_DATABASE_ID=xxxxx

# Gemini
GEMINI_API_KEY=xxxxx

# LINE
LINE_CHANNEL_ACCESS_TOKEN=xxxxx
LINE_USER_ID=Uxxxxx
```

### 6. GitHub Secretsの設定（自動実行用）

リポジトリの **Settings > Secrets and variables > Actions** で以下を設定：

| Secret名 | 値 |
|----------|-----|
| `NOTION_API_KEY` | Notion Integration Secret |
| `NOTION_DATABASE_ID` | NotionデータベースID |
| `GEMINI_API_KEY` | Gemini APIキー |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINEチャネルアクセストークン |
| `LINE_USER_ID` | LINEユーザーID |

## 実行方法

### ローカル実行

```bash
npm run start
```

### GitHub Actionsで手動実行

1. GitHubリポジトリの「Actions」タブを開く
2. 「Daily Quiz」ワークフローを選択
3. 「Run workflow」をクリック

### 自動実行

毎朝7時（JST）に自動でクイズが配信されます。

## Notionの構成

- データベース形式でノートを管理
- 各ページは月ごと（例: `2026-01`）
- ページ内はheading_1で日付（`YYYY-MM-DD`）を見出しにして、その下に学習内容を記載

```
2026-01（ページ）
├── 2026-01-10（heading_1）
│   └── 学習内容...
├── 2026-01-11（heading_1）
│   └── 学習内容...
```

## トラブルシューティング

### 「API token is invalid」エラー

- `NOTION_API_KEY`が正しく設定されているか確認
- Notionのデータベースにインテグレーションが接続されているか確認

### 「ページが見つかりません」エラー

- ページタイトルが`YYYY-MM`形式になっているか確認（例: `2026-01`）
- 対象期間内に日付見出し（`YYYY-MM-DD`形式）があるか確認

### 「クイズの問題がありません」エラー

- 対象期間のノートに十分な内容があるか確認
- Gemini APIのレート制限に達していないか確認

### LINE送信エラー

- `LINE_CHANNEL_ACCESS_TOKEN`が正しく設定されているか確認
- `LINE_USER_ID`が正しいか確認
- BotがLINE友だちに追加されているか確認

## ライセンス

MIT
