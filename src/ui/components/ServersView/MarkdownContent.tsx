import { Box, Throbber } from '@rocket.chat/fuselage';
import DOMPurify from 'dompurify';
import { ipcRenderer, shell } from 'electron';
import hljs from 'highlight.js';
import { Marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import { useEffect, useRef, useState } from 'react';

// Inject highlight.js themes with media queries for light/dark support
const injectHighlightThemes = (() => {
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
    injectHighlightThemes();
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest('a');
      if (anchor?.href) {
        e.preventDefault();
        shell.openExternal(anchor.href);
      }
    };

    container.addEventListener('click', handleClick);
    return () => container.removeEventListener('click', handleClick);
  }, [htmlContent]);

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
