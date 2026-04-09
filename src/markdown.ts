import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

marked.setOptions({
  breaks: true,
  gfm: true,
});

export function renderMarkdown(markdown: string): string {
  const rawHtml = marked.parse(markdown ?? "") as string;
  return sanitizeHtml(rawHtml, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      "h1",
      "h2",
      "img",
    ]),
    allowedAttributes: {
      a: ["href", "name", "target", "rel"],
      img: ["src", "alt", "title"],
    },
    allowedSchemes: ["http", "https", "mailto"],
  });
}
