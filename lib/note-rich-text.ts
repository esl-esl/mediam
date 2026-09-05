const allowedTags = new Set(["b", "strong", "i", "em", "u", "s", "p", "div", "br", "ul", "ol", "li"]);

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function plainTextToRichHtml(value: string) {
  const content = escapeHtml(value).replaceAll("\n", "<br>");
  return content ? `<p>${content}</p>` : "";
}

export function sanitizeRichTextHtml(value: string) {
  return value
    .replace(/<(script|style|iframe|object|embed)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<!--([\s\S]*?)-->/g, "")
    .replace(/<\/?([a-z][a-z0-9]*)(?:\s[^>]*)?>/gi, (match, tag: string) => {
      const normalized = tag.toLowerCase();
      if (!allowedTags.has(normalized)) return "";
      const closing = /^<\//.test(match);
      if (normalized === "br") return "<br>";
      return closing ? `</${normalized}>` : `<${normalized}>`;
    })
    .trim();
}

export function richTextToPlainText(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
