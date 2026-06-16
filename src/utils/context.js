import { appendUserTurn, getUserContext } from "./chat-context.js";

export async function buildConversation(
  message,
  question,
  imageAttachments = [],
) {
  const conversation = [];

  const existingMessages = getUserContext(message.author.id);
  if (Array.isArray(existingMessages) && existingMessages.length) {
    conversation.push(...existingMessages);
  }

  const replyContext = await getReplyContext(message);
  if (replyContext) {
    conversation.push(replyContext);
  }

  const promptText = `Answer the following question **only if it is a safe, appropriate question**.\n${
    question || "Describe and analyze the attached image(s)."
  }`;

  if (imageAttachments.length) {
    conversation.push({
      role: "user",
      content: [
        { type: "text", text: promptText },
        ...imageAttachments.map((url) => ({
          type: "image",
          image: new URL(url),
        })),
      ],
    });
  } else {
    conversation.push({ role: "user", content: promptText });
  }

  return conversation;
}

export async function getReplyContext(message) {
  if (!message.reference?.messageId) return null;

  try {
    const repliedMessage = await message.channel.messages.fetch(
      message.reference.messageId,
    );
    if (!repliedMessage.author?.bot || !repliedMessage.content) return null;
    return { role: "assistant", content: repliedMessage.content };
  } catch {
    return null;
  }
}

export function updateUserContext(userId, question, answer) {
  appendUserTurn(userId, question, answer);
}
