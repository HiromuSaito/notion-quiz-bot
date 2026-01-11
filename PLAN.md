# Notion Quiz Bot 実装計画

このドキュメントは実装タスクをGitHub Issue単位で分解したものです。

---

## Phase 1: プロジェクト基盤セットアップ

### Issue #1: プロジェクト初期化
**ラベル**: `setup`

- [ ] `package.json` の作成（依存パッケージ定義）
- [ ] `tsconfig.json` の作成（TypeScript設定）
- [ ] `.gitignore` の作成
- [ ] `.env.example` の作成（環境変数テンプレート）
- [ ] ディレクトリ構造の作成（`src/clients/`, `src/services/`, `src/types/`）

**完了条件**: `npm install` が成功し、TypeScriptのコンパイルが通る

---

### Issue #2: 型定義の作成
**ラベル**: `setup`

- [ ] `src/types/index.ts` に以下の型を定義
  - `NotionNote`: Notionノートの型
  - `Question`: クイズ問題の型
  - `Quiz`: クイズ全体の型

**完了条件**: 型定義ファイルがエラーなくコンパイルできる

---

## Phase 2: 各APIクライアントの実装

### Issue #3: Notion APIクライアントの実装
**ラベル**: `feature`, `notion`

- [ ] `src/clients/notion.ts` の作成
- [ ] Notion APIクライアントの初期化
- [ ] Database Query APIでページ一覧を取得する関数
- [ ] `last_edited_time` でフィルタリング（過去7日間）
- [ ] ページのブロック内容を取得する関数
- [ ] ブロックからテキストを抽出する関数（paragraph, heading, code等に対応）

**完了条件**:
- 環境変数を設定した状態で、実際のNotionデータベースからノート内容を取得できる
- `fetchRecentNotes({ days: 7 })` が動作する

---

### Issue #4: Gemini APIクライアントの実装
**ラベル**: `feature`, `gemini`

- [ ] `src/clients/gemini.ts` の作成
- [ ] Gemini APIクライアントの初期化
- [ ] 問題生成のプロンプト実装
- [ ] JSONレスポンスのパース処理
- [ ] エラーハンドリング（JSON解析失敗時のリトライ等）

**完了条件**:
- サンプルテキストを入力して、正しいJSON形式でクイズが生成される
- `questions` が正しくパースできる

---

### Issue #5: LINE Messaging APIクライアントの実装
**ラベル**: `feature`, `line`

- [ ] `src/clients/line.ts` の作成
- [ ] LINE Messaging APIクライアントの初期化
- [ ] Push Message送信関数の実装
- [ ] クイズを送信用フォーマットに変換する関数
- [ ] 文字数制限対応（LINEは1メッセージ5000文字まで）

**完了条件**:
- 環境変数を設定した状態で、自分のLINEにテストメッセージが届く
- クイズ形式のフォーマットで送信できる

---

## Phase 3: ビジネスロジックと統合

### Issue #6: クイズ生成サービスの実装
**ラベル**: `feature`

- [ ] `src/services/quizGenerator.ts` の作成
- [ ] ノート選択ロジック（ランダム選択）
- [ ] Gemini APIを呼び出してクイズを生成する関数
- [ ] 生成結果のバリデーション

**完了条件**:
- NotionノートからQuiz型のオブジェクトが生成される

---

### Issue #7: メインエントリーポイントの実装
**ラベル**: `feature`

- [ ] `src/index.ts` の作成
- [ ] 全体の処理フローの実装
  1. Notionからノート取得
  2. ランダムに1つ選択
  3. Geminiでクイズ生成
  4. LINEに送信
- [ ] エラーハンドリング（各ステップでの失敗時の処理）
- [ ] ログ出力（どのノートが選ばれたか等）

**完了条件**:
- `npx tsx src/index.ts` を実行すると、LINEにクイズが届く

---

## Phase 4: CI/CD

### Issue #8: GitHub Actionsの設定
**ラベル**: `ci/cd`

- [ ] `.github/workflows/daily_quiz.yml` の作成
- [ ] 毎朝7時（JST）の定期実行設定
- [ ] 手動実行（workflow_dispatch）の設定
- [ ] GitHub Secretsの設定手順をREADMEに記載

**完了条件**:
- GitHub上で手動実行してクイズがLINEに届く
- スケジュール実行が正しく動作する

---

## Phase 5: ドキュメント整備

### Issue #9: READMEの作成
**ラベル**: `documentation`

- [ ] プロジェクト概要
- [ ] セットアップ手順
  - 各APIのアクセストークン取得方法
  - 環境変数の設定方法
  - GitHub Secretsの設定方法
- [ ] ローカルでの実行方法
- [ ] トラブルシューティング

**完了条件**:
- READMEを読むだけで、ゼロからセットアップして動かせる

---

## 依存関係

```
Issue #1 (プロジェクト初期化)
    │
    ├── Issue #2 (型定義)
    │       │
    │       ├── Issue #3 (Notion Client)
    │       ├── Issue #4 (Gemini Client)
    │       └── Issue #5 (LINE Client)
    │               │
    │               └── Issue #6 (クイズ生成サービス)
    │                       │
    │                       └── Issue #7 (メインエントリーポイント)
    │                               │
    │                               └── Issue #8 (GitHub Actions)
    │
    └── Issue #9 (README) ※並行して進められる
```

---

## 推奨実装順序

1. **Issue #1** → **Issue #2**: 基盤を整える
2. **Issue #3**: Notion連携（データソースの確保が最優先）
3. **Issue #4**: Gemini連携（コア機能）
4. **Issue #5**: LINE連携（出力先）
5. **Issue #6** → **Issue #7**: 統合
6. **Issue #8**: 自動化
7. **Issue #9**: ドキュメント（並行可）

---

## 備考

- 各Issueは1〜2時間程度で完了できる粒度を想定
- クライアント実装（#3, #4, #5）は独立しているため並行作業可能
- 環境変数の取得（各APIのトークン発行）は事前準備として別途必要
