/**
 * Shared markdown-to-HTML formatter with DOMPurify sanitization.
 *
 * Extracted from Finance AgentChat (Issue #194).
 */

import DOMPurify from 'dompurify'

const ALLOWED_TAGS = ['strong', 'em', 'code', 'pre', 'br', 'ul', 'li']
const ALLOWED_ATTR = ['class']

export function formatMarkdownToHTML(content: string): string {
  if (typeof content !== 'string') return ''

  let html = content
    // Code blocks (```...```) — must come before inline code
    .replace(/```([\s\S]*?)```/g, '<pre class="aica-code-block"><code>$1</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="aica-inline-code">$1</code>')
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic (single * not preceded/followed by space to avoid list conflicts)
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
    // Bullet lists (- item)
    .replace(/(?:^|\n)- (.+)/g, '\n<li>$1</li>')
    // Line breaks (but not inside pre blocks)
    .replace(/\n/g, '<br />')

  // Wrap consecutive <li> tags in <ul>
  html = html.replace(/((?:<br \/>)?<li>[\s\S]*?<\/li>)+/g, (match) => {
    const cleaned = match.replace(/^<br \/>/g, '')
    return `<ul>${cleaned}</ul>`
  })

  return DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR })
}
