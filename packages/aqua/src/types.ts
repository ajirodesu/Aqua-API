import type { Application, Request, Response } from 'express';

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
  type?: 'text' | 'number' | 'textarea' | 'select' | 'image' | 'file' | 'audio' | 'video';
}

/** Metadata attached to every endpoint module, used for routing + docs generation. */
export interface ApiMeta {
  name: string;
  desc: string;
  method: HttpMethod | HttpMethod[];
  category: string;
  params?: ApiParam[];
}

export interface HandlerContext {
  req: Request;
  res: Response;
  app: Application;
  config: AquaConfig;
  meta: ApiMeta;
  logger: Logger;
}

export type ApiHandler = (ctx: HandlerContext) => unknown | Promise<unknown>;

export interface ApiModule {
  meta: ApiMeta;
  onStart?: ApiHandler;
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
