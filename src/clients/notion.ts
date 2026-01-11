import { Client } from "@notionhq/client";
import {
  BlockObjectResponse,
  PageObjectResponse,
  RichTextItemResponse,
} from "@notionhq/client/build/src/api-endpoints";

if (!process.env.NOTION_API_KEY) {
  throw new Error("NOTION_API_KEY is not set");
}

if (!process.env.NOTION_DATABASE_ID) {
  throw new Error("NOTION_DATABASE_ID is not set");
}

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

const databaseId = process.env.NOTION_DATABASE_ID;

/**
 * 指定した日付範囲のコンテンツを取得
 * @param startDate 開始日（この日を含む）
 * @param endDate 終了日（この日を含む）
 */
export async function fetchContentByDateRange(
  startDate: Date,
  endDate: Date
): Promise<string> {
  // 対象となる月のページタイトルを取得（YYYY-MM形式）
  const monthTitles = getMonthTitlesBetween(startDate, endDate);

  const allContent: string[] = [];

  for (const monthTitle of monthTitles) {
    const page = await fetchPageByTitle(monthTitle);
    if (!page) {
      console.log(`ページが見つかりません: ${monthTitle}`);
      continue;
    }

    const content = await fetchContentFromPageByDateRange(page.id, startDate, endDate);
    if (content) {
      allContent.push(content);
    }
  }

  return allContent.join("\n\n");
}

/**
 * 開始日と終了日の間の月タイトル（YYYY-MM形式）を取得
 */
function getMonthTitlesBetween(startDate: Date, endDate: Date): string[] {
  const titles: string[] = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    const year = current.getFullYear();
    const month = current.getMonth() + 1;
    const title = `${year}-${String(month).padStart(2, "0")}`;

    if (!titles.includes(title)) {
      titles.push(title);
    }

    // 次の月へ
    current.setMonth(current.getMonth() + 1);
    current.setDate(1);
  }

  return titles;
}

/**
 * タイトルでページを検索
 */
async function fetchPageByTitle(title: string): Promise<PageObjectResponse | null> {
  const response = await notion.databases.query({
    database_id: databaseId,
    filter: {
      property: "Name",
      title: {
        equals: title,
      },
    },
  });

  if (response.results.length === 0) {
    return null;
  }

  const page = response.results[0];
  if (!isFullPage(page)) {
    return null;
  }

  return page;
}

/**
 * ページ内の日付見出しから指定範囲のコンテンツを取得
 */
async function fetchContentFromPageByDateRange(
  pageId: string,
  startDate: Date,
  endDate: Date
): Promise<string> {
  const blocks = await fetchTopLevelBlocks(pageId);
  const contentParts: string[] = [];

  for (const block of blocks) {
    // heading_1ブロックから日付を抽出
    if (block.type === "heading_1") {
      const headingText = richTextToPlainText(block.heading_1.rich_text);
      const date = parseDateFromHeading(headingText);

      if (date && isDateInRange(date, startDate, endDate)) {
        // 見出しテキストを追加
        contentParts.push(`# ${headingText}`);

        // 子ブロックがある場合は取得
        if (block.has_children) {
          const children = await fetchAllBlocks(block.id);
          const childContent = extractTextFromBlocks(children);
          if (childContent) {
            contentParts.push(childContent);
          }
        }
      }
    }
  }

  return contentParts.join("\n\n");
}

/**
 * トップレベルのブロックのみを取得（子ブロックは取得しない）
 */
async function fetchTopLevelBlocks(blockId: string): Promise<BlockObjectResponse[]> {
  const blocks: BlockObjectResponse[] = [];

  let cursor: string | undefined;
  do {
    const response = await notion.blocks.children.list({
      block_id: blockId,
      start_cursor: cursor,
    });

    for (const block of response.results) {
      if (!isFullBlock(block)) continue;
      blocks.push(block);
    }

    cursor = response.has_more ? response.next_cursor ?? undefined : undefined;
  } while (cursor);

  return blocks;
}

/**
 * 見出しテキストから日付をパース（YYYY-MM-DD形式）
 */
function parseDateFromHeading(text: string): Date | null {
  // YYYY-MM-DD形式にマッチ
  const match = text.match(/(\d{4}-\d{2}-\d{2})/);
  if (!match) {
    return null;
  }

  const date = new Date(match[1]);
  if (isNaN(date.getTime())) {
    return null;
  }

  return date;
}

/**
 * 日付が範囲内かどうかを判定
 */
function isDateInRange(date: Date, startDate: Date, endDate: Date): boolean {
  const d = normalizeDate(date);
  const start = normalizeDate(startDate);
  const end = normalizeDate(endDate);

  return d >= start && d <= end;
}

/**
 * 日付を正規化（時刻部分を除去）
 */
function normalizeDate(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/**
 * ページがフルページかどうかを判定
 */
function isFullPage(page: unknown): page is PageObjectResponse {
  return (page as PageObjectResponse).object === "page" && "properties" in (page as PageObjectResponse);
}

/**
 * ブロックを再帰的に取得（子ブロック含む）
 */
async function fetchAllBlocks(blockId: string): Promise<BlockObjectResponse[]> {
  const blocks: BlockObjectResponse[] = [];

  let cursor: string | undefined;
  do {
    const response = await notion.blocks.children.list({
      block_id: blockId,
      start_cursor: cursor,
    });

    for (const block of response.results) {
      if (!isFullBlock(block)) continue;

      blocks.push(block);

      // 子ブロックがある場合は再帰的に取得
      if (block.has_children) {
        const children = await fetchAllBlocks(block.id);
        blocks.push(...children);
      }
    }

    cursor = response.has_more ? response.next_cursor ?? undefined : undefined;
  } while (cursor);

  return blocks;
}

/**
 * ブロックがフルブロックかどうかを判定
 */
function isFullBlock(block: unknown): block is BlockObjectResponse {
  return (block as BlockObjectResponse).object === "block" && "type" in (block as BlockObjectResponse);
}

/**
 * ブロックからテキストを抽出
 */
function extractTextFromBlocks(blocks: BlockObjectResponse[]): string {
  const lines: string[] = [];

  for (const block of blocks) {
    const text = extractTextFromBlock(block);
    if (text) {
      lines.push(text);
    }
  }

  return lines.join("\n");
}

/**
 * 各ブロックタイプからテキストを抽出
 */
function extractTextFromBlock(block: BlockObjectResponse): string | null {
  switch (block.type) {
    case "paragraph":
      return richTextToPlainText(block.paragraph.rich_text);

    case "heading_1":
      return `# ${richTextToPlainText(block.heading_1.rich_text)}`;

    case "heading_2":
      return `## ${richTextToPlainText(block.heading_2.rich_text)}`;

    case "heading_3":
      return `### ${richTextToPlainText(block.heading_3.rich_text)}`;

    case "bulleted_list_item":
      return `- ${richTextToPlainText(block.bulleted_list_item.rich_text)}`;

    case "numbered_list_item":
      return `1. ${richTextToPlainText(block.numbered_list_item.rich_text)}`;

    case "code":
      return `\`\`\`${block.code.language}\n${richTextToPlainText(block.code.rich_text)}\n\`\`\``;

    case "quote":
      return `> ${richTextToPlainText(block.quote.rich_text)}`;

    case "callout":
      return richTextToPlainText(block.callout.rich_text);

    case "toggle":
      return richTextToPlainText(block.toggle.rich_text);

    case "to_do":
      const checked = block.to_do.checked ? "[x]" : "[ ]";
      return `${checked} ${richTextToPlainText(block.to_do.rich_text)}`;

    case "divider":
      return "---";

    default:
      return null;
  }
}

/**
 * RichTextを平文に変換
 */
function richTextToPlainText(richText: RichTextItemResponse[]): string {
  return richText.map((t) => t.plain_text).join("");
}
