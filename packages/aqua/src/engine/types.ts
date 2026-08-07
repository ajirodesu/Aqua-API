import type { Context } from 'elysia';

/** HTTP verbs supported by the dynamic endpoint loader. */
export type HttpMethod = 'get' | 'post' | 'put' | 'delete' | 'patch';

/** Describes a single form/query parameter accepted by an endpoint. */
export interface ApiParam {
  name: string;
  desc: string;
  example?: string;
  required?: boolean;
  options?: string[];
  /** UI hint for how the docs frontend should render the input. */
  type?: 'text' | 'number' | 'textarea' | 'select' | 'image' | 'file' | 'audio' | 'video' | 'password';
  /** Pre-filled value the docs frontend should use before the user touches this field (e.g. a select's implicit default). */
  default?: string;
  /** Only show this param in the docs frontend when another param currently holds one of these values. */
  dependsOn?: { param: string; value: string | string[] };
}

/** Metadata attached to every endpoint module, used for routing + docs generation. */
export interface ApiMeta {
  name: string;
  desc: string;
  method: HttpMethod | HttpMethod[];
  category: string;
  version?: string;
  author?: string;
  usage?: string;
  cooldown?: number;
  params?: ApiParam[];
}

/** Singleton that the Elysia app decorates onto every route handler's context. */
export type AppDecorators = {
  config: AquaConfig;
  logger: Logger;
} & Record<string, unknown>;

/**
 * Every endpoint handler receives this single object (Cat-Bot style) — it is
 * Elysia's real `Context`, decorated with `config` and `logger`. Handlers use
 * `ctx.query` / `ctx.body` / `ctx.request` / `ctx.set` and return Elysia values
 * (`new Response(...)`, plain objects, `set.status = 400`, etc.).
 */
export type EndpointCtx = Context<
  Record<string, unknown>,
  {
    decorator: AppDecorators;
    store: {};
    derive: {};
    resolve: {};
  }
>;

export type ApiHandler = (ctx: EndpointCtx) => unknown | Promise<unknown>;

export interface ApiModule {
  meta: ApiMeta;
  initialize?: ApiHandler;
}

export interface AquaConfig {
  name: string;
  description: string;
  key: string;
  header: {
    status: string;
    imageSrc: string[];
    imageSize: { mobile: string; tablet: string; desktop: string };
  };
  icon: string;
  operator: string;
  telegram?: string;
  messenger?: string;
  github?: string;
  [key: string]: unknown;
}

export interface Notification {
  id: number;
  title: string;
  message: string;
  createdAt: number;
}

export interface EndpointBucket {
  name: string;
  items: Array<
    ApiMeta & {
      path: string;
      methods: string[];
    }
  >;
}

export interface Logger {
  info: (message: string) => void;
  ready: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
  event: (message: string) => void;
}
