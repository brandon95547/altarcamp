import { Fragment, useMemo } from 'react';
import { cn } from '../../lib/cn.js';

/**
 * A small Markdown renderer for rendered agreements.
 *
 * It handles exactly what the contract templates produce — headings, paragraphs, lists,
 * tables, blockquotes, rules, bold, italic and inline code — and nothing else. Notably it
 * never passes raw HTML through: every piece of text is rendered as a React text node, so a
 * contract can carry an artist's free text without carrying a script with it.
 */

type Block =
  | { kind: 'heading'; level: 1 | 2 | 3 | 4; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; ordered: boolean; items: string[] }
  | { kind: 'table'; headers: string[]; rows: string[][] }
  | { kind: 'quote'; lines: string[] }
  | { kind: 'rule' };

function parse(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? '';

    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (/^\s*(---|\*\*\*)\s*$/.test(line)) {
      blocks.push({ kind: 'rule' });
      index += 1;
      continue;
    }

    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      blocks.push({
        kind: 'heading',
        level: heading[1]!.length as 1 | 2 | 3 | 4,
        text: heading[2]!.trim(),
      });
      index += 1;
      continue;
    }

    if (line.trimStart().startsWith('>')) {
      const quote: string[] = [];
      while (index < lines.length && (lines[index] ?? '').trimStart().startsWith('>')) {
        quote.push((lines[index] ?? '').replace(/^\s*>\s?/, ''));
        index += 1;
      }
      blocks.push({ kind: 'quote', lines: quote });
      continue;
    }

    if (line.trimStart().startsWith('|')) {
      const rows: string[][] = [];
      while (index < lines.length && (lines[index] ?? '').trimStart().startsWith('|')) {
        const cells = (lines[index] ?? '')
          .trim()
          .replace(/^\||\|$/g, '')
          .split('|')
          .map((cell) => cell.trim());
        rows.push(cells);
        index += 1;
      }
      const [headers = [], separator, ...body] = rows;
      const isSeparator = separator?.every((cell) => /^:?-{2,}:?$/.test(cell));
      blocks.push({
        kind: 'table',
        headers: headers.every((cell) => cell === '') ? [] : headers,
        rows: isSeparator ? body : rows.slice(1),
      });
      continue;
    }

    const bullet = /^\s*([-*])\s+(.*)$/.exec(line);
    const ordered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (bullet || ordered) {
      const isOrdered = Boolean(ordered);
      const items: string[] = [];
      while (index < lines.length) {
        const candidate = lines[index] ?? '';
        const match = isOrdered
          ? /^\s*\d+[.)]\s+(.*)$/.exec(candidate)
          : /^\s*[-*]\s+(.*)$/.exec(candidate);
        if (!match) break;
        items.push((isOrdered ? match[1] : match[2]) ?? '');
        index += 1;
      }
      blocks.push({ kind: 'list', ordered: isOrdered, items });
      continue;
    }

    const paragraph: string[] = [];
    while (index < lines.length) {
      const candidate = lines[index] ?? '';
      if (
        !candidate.trim() ||
        /^(#{1,4})\s/.test(candidate) ||
        candidate.trimStart().startsWith('|') ||
        candidate.trimStart().startsWith('>') ||
        /^\s*([-*])\s+/.test(candidate) ||
        /^\s*\d+[.)]\s+/.test(candidate) ||
        /^\s*(---|\*\*\*)\s*$/.test(candidate)
      ) {
        break;
      }
      paragraph.push(candidate.trim());
      index += 1;
    }
    blocks.push({ kind: 'paragraph', text: paragraph.join(' ') });
  }

  return blocks;
}

/** Bold, italic and inline code. Anything else stays literal text. */
function inline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|_[^_]+_|`[^`]+`)/g;
  let cursor = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) nodes.push(text.slice(cursor, match.index));
    const token = match[0];
    const inner = token.slice(
      token.startsWith('**') ? 2 : 1,
      token.length - (token.startsWith('**') ? 2 : 1),
    );
    if (token.startsWith('**')) {
      nodes.push(<strong key={`${keyPrefix}-b${key++}`}>{inner}</strong>);
    } else if (token.startsWith('`')) {
      nodes.push(<code key={`${keyPrefix}-c${key++}`}>{inner}</code>);
    } else {
      nodes.push(<em key={`${keyPrefix}-i${key++}`}>{inner}</em>);
    }
    cursor = match.index + token.length;
  }
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}

export function Markdown({ source, className }: { source: string; className?: string }) {
  const blocks = useMemo(() => parse(source), [source]);

  return (
    <div className={cn('altar-prose', className)}>
      {blocks.map((block, index) => {
        const key = `block-${index}`;
        switch (block.kind) {
          case 'rule':
            return <hr key={key} />;
          case 'heading': {
            const Tag = `h${block.level}` as 'h1' | 'h2' | 'h3' | 'h4';
            return <Tag key={key}>{inline(block.text, key)}</Tag>;
          }
          case 'paragraph':
            return <p key={key}>{inline(block.text, key)}</p>;
          case 'quote':
            return (
              <blockquote key={key}>
                {block.lines
                  .join('\n')
                  .split(/\n{2,}/)
                  .map((paragraph, paragraphIndex) => (
                    <p key={`${key}-p${paragraphIndex}`}>
                      {inline(paragraph.replace(/\n/g, ' '), key)}
                    </p>
                  ))}
              </blockquote>
            );
          case 'list':
            return block.ordered ? (
              <ol key={key} className="mb-4 list-decimal pl-5">
                {block.items.map((item, itemIndex) => (
                  <li key={`${key}-${itemIndex}`}>{inline(item, key)}</li>
                ))}
              </ol>
            ) : (
              <ul key={key}>
                {block.items.map((item, itemIndex) => (
                  <li key={`${key}-${itemIndex}`}>{inline(item, key)}</li>
                ))}
              </ul>
            );
          case 'table':
            return (
              <div key={key} className="overflow-x-auto">
                <table>
                  {block.headers.length > 0 ? (
                    <thead>
                      <tr>
                        {block.headers.map((header, headerIndex) => (
                          <th key={`${key}-h${headerIndex}`}>{inline(header, key)}</th>
                        ))}
                      </tr>
                    </thead>
                  ) : null}
                  <tbody>
                    {block.rows.map((row, rowIndex) => (
                      <tr key={`${key}-r${rowIndex}`}>
                        {row.map((cell, cellIndex) => (
                          <td key={`${key}-r${rowIndex}c${cellIndex}`}>
                            <Fragment>{inline(cell, key)}</Fragment>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
        }
      })}
    </div>
  );
}
