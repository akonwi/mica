import { test, expect } from 'bun:test';
import { decodeHTML } from 'entities';
import { highlightCodeBlocks } from './docs-highlight';

const blocks = (html: string) => [...html.matchAll(/<pre\b[^>]*>\s*<code\b[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/g)].map(m => decodeHTML(m[1].replace(/<[^>]*>/g, '')));

test('highlighting preserves every authored snippet’s copyable text', async () => {
  let count = 0;
  for await (const file of new Bun.Glob('*.html').scan('docs-src/pages')) {
    const source = await Bun.file(`docs-src/pages/${file}`).text();
    const original = blocks(source);
    const highlighted = highlightCodeBlocks(source);
    expect(blocks(highlighted)).toEqual(original);
    count += original.length;
  }
  expect(count).toBeGreaterThan(50);
});

test('HTML, CSS, and JavaScript have appropriate tokens', () => {
  expect(highlightCodeBlocks('<pre><code>&lt;m-field required&gt;</code></pre>')).toContain('hljs-name');
  expect(highlightCodeBlocks('<pre><code class="language-css">:root { color: red; }</code></pre>')).toContain('hljs-attribute');
  expect(highlightCodeBlocks('<pre><code class="language-javascript">const label = "Save";</code></pre>')).toContain('hljs-keyword');
});

test('retains accessibility attributes and inline code, escapes markup exactly once', () => {
  const inline = '<p>Use <code>m-field</code>.</p>';
  const source = inline + '<pre tabindex="0" aria-label="Example"><code>&lt;script&gt;alert(&quot;&amp;lt;&quot;)&lt;/script&gt;</code></pre>';
  const result = highlightCodeBlocks(source);
  expect(result).toStartWith(inline + '<pre tabindex="0" aria-label="Example">');
  expect(result).not.toContain('<script>');
  expect(blocks(result)).toEqual(blocks(source));
});
