import hljs from 'highlight.js/lib/core';
import html from 'highlight.js/lib/languages/xml';
import css from 'highlight.js/lib/languages/css';
import javascript from 'highlight.js/lib/languages/javascript';
import { decodeHTML } from 'entities';

hljs.registerLanguage('html', html);
hljs.registerLanguage('css', css);
hljs.registerLanguage('javascript', javascript);

// Authored snippets are escaped text inside <pre><code>. Inline code stays
// untouched. An explicit language class overrides the HTML default.
export function highlightCodeBlocks(source: string): string {
  return source.replace(/(<pre\b[^>]*>\s*)<code\b([^>]*)>([\s\S]*?)<\/code>(\s*<\/pre>)/g,
    (_, before, attributes: string, content: string, after) => {
      const language = attributes.match(/\blanguage-([\w-]+)/)?.[1] ?? 'html';
      if (!hljs.getLanguage(language)) throw new Error(`Unsupported docs snippet language: ${language}`);
      const result = hljs.highlight(decodeHTML(content), { language, ignoreIllegals: true }).value;
      const classes = attributes.match(/\bclass="([^"]*)"/);
      const highlightedAttributes = classes
        ? attributes.replace(classes[0], `class="${classes[1]} hljs"`)
        : `${attributes} class="hljs language-${language}"`;
      return `${before}<code${highlightedAttributes}>${result}</code>${after}`;
    });
}
