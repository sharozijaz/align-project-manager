import { ExternalLink } from "lucide-react";
import { plainDateLabel } from "../../utils/date";
import { Badge } from "../ui/Badge";
import { Modal } from "../ui/Modal";
import { MarkdownRenderer } from "./MarkdownRenderer";

export interface NoteReaderModalNote {
  title: string;
  body: string;
  tags?: string;
  favorite?: boolean;
  updatedAt?: string;
}

export function NoteReaderModal({
  note,
  onClose,
  action,
}: {
  note: NoteReaderModalNote | null;
  onClose: () => void;
  action?: { label: string; href: string };
}) {
  const tags = note?.tags
    ?.split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  return (
    <Modal
      title={note?.title || "Note"}
      open={Boolean(note)}
      onClose={onClose}
      className="!max-w-[1296px] p-0 sm:w-[92vw] xl:w-[1296px]"
    >
      {note ? (
        <div className="flex max-h-[82vh] flex-col">
          <div className="border-b border-[var(--border)] px-5 pb-4 sm:px-7">
            <div className="flex flex-wrap items-center gap-2">
              {note.favorite ? <Badge tone="purple">Pinned</Badge> : null}
              {note.updatedAt ? <span className="text-xs font-semibold text-[var(--text-soft)]">Updated {plainDateLabel(note.updatedAt.slice(0, 10))}</span> : null}
              {tags?.map((tag) => (
                <Badge key={tag}>{tag}</Badge>
              ))}
            </div>
          </div>
          <div className="min-h-0 overflow-y-auto px-5 py-6 sm:px-7">
            <MarkdownRenderer body={note.body} className="max-w-none text-sm leading-7 sm:text-base" />
          </div>
          {action ? (
            <div className="border-t border-[var(--border)] px-5 py-4 sm:px-7">
              <a
                href={action.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--button-secondary-bg)] px-4 py-2 text-sm font-bold text-[var(--button-secondary-text)] shadow-[var(--shadow-sm)] transition-[background-color,border-color,color,box-shadow,transform] duration-150 hover:-translate-y-px hover:border-[var(--border-strong)] hover:bg-[var(--button-secondary-hover)]"
              >
                <ExternalLink size={16} />
                {action.label}
              </a>
            </div>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
}
