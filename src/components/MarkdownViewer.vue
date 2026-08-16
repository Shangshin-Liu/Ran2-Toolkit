<template>
  <div class="markdown-content" v-html="renderedHtml"></div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  content: {
    type: String,
    default: ''
  }
})

/**
 * 簡易而安全的 Markdown 轉換器
 */
function parseMarkdown(md) {
  if (!md) return ''

  let html = md

  // 1. 轉義 HTML 特殊字元（防止 XSS）
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // 2. 程式碼區塊 ```js ... ```
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
    return `<pre class="md-code-block"><code class="language-${lang}">${code.trim()}</code></pre>`
  })

  // 3. 行內程式碼 `code`
  html = html.replace(/`([^`]+)`/g, '<code class="md-inline-code">$1</code>')

  // 4. 標題 (#, ##, ###)
  html = html.replace(/^### (.*$)/gim, '<h3 class="md-h3">$1</h3>')
  html = html.replace(/^## (.*$)/gim, '<h2 class="md-h2">$1</h2>')
  html = html.replace(/^# (.*$)/gim, '<h1 class="md-h1">$1</h1>')

  // 5. 引用區塊 > Quote
  html = html.replace(/^\&gt;\s?(.*$)/gim, '<blockquote class="md-blockquote">$1</blockquote>')

  // 6. 加粗 **bold** 與 斜體 *italic*
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>')

  // 7. 連結 [label](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="md-link">$1</a>')

  // 8. 無序列表 (- item 或 * item)
  html = html.replace(/^\s*[-*]\s+(.*$)/gim, '<li class="md-li">$1</li>')
  html = html.replace(/(<li class="md-li">.*<\/li>\n?)+/g, '<ul class="md-ul">$&</ul>')

  // 9. 有序列表 (1. item)
  html = html.replace(/^\s*\d+\.\s+(.*$)/gim, '<li class="md-oli">$1</li>')
  html = html.replace(/(<li class="md-oli">.*<\/li>\n?)+/g, '<ol class="md-ol">$&</ol>')

  // 10. 段落換行
  const paragraphs = html.split(/\n\n+/)
  html = paragraphs
    .map(p => {
      p = p.trim()
      if (!p) return ''
      // 如果已經被 block 標籤包裹，就不再包 <p>
      if (/^<(h1|h2|h3|blockquote|ul|ol|pre)/i.test(p)) {
        return p
      }
      return `<p class="md-p">${p.replace(/\n/g, '<br>')}</p>`
    })
    .join('')

  return html
}

const renderedHtml = computed(() => parseMarkdown(props.content))
</script>

<style>
.markdown-content {
  color: var(--text-main, #e2e8f0);
  font-size: 0.95rem;
  line-height: 1.7;
}

.markdown-content .md-h1 {
  font-size: 1.4rem;
  font-weight: 800;
  color: #38bdf8;
  margin: 1rem 0 0.6rem 0;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(56, 189, 248, 0.2);
}

.markdown-content .md-h2 {
  font-size: 1.2rem;
  font-weight: 700;
  color: #a855f7;
  margin: 0.8rem 0 0.5rem 0;
}

.markdown-content .md-h3 {
  font-size: 1.05rem;
  font-weight: 600;
  color: #f43f5e;
  margin: 0.7rem 0 0.4rem 0;
}

.markdown-content .md-p {
  margin-bottom: 0.8rem;
}

.markdown-content .md-blockquote {
  margin: 0.8rem 0;
  padding: 0.6rem 1rem;
  background: rgba(168, 85, 247, 0.1);
  border-left: 4px solid #a855f7;
  border-radius: 0 6px 6px 0;
  color: #cbd5e1;
  font-style: italic;
}

.markdown-content .md-code-block {
  background: rgba(15, 23, 42, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 0.8rem 1rem;
  margin: 0.8rem 0;
  overflow-x: auto;
  font-family: 'Fira Code', Consolas, monospace;
  font-size: 0.88rem;
  color: #38bdf8;
}

.markdown-content .md-inline-code {
  background: rgba(56, 189, 248, 0.15);
  color: #38bdf8;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.88rem;
}

.markdown-content .md-link {
  color: #38bdf8;
  text-decoration: underline;
  text-underline-offset: 3px;
  transition: color 0.2s;
}

.markdown-content .md-link:hover {
  color: #f43f5e;
}

.markdown-content .md-ul,
.markdown-content .md-ol {
  margin: 0.5rem 0 0.8rem 1.4rem;
  padding: 0;
}

.markdown-content .md-li,
.markdown-content .md-oli {
  margin-bottom: 0.3rem;
}
</style>
