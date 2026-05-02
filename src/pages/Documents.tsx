import { Copy, ExternalLink, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { PageHeader } from "../components/layout/PageHeader";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { EmptyState, ItemCard, StudioForm, StudioTextarea } from "../components/studio/StudioForm";
import { useStudioStore } from "../store/studioStore";
import type { StudioDocumentStatus, StudioDocumentType } from "../types/studio";

const docTypes: StudioDocumentType[] = ["invoice", "contract", "proposal", "handoff", "brief", "other"];
const statuses: StudioDocumentStatus[] = ["draft", "sent", "signed", "paid", "archived"];

export function Documents() {
  const { documents, addDocument, updateDocument, deleteDocument } = useStudioStore();
  const [form, setForm] = useState({ title: "", clientName: "", type: "invoice" as StudioDocumentType, status: "draft" as StudioDocumentStatus, url: "", notes: "" });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.title.trim()) return;
    addDocument({ ...form, title: form.title.trim(), url: form.url.trim() || undefined });
    setForm({ title: "", clientName: "", type: "invoice", status: "draft", url: "", notes: "" });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Documents" description="Track invoices, contracts, proposals, briefs, and handoff docs that live in Figma, Drive, or PDF files." />
      <form onSubmit={submit}>
        <StudioForm title="Register a document" description="This stores the document record and link; it does not replace your existing PDF/Figma/Drive flow." actionLabel="Save Document">
          <div className="grid gap-3 lg:grid-cols-5">
            <Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Document title" />
            <Input value={form.clientName} onChange={(event) => setForm({ ...form, clientName: event.target.value })} placeholder="Client" />
            <Select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as StudioDocumentType })}>{docTypes.map((type) => <option key={type} value={type}>{type}</option>)}</Select>
            <Select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as StudioDocumentStatus })}>{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</Select>
            <Input value={form.url} onChange={(event) => setForm({ ...form, url: event.target.value })} placeholder="Link" />
          </div>
          <StudioTextarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Payment notes, signature status, handoff details..." />
        </StudioForm>
      </form>
      {documents.length ? (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {documents.map((document) => (
            <ItemCard
              key={document.id}
              title={document.title}
              meta={<><Badge tone="blue">{document.type}</Badge><Badge tone={document.status === "paid" || document.status === "signed" ? "emerald" : "slate"}>{document.status}</Badge>{document.clientName ? <span>{document.clientName}</span> : null}</>}
              actions={
                <>
                  {document.url ? <Button variant="secondary" onClick={() => navigator.clipboard.writeText(document.url!)} icon={<Copy size={15} />} aria-label="Copy link" /> : null}
                  {document.url ? <Button variant="secondary" onClick={() => window.open(document.url, "_blank", "noopener,noreferrer")} icon={<ExternalLink size={15} />} aria-label="Open link" /> : null}
                  <Button variant="danger" onClick={() => deleteDocument(document.id)} icon={<Trash2 size={15} />} aria-label="Delete document" />
                </>
              }
            >
              <div className="space-y-3">
                <p>{document.notes || "No notes yet."}</p>
                {document.status !== "paid" ? <Button variant="secondary" onClick={() => updateDocument(document.id, { status: "paid" })}>Mark paid</Button> : null}
              </div>
            </ItemCard>
          ))}
        </div>
      ) : (
        <EmptyState>No documents saved yet.</EmptyState>
      )}
    </div>
  );
}
