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

  // Process code blocks first (protect from other transformations)
  const codeBlocks: string[] = []
  let html = content.replace(/```([\s\S]*?)```/g, (_match, code) => {
    const idx = codeBlocks.length
    codeBlocks.push(`<pre class="aica-code-block"><code>${escapeHtml(code)}</code></pre>`)
    return `%%CODEBLOCK_${idx}%%`
  })

  // Inline code (protect from bold/italic)
  const inlineCodes: string[] = []
  html = html.replace(/`([^`]+)`/g, (_match, code) => {
    const idx = inlineCodes.length
    inlineCodes.push(`<code class="aica-inline-code">${escapeHtml(code)}</code>`)
    return `%%INLINE_${idx}%%`
  })

  // Bold (**text**)
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  // Italic (*text*) — only single asterisks not part of bold
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')

  // Bullet lists (- item)
  html = html.replace(/(^|\n)- (.+)/g, '$1<li>$2</li>')
  // Wrap consecutive <li> in <ul>
  html = html.replace(/(<li>.*?<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`)

  // Line breaks
  html = html.replace(/\n/g, '<br />')

  // Restore code blocks
  codeBlocks.forEach((block, i) => {
    html = html.replace(`%%CODEBLOCK_${i}%%`, block)
  })
  inlineCodes.forEach((code, i) => {
    html = html.replace(`%%INLINE_${i}%%`, code)
  })

  return DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR })
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
