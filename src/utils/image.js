import { MAX_IMAGE_ATTACHMENTS } from "../prompt-messages/prompts.js";

export function getImageAttachments(message) {
  if (!message.attachments?.size) return [];

  return [...message.attachments.values()]
    .filter((attachment) => {
      const type = attachment.contentType || "";
      if (type.startsWith("image/")) return true;
      return /\.(png|jpe?g|gif|webp)$/i.test(attachment.name || "");
    })
    .slice(0, MAX_IMAGE_ATTACHMENTS)
    .map((attachment) => attachment.url);
}

export function isImageRequest(question) {
  if (!question) return false;

  const patterns = [
    /\b(image|picture|photo|img|generate image|create image|draw|illustrat(e|ion)|render|art of|make an image|ai image|portrait|landscape)\b/i,
  ];

  return patterns.some((p) => p.test(question));
}
