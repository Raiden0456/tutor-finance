import Markdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

const COMPONENTS: Components = {
  a: ({ node: _node, ...props }) => (
    <a
      {...props}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary underline underline-offset-2"
    />
  ),
  ul: ({ node: _node, ...props }) => <ul {...props} className="list-disc space-y-1 pl-5" />,
  ol: ({ node: _node, ...props }) => <ol {...props} className="list-decimal space-y-1 pl-5" />,
  h1: ({ node: _node, ...props }) => <h3 {...props} className="text-base font-semibold" />,
  h2: ({ node: _node, ...props }) => <h3 {...props} className="text-base font-semibold" />,
  h3: ({ node: _node, ...props }) => <h4 {...props} className="text-sm font-semibold" />,
  code: ({ node: _node, ...props }) => (
    <code {...props} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]" />
  ),
  pre: ({ node: _node, ...props }) => (
    <pre {...props} className="overflow-x-auto rounded-lg bg-muted p-3 text-xs" />
  ),
  table: ({ node: _node, ...props }) => (
    <div className="overflow-x-auto">
      <table {...props} className="w-full text-left text-xs" />
    </div>
  ),
  th: ({ node: _node, ...props }) => (
    <th {...props} className="border-b border-border px-2 py-1 font-semibold" />
  ),
  td: ({ node: _node, ...props }) => <td {...props} className="border-b border-border px-2 py-1" />,
  blockquote: ({ node: _node, ...props }) => (
    <blockquote {...props} className="border-l-2 border-border pl-3 text-muted-foreground" />
  ),
};

export function MarkdownText({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn('space-y-2 text-sm leading-relaxed break-words', className)}>
      <Markdown remarkPlugins={[remarkGfm]} components={COMPONENTS} skipHtml>
        {children}
      </Markdown>
    </div>
  );
}
