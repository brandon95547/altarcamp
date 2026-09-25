import {
  DOCUMENT_FOLDERS,
  DOCUMENT_FOLDER_LABELS,
  DOCUMENT_MAX_BYTES,
  DOCUMENT_TOO_LARGE,
  type DocumentFolder,
} from '@altar/shared';
import { Download, FileText, Lock, Trash2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { Badge } from '../../components/ui/Badge.js';
import { Button } from '../../components/ui/Button.js';
import { Callout } from '../../components/ui/Callout.js';
import { Card, CardBody, CardHeader } from '../../components/ui/Card.js';
import { Select } from '../../components/ui/Field.js';
import { EmptyState, PageHeader, Spinner } from '../../components/ui/Misc.js';
import { ApiError, api, downloadDocument } from '../../lib/api.js';
import { cn } from '../../lib/cn.js';
import { readFileAsBase64 } from '../../lib/files.js';
import { formatDate } from '../../lib/format.js';
import { useMutation, useQuery } from '../../lib/useApi.js';

interface DocumentRow {
  id: string;
  folder: DocumentFolder;
  filename: string;
  content_type: string;
  byte_size: number;
  is_system: boolean;
  created_at: string;
}

function readableSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Spec §31 — the permanent document vault. */
export function DocumentsPage() {
  const [folder, setFolder] = useState<DocumentFolder | 'all'>('all');
  const [uploadFolder, setUploadFolder] = useState<DocumentFolder>('songs');
  const fileInput = useRef<HTMLInputElement>(null);
  const { data, loading, error, reload } = useQuery<{
    folders: { key: DocumentFolder; count: number }[];
    documents: DocumentRow[];
  }>(folder === 'all' ? '/documents' : `/documents?folder=${folder}`, [folder]);

  const upload = useMutation(async (file: File) => {
    // Refused here, before reading a byte, with the sentence the API would have used.
    if (file.size > DOCUMENT_MAX_BYTES) throw new ApiError(413, 'too_large', DOCUMENT_TOO_LARGE);
    return api.post('/documents', {
      folder: uploadFolder,
      filename: file.name,
      contentType: file.type || 'application/octet-stream',
      data: await readFileAsBase64(file),
    });
  });

  const remove = useMutation(async (documentId: string) => api.delete(`/documents/${documentId}`));

  return (
    <div>
      <PageHeader
        eyebrow="Documents"
        title="Your vault"
        description="Every signed agreement lands here automatically, with its signature certificate. You can download anything, at any time, forever."
      />

      <div className="grid gap-6 lg:grid-cols-[14rem_1fr] lg:items-start">
        <nav className="grid gap-1">
          <button
            type="button"
            onClick={() => setFolder('all')}
            className={cn(
              'rounded-lg px-3 py-2 text-left font-medium',
              folder === 'all' ? 'bg-ink-950 text-ink-50' : 'text-ink-800 hover:bg-ink-100',
            )}
          >
            All documents
          </button>
          {DOCUMENT_FOLDERS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setFolder(key)}
              className={cn(
                'flex items-center justify-between rounded-lg px-3 py-2 text-left',
                folder === key ? 'bg-ink-950 text-ink-50' : 'text-ink-800 hover:bg-ink-100',
              )}
            >
              {DOCUMENT_FOLDER_LABELS[key]}
            </button>
          ))}
        </nav>

        <div className="grid gap-4">
          <Card>
            <CardHeader
              title="Add a document"
              description="Masters, artwork, clearances, tax forms — anything the deal depends on."
            />
            <CardBody className="flex flex-wrap items-end gap-3">
              <label className="grid gap-1.5">
                <span className="text-sm font-medium text-ink-900">Folder</span>
                <Select
                  value={uploadFolder}
                  onChange={(event) => setUploadFolder(event.target.value as DocumentFolder)}
                  className="w-48"
                >
                  {DOCUMENT_FOLDERS.map((key) => (
                    <option key={key} value={key}>
                      {DOCUMENT_FOLDER_LABELS[key]}
                    </option>
                  ))}
                </Select>
              </label>

              <input
                ref={fileInput}
                type="file"
                className="hidden"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  const result = await upload.run(file);
                  if (result !== null) reload();
                  event.target.value = '';
                }}
              />
              <Button onClick={() => fileInput.current?.click()} disabled={upload.pending}>
                <Upload className="size-4" aria-hidden />
                {upload.pending ? 'Uploading…' : 'Choose a file'}
              </Button>
              <p className="text-sm text-ink-600">
                Up to {DOCUMENT_MAX_BYTES / 1024 / 1024} MB per file in this phase.
              </p>
            </CardBody>
          </Card>

          {upload.error ? <Callout tone="blocker">{upload.error.message}</Callout> : null}
          {remove.error ? <Callout tone="blocker">{remove.error.message}</Callout> : null}
          {error ? <Callout tone="blocker">{error.message}</Callout> : null}
          {loading ? <Spinner /> : null}

          {data && data.documents.length === 0 ? (
            <EmptyState
              title="This folder is empty"
              description="Signed agreements arrive here on their own. Everything else you add yourself."
            />
          ) : null}

          <ul className="grid gap-2">
            {data?.documents.map((document) => (
              <li key={document.id}>
                <Card>
                  <CardBody className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <FileText className="size-5 shrink-0 text-ink-500" aria-hidden />
                    <div className="min-w-[12rem] flex-1">
                      <p className="truncate font-medium text-ink-950">{document.filename}</p>
                      <p className="text-sm text-ink-600">
                        {DOCUMENT_FOLDER_LABELS[document.folder]} ·{' '}
                        {readableSize(document.byte_size)} · {formatDate(document.created_at)}
                      </p>
                    </div>
                    {document.is_system ? (
                      <Badge tone="moss">
                        <Lock className="mr-1 inline size-3" aria-hidden />
                        Permanent
                      </Badge>
                    ) : null}
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => void downloadDocument(document.id, document.filename)}
                    >
                      <Download className="size-4" aria-hidden />
                      Download
                    </Button>
                    {!document.is_system ? (
                      <button
                        type="button"
                        onClick={async () => {
                          await remove.run(document.id);
                          reload();
                        }}
                        className="rounded p-2 text-ink-500 hover:bg-clay-50 hover:text-clay-700"
                        aria-label={`Delete ${document.filename}`}
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </button>
                    ) : null}
                  </CardBody>
                </Card>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
