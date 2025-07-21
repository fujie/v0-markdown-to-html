import { unified } from "unified"
import remarkParse from "remark-parse"
import remarkGfm from "remark-gfm"
import remarkRehype from "remark-rehype"
import rehypeRaw from "rehype-raw"
import rehypeStringify from "rehype-stringify"
import rehypeSlug from "rehype-slug"
import rehypeAutolinkHeadings from "rehype-autolink-headings"

export async function convertMarkdownToHtml(markdown: string): Promise<string> {
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm) // GitHub Flavored Markdown support (tables, footnotes, etc.)
    .use(remarkRehype, { allowDangerousHtml: true }) // Allow HTML in markdown
    .use(rehypeRaw) // Process raw HTML
    .use(rehypeSlug) // Add IDs to headings
    .use(rehypeAutolinkHeadings, {
      // Add links to headings
      behavior: "wrap",
      properties: {
        className: ["anchor-link"],
      },
    })
    .use(rehypeStringify, { allowDangerousHtml: true })

  const result = await processor.process(markdown)

  // Wrap in complete HTML document with proper styling
  const fullHtml = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Converted from Markdown</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0 auto;
      padding: 20px;
      background-color: #fff;
    }
    
    h1, h2, h3, h4, h5, h6 {
      margin-top: 2em;
      margin-bottom: 1em;
      font-weight: 600;
      line-height: 1.25;
    }
    
    h1 { font-size: 2em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
    h2 { font-size: 1.5em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
    h3 { font-size: 1.25em; }
    h4 { font-size: 1em; }
    h5 { font-size: 0.875em; }
    h6 { font-size: 0.85em; color: #6a737d; }
    
    p {
      margin-bottom: 16px;
    }
    
    a {
      color: #0366d6;
      text-decoration: none;
    }
    
    a:hover {
      text-decoration: underline;
    }
    
    /* Table styling with nested table support */
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 16px 0;
      border: 1px solid #d0d7de;
    }
    
    table th,
    table td {
      border: 1px solid #d0d7de;
      padding: 6px 13px;
      text-align: left;
      vertical-align: top;
    }
    
    table th {
      background-color: #f6f8fa;
      font-weight: 600;
    }
    
    table tr:nth-child(even) {
      background-color: #f6f8fa;
    }
    
    /* Nested table styling - remove outer border */
    table table {
      margin: 0;
      border: 0;
      width: 100%;
    }
    
    table table th,
    table table td {
      border: 1px solid #d0d7de;
      padding: 4px 8px;
      font-size: 0.9em;
    }
    
    /* Ensure cells containing nested tables have no border conflicts */
    td:has(table) {
      padding: 0;
      border: 1px solid #d0d7de;
    }
    
    blockquote {
      padding: 0 1em;
      color: #6a737d;
      border-left: 0.25em solid #dfe2e5;
      margin: 0 0 16px 0;
    }
    
    code {
      padding: 0.2em 0.4em;
      margin: 0;
      font-size: 85%;
      background-color: rgba(175, 184, 193, 0.2);
      border-radius: 6px;
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
    }
    
    pre {
      padding: 16px;
      overflow: auto;
      font-size: 85%;
      line-height: 1.45;
      background-color: #f6f8fa;
      border-radius: 6px;
      margin: 16px 0;
    }
    
    pre code {
      display: inline;
      max-width: auto;
      padding: 0;
      margin: 0;
      overflow: visible;
      line-height: inherit;
      word-wrap: normal;
      background-color: transparent;
      border: 0;
    }
    
    ul, ol {
      padding-left: 2em;
      margin: 0 0 16px 0;
    }
    
    li {
      margin: 0.25em 0;
    }
    
    img {
      max-width: 100%;
      height: auto;
      margin: 16px 0;
      border-radius: 6px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24);
    }
    
    hr {
      height: 0.25em;
      padding: 0;
      margin: 24px 0;
      background-color: #e1e4e8;
      border: 0;
    }
    
    /* Enhanced footnotes styling */
    .footnotes {
      margin-top: 3em;
      padding-top: 1.5em;
      border-top: 2px solid #e1e4e8;
      font-size: 0.9em;
    }
    
    .footnotes::before {
      content: "脚注";
      font-weight: 600;
      font-size: 1.1em;
      color: #24292f;
      display: block;
      margin-bottom: 1em;
    }
    
    .footnotes ol {
      padding-left: 1.5em;
      counter-reset: footnote-counter;
    }
    
    .footnotes li {
      margin: 0.75em 0;
      position: relative;
      counter-increment: footnote-counter;
    }
    
    .footnotes li::marker {
      font-weight: 600;
      color: #0366d6;
    }
    
    .footnotes li p {
      margin: 0;
      display: inline;
    }
    
    /* Footnote reference links in text */
    sup a[href^="#fn"] {
      color: #0366d6;
      text-decoration: none;
      font-weight: 600;
      padding: 0 2px;
    }
    
    sup a[href^="#fn"]:hover {
      text-decoration: underline;
      background-color: #f1f8ff;
      border-radius: 3px;
    }
    
    /* Footnote back-reference links */
    .footnotes a[href^="#fnref"] {
      color: #0366d6;
      text-decoration: none;
      margin-left: 0.5em;
      font-weight: 600;
    }
    
    .footnotes a[href^="#fnref"]:hover {
      text-decoration: underline;
    }
    
    .footnotes a[href^="#fnref"]::before {
      content: "↩";
      margin-right: 0.25em;
    }
    
    /* Anchor links */
    .anchor-link {
      color: inherit;
      text-decoration: none;
    }
    
    .anchor-link:hover {
      text-decoration: underline;
    }
    
    /* Custom styles for embedded HTML */
    div[style*="text-align: right"] {
      text-align: right;
    }
    
    div[style*="text-align: center"] {
      text-align: center;
    }
    
    /* Responsive design */
    @media (max-width: 768px) {
      body {
        padding: 10px;
      }
      
      table {
        font-size: 0.9em;
      }
      
      pre {
        padding: 12px;
        font-size: 0.8em;
      }
      
      .footnotes {
        font-size: 0.85em;
      }
    }
  </style>
</head>
<body>
${result.toString()}
</body>
</html>`

  return fullHtml
}
