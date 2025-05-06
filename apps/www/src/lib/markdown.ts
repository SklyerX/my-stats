import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

import path from "node:path";
import { readFile, stat } from "node:fs/promises";

export async function getMarkdownContent(filename: string) {
  const fullPath = path.join(process.cwd(), "content", `${filename}.md`);
  const fileContents = await readFile(fullPath, "utf8");
  const stats = await stat(fullPath);

  const markdown = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeSanitize)
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings)
    .use(rehypeStringify)
    .process(fileContents);

  return { markdown: markdown.toString(), modifiedAt: stats.mtime };
}
