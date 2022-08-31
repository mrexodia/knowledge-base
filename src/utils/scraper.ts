import fetch from "node-fetch";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";

export async function scrapeUrl(url: string) {
  // TODO: delegate based on URL
  if (
    url.endsWith(".pdf") ||
    url.includes("youtube.com") ||
    url.includes("youtu.be")
  ) {
    throw { error: "Unsupported url", url };
  }
  if (url.startsWith("/r/")) {
    url = "https://reddit.com" + url;
  }
  const response = await fetch(url);
  const type = response.headers.get("Content-Type");
  // TODO: detect content type?
  void type;
  const html = await response.text();
  const doc = new JSDOM(html);
  let reader = new Readability(doc.window.document);
  let article = reader.parse();
  if (article == null) {
    throw { error: "Failed to parse article", html };
  }
  return article;
}
