import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { contentDisposition } from '../modules/documents/routes.js';
import { TestClient, uniqueEmail } from './client.js';

let client: TestClient;

beforeAll(async () => {
  client = await TestClient.create();
  await client.post('/api/auth/signup', {
    legalName: 'Vault Owner',
    artistName: 'Vault',
    email: uniqueEmail('vault'),
    password: 'correct horse battery staple',
    country: 'United States',
    isOfAge: true,
  });
});

afterAll(async () => {
  await client?.close();
});

describe('content-disposition', () => {
  it('survives the em dash that every generated agreement filename contains', () => {
    const header = contentDisposition('Single Song Collaboration Agreement — Song (signed).md');
    // A non-ASCII byte in a header value makes Node refuse to send the response at all.
    expect(header).not.toMatch(/[^\x20-\x7E]/);
    expect(header).toContain("filename*=UTF-8''");
    expect(decodeURIComponent(header.split("filename*=UTF-8''")[1] ?? '')).toContain('—');
  });

  it('neutralises quotes and backslashes in the ASCII fallback', () => {
    const header = contentDisposition('we"ird\\name.md');
    expect(header).toContain('attachment; filename="weirdname.md"');
  });
});

describe('the document vault', () => {
  it('stores, lists and returns a file', async () => {
    const upload = await client.post<{ document: { id: string } }>('/api/documents', {
      folder: 'masters',
      filename: 'rough-mix — take 3.txt',
      contentType: 'text/plain',
      data: Buffer.from('not really a wav').toString('base64'),
    });
    expect(upload.status).toBe(201);

    const listed = await client.get<{
      folders: { key: string; count: number }[];
      documents: { id: string; folder: string; filename: string; byte_size: number }[];
    }>('/api/documents?folder=masters');
    expect(listed.body.documents).toHaveLength(1);
    expect(listed.body.documents[0]?.byte_size).toBe(16);

    const download = await client.get(`/api/documents/${upload.body.document.id}/content`);
    expect(download.status).toBe(200);
    expect(download.raw).toBe('not really a wav');
  });

  it('refuses an empty file', async () => {
    const response = await client.post('/api/documents', {
      folder: 'songs',
      filename: 'nothing.txt',
      contentType: 'text/plain',
      data: '',
    });
    expect(response.status).toBe(400);
  });

  it("will not hand one artist another artist's document", async () => {
    const upload = await client.post<{ document: { id: string } }>('/api/documents', {
      folder: 'songs',
      filename: 'private.txt',
      contentType: 'text/plain',
      data: Buffer.from('mine').toString('base64'),
    });

    const other = await TestClient.create();
    await other.post('/api/auth/signup', {
      legalName: 'Someone Else',
      artistName: 'Else',
      email: uniqueEmail('else'),
      password: 'correct horse battery staple',
      country: 'United States',
      isOfAge: true,
    });
    const response = await other.get(`/api/documents/${upload.body.document.id}/content`);
    expect(response.status).toBe(403);
    await other.close();
  });
});
