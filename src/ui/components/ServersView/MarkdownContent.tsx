import { Box, Throbber } from '@rocket.chat/fuselage';
import DOMPurify from 'dompurify';
import { ipcRenderer, shell } from 'electron';
import hljs from 'highlight.js';
import { Marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import { useEffect, useRef, useState } from 'react';

// Inject highlight.js themes and markdown styles
const injectStyles = (() => {
  let injected = false;
  return () => {
    if (injected) return;
    injected = true;

    const lightLink = document.createElement('link');
    lightLink.rel = 'stylesheet';
    lightLink.href = '../node_modules/highlight.js/styles/github.css';
    lightLink.media = '(prefers-color-scheme: light)';
    document.head.appendChild(lightLink);

    const darkLink = document.createElement('link');
    darkLink.rel = 'stylesheet';
    darkLink.href = '../node_modules/highlight.js/styles/github-dark.css';
    darkLink.media = '(prefers-color-scheme: dark)';
    document.head.appendChild(darkLink);

    const mdStyles = document.createElement('style');
    mdStyles.textContent = `
      .markdown-body li:has(> input[type="checkbox"]) {
        list-style-type: none;
        margin-left: -1.5em;
      }
      .markdown-body li > input[type="checkbox"] {
        margin-right: 0.5em;
      }
      .markdown-body pre {
        overflow-x: auto;
      }
      .markdown-body pre code {
        display: block;
        overflow-x: auto;
      }
      .markdown-body table {
        border-collapse: collapse;
        width: 100%;
      }
      .markdown-body table th,
      .markdown-body table td {
        border: 1px solid var(--rcx-color-stroke-light, #e1e5e9);
        padding: 6px 13px;
      }
      .markdown-body table tr:nth-child(2n) {
        background-color: var(--rcx-color-surface-tint, rgba(0,0,0,0.03));
      }
      .markdown-body blockquote {
        border-left: 4px solid var(--rcx-color-stroke-light, #e1e5e9);
        padding: 0 1em;
        margin-left: 0;
        opacity: 0.85;
      }
      .markdown-body img {
        max-width: 100%;
        height: auto;
      }
      .markdown-body hr {
        border: none;
        border-top: 1px solid var(--rcx-color-stroke-light, #e1e5e9);
        margin: 1.5em 0;
      }
      .markdown-body details {
        margin: 1em 0;
      }
      .markdown-body details summary {
        cursor: pointer;
        font-weight: 600;
      }
      .markdown-body code:not(pre code) {
        background-color: var(--rcx-color-surface-tint, rgba(0,0,0,0.05));
        padding: 0.2em 0.4em;
        border-radius: 3px;
        font-size: 85%;
      }
    `;
    document.head.appendChild(mdStyles);
  };
})();

const marked = new Marked(
  markedHighlight({
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext';
      return hljs.highlight(code, { language }).value;
    },
  })
);
marked.setOptions({ gfm: true, breaks: true });

marked.use({
  renderer: {
    heading({ text, depth }: { text: string; depth: number }) {
      const slug = text
        .toLowerCase()
        .replace(/<[^>]*>/g, '')
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      return `<h${depth} id="${slug}">${text}</h${depth}>`;
    },
  },
});

const MarkdownContent = ({
  url,
  partition,
}: {
  url: string;
  partition: string;
}) => {
  const [htmlContent, setHtmlContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    injectStyles();
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest('a');
      if (!anchor) return;

      const rawHref = anchor.getAttribute('href');
      if (!rawHref) return;

      // Allow in-page anchor links to scroll normally
      if (rawHref.startsWith('#')) return;

      e.preventDefault();

      try {
        const resolved = new URL(rawHref, url);
        const allowedProtocols = ['http:', 'https:', 'mailto:'];
        if (allowedProtocols.includes(resolved.protocol)) {
          shell.openExternal(resolved.toString());
        }
      } catch {
        // Ignore malformed URLs
      }
    };

    container.addEventListener('click', handleClick);
    return () => container.removeEventListener('click', handleClick);
  }, [htmlContent, url]);

  useEffect(() => {
    if (!url) return;

    setIsLoading(true);
    setError(null);

    let cancelled = false;
    const serverUrl = partition.replace('persist:', '');

    ipcRenderer
      .invoke('document-viewer/fetch-content', url, serverUrl)
      .then((text: string) => {
        if (cancelled) return;
        return marked.parse(text);
      })
      .then((html) => {
        if (cancelled) return;
        const sanitized = DOMPurify.sanitize(html as string, {
          USE_PROFILES: { html: true },
          ADD_TAGS: ['details', 'summary', 'input'],
          ADD_ATTR: ['id', 'type', 'checked', 'disabled'],
        });
        setHtmlContent(sanitized);
        setIsLoading(false);
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message);
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [url, partition]);

  if (isLoading) {
    return (
      <Box
        display='flex'
        justifyContent='center'
        alignItems='center'
        height='100%'
        width='100%'
        color='default'
      >
        <Throbber size='x16' inheritColor />
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        display='flex'
        justifyContent='center'
        alignItems='center'
        height='100%'
        width='100%'
        color='danger'
        p='x16'
      >
        {error}
      </Box>
    );
  }

  return (
    <Box overflow='auto' position='absolute' style={{ inset: 0 }} bg='surface'>
      <Box
        ref={containerRef}
        className='markdown-body'
        style={{ maxWidth: 980, margin: '0 auto', padding: '48px 40px 64px' }}
        color='default'
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    </Box>
  );
};

export default MarkdownContent;
