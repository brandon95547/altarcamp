import type { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';

/**
 * A tiny cookie-aware client over Fastify's inject, so tests exercise the real routes,
 * plugins, validation and database without binding a port.
 */
export class TestClient {
  private cookies = new Map<string, string>();

  constructor(private readonly app: FastifyInstance) {}

  static async create(): Promise<TestClient> {
    const app = await buildApp();
    await app.ready();
    return new TestClient(app);
  }

  async close(): Promise<void> {
    await this.app.close();
  }

  private cookieHeader(): string | undefined {
    if (this.cookies.size === 0) return undefined;
    return [...this.cookies.entries()].map(([name, value]) => `${name}=${value}`).join('; ');
  }

  private absorb(setCookie: string | string[] | undefined): void {
    if (!setCookie) return;
    for (const raw of Array.isArray(setCookie) ? setCookie : [setCookie]) {
      const [pair] = raw.split(';');
      const [name, ...rest] = (pair ?? '').split('=');
      if (!name) continue;
      const value = rest.join('=');
      if (!value) this.cookies.delete(name);
      else this.cookies.set(name, value);
    }
  }

  async request<T = unknown>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    url: string,
    payload?: unknown,
  ): Promise<{ status: number; body: T; raw: string }> {
    const response = await this.app.inject({
      method,
      url,
      payload: payload as never,
      headers: {
        ...(this.cookieHeader() ? { cookie: this.cookieHeader() as string } : {}),
        'user-agent': 'altar-tests',
      },
    });
    this.absorb(response.headers['set-cookie'] as string | string[] | undefined);
    let body: unknown = null;
    try {
      body = response.json();
    } catch {
      body = response.body;
    }
    return { status: response.statusCode, body: body as T, raw: response.body };
  }

  get = <T = unknown>(url: string) => this.request<T>('GET', url);
  post = <T = unknown>(url: string, payload?: unknown) => this.request<T>('POST', url, payload);
  put = <T = unknown>(url: string, payload?: unknown) => this.request<T>('PUT', url, payload);
  patch = <T = unknown>(url: string, payload?: unknown) => this.request<T>('PATCH', url, payload);
  delete = <T = unknown>(url: string, payload?: unknown) => this.request<T>('DELETE', url, payload);

  clearCookies(): void {
    this.cookies.clear();
  }
}

let counter = 0;
export function uniqueEmail(prefix = 'artist'): string {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}@example.test`;
}

export const SIGNING_AFFIRMATION_KEYS = [
  'reviewed_summary',
  'understand_master',
  'understand_songwriting',
  'understand_revenue',
  'understand_recoupment',
  'legal_advice',
];
