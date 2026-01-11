import { messagingApi } from "@line/bot-sdk";
import { Quiz, Question } from "../types";

if (!process.env.LINE_CHANNEL_ACCESS_TOKEN) {
  throw new Error("LINE_CHANNEL_ACCESS_TOKEN is not set");
}

if (!process.env.LINE_USER_ID) {
  throw new Error("LINE_USER_ID is not set");
}

const client = new messagingApi.MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
});

const userId = process.env.LINE_USER_ID;

const MAX_MESSAGE_LENGTH = 5000;

/**
 * クイズをLINEに送信
 */
export async function sendQuizToLine(quiz: Quiz): Promise<void> {
  const messages = formatQuizMessages(quiz);

  for (const text of messages) {
    await client.pushMessage({
      to: userId,
      messages: [{ type: "text", text }],
    });
  }
}

/**
 * シンプルなテキストメッセージを送信
 */
export async function sendTextToLine(text: string): Promise<void> {
  await client.pushMessage({
    to: userId,
    messages: [{ type: "text", text }],
  });
}

/**
 * クイズを送信用フォーマットに変換（文字数制限対応）
 */
function formatQuizMessages(quiz: Quiz): string[] {
  const header = `📚 今日のクイズ
━━━━━━━━━━━━━━━
📖 テーマ: ${quiz.noteTitle}
━━━━━━━━━━━━━━━`;

  const questionSection = formatQuestionSection(quiz.questions);
  const answerSection = formatAnswerSection(quiz.questions);

  const fullMessage = `${header}\n\n${questionSection}\n\n━━━━━━━━━━━━━━━\n【解答】\n${answerSection}`;

  // 文字数制限を超える場合は分割
  if (fullMessage.length <= MAX_MESSAGE_LENGTH) {
    return [fullMessage];
  }

  // 問題と解答を分けて送信
  const questionMessage = `${header}\n\n${questionSection}`;
  const answerMessage = `📝 【解答】\n━━━━━━━━━━━━━━━\n${answerSection}`;

  const messages: string[] = [];

  if (questionMessage.length <= MAX_MESSAGE_LENGTH) {
    messages.push(questionMessage);
  } else {
    // 問題も分割が必要な場合
    messages.push(...splitQuestionMessage(header, quiz.questions));
  }

  if (answerMessage.length <= MAX_MESSAGE_LENGTH) {
    messages.push(answerMessage);
  } else {
    // 解答も分割が必要な場合
    messages.push(...splitAnswerMessage(quiz.questions));
  }

  return messages;
}

/**
 * 問題セクションをフォーマット
 */
function formatQuestionSection(questions: Question[]): string {
  return questions
    .map((q, i) => {
      const choiceLabels = ["A", "B", "C", "D"];
      const choices = q.choices
        .map((c, j) => `${choiceLabels[j]}) ${c}`)
        .join("\n");
      return `Q${i + 1}. ${q.question}\n\n${choices}`;
    })
    .join("\n\n━━━━━━━━━━━━━━━\n\n");
}

/**
 * 解答セクションをフォーマット
 */
function formatAnswerSection(questions: Question[]): string {
  const choiceLabels = ["A", "B", "C", "D"];
  return questions
    .map((q, i) => {
      const correctLetter = choiceLabels[q.correctIndex];
      return `Q${i + 1}: ${correctLetter}\n💡 ${q.explanation}`;
    })
    .join("\n\n");
}

/**
 * 問題メッセージを分割
 */
function splitQuestionMessage(header: string, questions: Question[]): string[] {
  const messages: string[] = [];
  let currentMessage = header + "\n\n";
  const choiceLabels = ["A", "B", "C", "D"];

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const choices = q.choices
      .map((c, j) => `${choiceLabels[j]}) ${c}`)
      .join("\n");
    const questionText = `Q${i + 1}. ${q.question}\n\n${choices}\n\n━━━━━━━━━━━━━━━\n\n`;

    if (currentMessage.length + questionText.length > MAX_MESSAGE_LENGTH) {
      messages.push(currentMessage.trim());
      currentMessage = questionText;
    } else {
      currentMessage += questionText;
    }
  }

  if (currentMessage.trim()) {
    messages.push(currentMessage.trim());
  }

  return messages;
}

/**
 * 解答メッセージを分割
 */
function splitAnswerMessage(questions: Question[]): string[] {
  const messages: string[] = [];
  let currentMessage = "📝 【解答】\n━━━━━━━━━━━━━━━\n";
  const choiceLabels = ["A", "B", "C", "D"];

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const correctLetter = choiceLabels[q.correctIndex];
    const answerText = `Q${i + 1}: ${correctLetter}\n💡 ${q.explanation}\n\n`;

    if (currentMessage.length + answerText.length > MAX_MESSAGE_LENGTH) {
      messages.push(currentMessage.trim());
      currentMessage = answerText;
    } else {
      currentMessage += answerText;
    }
  }

  if (currentMessage.trim()) {
    messages.push(currentMessage.trim());
  }

  return messages;
}
