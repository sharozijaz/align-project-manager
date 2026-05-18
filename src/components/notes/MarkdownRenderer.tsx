import type { ReactNode } from "react";

export function MarkdownRenderer({ body, className = "" }: { body: string; className?: string }) {
  const lines = body.split("\n");
  const nodes: ReactNode[] = [];
  let codeLines: string[] = [];
  let inCodeBlock = false;

  const pushCodeBlock = (key: string) => {
    nodes.push(
      <pre key={key} className="overflow-x-auto rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg-soft)] p-4 text-sm leading-6 text-[var(--text)]">
        <code>{codeLines.join("\n")}</code>
      </pre>,
    );
    codeLines = [];
    inCodeBlock = false;
  };

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index];
    const line = rawLine.trim();

    if (line.startsWith("```")) {
      if (inCodeBlock) pushCodeBlock(`code-${index}`);
      else inCodeBlock = true;
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(rawLine);
      continue;
    }

    if (!line) {
      nodes.push(<div key={index} className="h-2" />);
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) {
      nodes.push(<hr key={index} className="border-[var(--border)]" />);
      continue;
    }

    if (isMarkdownTableStart(lines, index)) {
      const tableRows: string[][] = [];
      let rowIndex = index;
      while (rowIndex < lines.length && isMarkdownTableRow(lines[rowIndex])) {
        if (rowIndex !== index + 1) tableRows.push(parseMarkdownTableRow(lines[rowIndex]));
        rowIndex += 1;
      }
      const headerCells = tableRows.shift() ?? [];
      const bodyRows = tableRows;
      nodes.push(
        <div key={`table-${index}`} className="overflow-x-auto rounded-[var(--radius-sm)] border border-[var(--border)]">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="bg-[var(--bg-soft)] text-[var(--text)]">
              <tr>
                {headerCells.map((cell, cellIndex) => (
                  <th key={cellIndex} className="border-b border-[var(--border)] px-3 py-2 font-bold">
                    {renderInlineMarkdown(cell)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bodyRows.map((row, rowNumber) => (
                <tr key={rowNumber} className="border-t border-[var(--border)]">
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="px-3 py-2 text-[var(--text-muted)]">
                      {renderInlineMarkdown(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      index = rowIndex - 1;
      continue;
    }

    if (line.startsWith("# ")) {
      nodes.push(<h1 key={index} className="pt-2 font-display text-3xl font-bold leading-tight text-[var(--text)]">{renderInlineMarkdown(line.slice(2))}</h1>);
      continue;
    }

    if (line.startsWith("## ")) {
      nodes.push(<h2 key={index} className="pt-2 font-display text-2xl font-bold leading-tight text-[var(--text)]">{renderInlineMarkdown(line.slice(3))}</h2>);
      continue;
    }

    if (line.startsWith("### ")) {
      nodes.push(<h3 key={index} className="pt-2 font-display text-xl font-bold leading-tight text-[var(--text)]">{renderInlineMarkdown(line.slice(4))}</h3>);
      continue;
    }

    if (line.startsWith(">")) {
      const quoteLines: string[] = [];
      let quoteIndex = index;
      while (quoteIndex < lines.length && lines[quoteIndex].trim().startsWith(">")) {
        quoteLines.push(lines[quoteIndex].trim().replace(/^>\s?/, ""));
        quoteIndex += 1;
      }
      nodes.push(
        <blockquote key={`quote-${index}`} className="border-l-4 border-[var(--brand-primary)] bg-[var(--bg-soft)] px-4 py-3 text-[var(--text-muted)]">
          {quoteLines.map((quoteLine, quoteLineIndex) => (
            <p key={quoteLineIndex}>{renderInlineMarkdown(quoteLine)}</p>
          ))}
        </blockquote>,
      );
      index = quoteIndex - 1;
      continue;
    }

    const checklistMatch = line.match(/^- \[([ xX])\]\s+(.+)$/);
    if (checklistMatch) {
      const items: Array<{ checked: boolean; text: string }> = [];
      let itemIndex = index;
      while (itemIndex < lines.length) {
        const match = lines[itemIndex].trim().match(/^- \[([ xX])\]\s+(.+)$/);
        if (!match) break;
        items.push({ checked: match[1].toLowerCase() === "x", text: match[2] });
        itemIndex += 1;
      }
      nodes.push(
        <ul key={`checklist-${index}`} className="space-y-2 pl-1">
          {items.map((item, itemNumber) => (
            <li key={itemNumber} className="flex gap-3 text-[var(--text-muted)]">
              <span className={`mt-1 grid h-4 w-4 shrink-0 place-items-center rounded border text-[10px] ${item.checked ? "border-[var(--status-completed-text)] bg-[var(--status-completed-bg)] text-[var(--status-completed-text)]" : "border-[var(--border-strong)]"}`}>
                {item.checked ? "✓" : ""}
              </span>
              <span>{renderInlineMarkdown(item.text)}</span>
            </li>
          ))}
        </ul>,
      );
      index = itemIndex - 1;
      continue;
    }

    const bulletMatch = line.match(/^[-*+]\s+(.+)$/);
    if (bulletMatch) {
      const items: string[] = [];
      let itemIndex = index;
      while (itemIndex < lines.length) {
        const match = lines[itemIndex].trim().match(/^[-*+]\s+(.+)$/);
        if (!match) break;
        items.push(match[1]);
        itemIndex += 1;
      }
      nodes.push(
        <ul key={`list-${index}`} className="list-disc space-y-1 pl-6 text-[var(--text-muted)] marker:text-[var(--brand-primary)]">
          {items.map((item, itemNumber) => (
            <li key={itemNumber}>{renderInlineMarkdown(item)}</li>
          ))}
        </ul>,
      );
      index = itemIndex - 1;
      continue;
    }

    const orderedMatch = line.match(/^\d+\.\s+(.+)$/);
    if (orderedMatch) {
      const items: string[] = [];
      let itemIndex = index;
      while (itemIndex < lines.length) {
        const match = lines[itemIndex].trim().match(/^\d+\.\s+(.+)$/);
        if (!match) break;
        items.push(match[1]);
        itemIndex += 1;
      }
      nodes.push(
        <ol key={`ordered-${index}`} className="list-decimal space-y-1 pl-6 text-[var(--text-muted)] marker:text-[var(--brand-primary)]">
          {items.map((item, itemNumber) => (
            <li key={itemNumber}>{renderInlineMarkdown(item)}</li>
          ))}
        </ol>,
      );
      index = itemIndex - 1;
      continue;
    }

    nodes.push(<p key={index}>{renderInlineMarkdown(line)}</p>);
  }

  if (inCodeBlock && codeLines.length) pushCodeBlock("code-open");

  return <article className={`space-y-4 text-base leading-8 text-[var(--text-muted)] ${className}`}>{nodes}</article>;
}

function renderInlineMarkdown(value: string) {
  const parts = value.split(/(`[^`]+`|\*\*[^*]+\*\*|~~[^~]+~~|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, index) => {
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      const href = sanitizeMarkdownUrl(linkMatch[2]);
      return href ? (
        <a key={index} className="font-semibold text-[var(--text-brand)] hover:underline" href={href} target="_blank" rel="noreferrer">
          {linkMatch[1]}
        </a>
      ) : (
        <span key={index}>{linkMatch[1]}</span>
      );
    }
    if (/^`[^`]+`$/.test(part)) return <code key={index} className="rounded bg-[var(--bg-soft)] px-1.5 py-0.5 font-mono text-sm text-[var(--text)]">{part.slice(1, -1)}</code>;
    if (/^\*\*[^*]+\*\*$/.test(part)) return <strong key={index} className="font-bold text-[var(--text)]">{part.slice(2, -2)}</strong>;
    if (/^~~[^~]+~~$/.test(part)) return <del key={index}>{part.slice(2, -2)}</del>;
    if (/^\*[^*]+\*$/.test(part)) return <em key={index}>{part.slice(1, -1)}</em>;
    return <span key={index}>{part}</span>;
  });
}

function sanitizeMarkdownUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("#")) return trimmed;
  try {
    const parsed = new URL(trimmed, window.location.origin);
    if (["http:", "https:", "mailto:", "tel:"].includes(parsed.protocol)) return parsed.toString();
  } catch {
    return "";
  }
  return "";
}

function isMarkdownTableRow(line: string) {
  return /^\s*\|.+\|\s*$/.test(line);
}

function isMarkdownTableStart(lines: string[], index: number) {
  return isMarkdownTableRow(lines[index] ?? "") && /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(lines[index + 1] ?? "");
}

function parseMarkdownTableRow(line: string) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}
