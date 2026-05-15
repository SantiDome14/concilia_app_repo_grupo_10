import { createHighlighter, type Highlighter } from 'shiki';

let highlighterPromise: Promise<Highlighter> | null = null;

const LANGS = ['bash', 'shell', 'javascript', 'typescript', 'python', 'go', 'json', 'http'];
const THEME = 'github-dark-default';

export function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: [THEME],
      langs: LANGS,
    });
  }
  return highlighterPromise;
}

const LANG_ALIAS: Record<string, string> = {
  sh: 'bash',
  zsh: 'bash',
  curl: 'bash',
  js: 'javascript',
  ts: 'typescript',
  py: 'python',
  golang: 'go',
};

export function normalizeLang(input: string): string {
  const key = input.toLowerCase();
  if (LANG_ALIAS[key]) return LANG_ALIAS[key];
  if (LANGS.includes(key)) return key;
  return 'bash';
}

export async function highlightCode(code: string, lang: string): Promise<string> {
  const hl = await getHighlighter();
  return hl.codeToHtml(code, {
    lang: normalizeLang(lang),
    theme: THEME,
  });
}
