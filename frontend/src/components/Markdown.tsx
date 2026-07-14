import ReactMarkdown from "react-markdown";

/** Renders a Markdown string as actual formatted output (headings, lists, bold,
 * code blocks) instead of raw text — for finished, complete content only. Not
 * meant for a mid-stream preview: partial/unclosed Markdown syntax while tokens
 * are still arriving tends to render as broken or flickering elements. */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose prose-invert prose-sm max-w-none">
      <ReactMarkdown>{children}</ReactMarkdown>
    </div>
  );
}
