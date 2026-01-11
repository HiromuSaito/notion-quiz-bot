import { Client } from "@notionhq/client";
import {
  BlockObjectResponse,
  PageObjectResponse,
  RichTextItemResponse,
} from "@notionhq/client/build/src/api-endpoints";
import { NotionNote } from "../types";

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

const databaseId = process.env.NOTION_DATABASE_ID!;

/**
 * 過去N日間に更新されたノートを取得
 */
export async function fetchRecentNotes(options: {
  days: number;
}): Promise<NotionNote[]> {
  const { days } = options;

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const response = await notion.databases.query({
    database_id: databaseId,
    filter: {
      timestamp: "last_edited_time",
      last_edited_time: {
        on_or_after: cutoffDate.toISOString(),
      },
    },
    sorts: [
      {
        timestamp: "last_edited_time",
        direction: "descending",
      },
    ],
  });

  const notes: NotionNote[] = [];

  for (const page of response.results) {
    if (!isFullPage(page)) continue;

    const title = extractPageTitle(page);
    const content = await fetchPageContent(page.id);

    notes.push({
      id: page.id,
      title,
      content,
      lastEdited: new Date(page.last_edited_time),
    });
  }

  return notes;
}

/**
 * ページがフルページかどうかを判定
 */
function isFullPage(page: unknown): page is PageObjectResponse {
  return (page as PageObjectResponse).object === "page" && "properties" in (page as PageObjectResponse);
}

/**
 * ページタイトルを抽出
 */
function extractPageTitle(page: PageObjectResponse): string {
  const properties = page.properties;

  for (const key of Object.keys(properties)) {
    const prop = properties[key];
    if (prop.type === "title" && prop.title.length > 0) {
      return prop.title.map((t) => t.plain_text).join("");
    }
  }

  return "無題";
}

/**
 * ページ内のブロックからコンテンツを取得
 */
async function fetchPageContent(pageId: string): Promise<string> {
  const blocks = await fetchAllBlocks(pageId);
  return extractTextFromBlocks(blocks);
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
