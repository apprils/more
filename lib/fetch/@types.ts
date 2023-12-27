
export type Config = {
  unref: (payload: any) => any;
  responseMode: ResponseMode;
  errorHandler?: (e: any) => void;
}

export type GenericObject = Record<string, any>

export type APIMethod =
  | "get"
  | "post"
  | "put"
  | "patch"
  | "delete"

export type ResponseMode =
  | "json"
  | "text"
  | "blob"
  | "formData"
  | "arrayBuffer"
  | "raw"

export type Options = Pick<
  RequestInit,
  | "cache"
  | "credentials"
  | "headers"
  | "integrity"
  | "keepalive"
  | "mode"
  | "redirect"
  | "referrer"
  | "referrerPolicy"
  | "signal"
  | "window"
> & {
  unref?: Function;
  stringify?: Function;
  responseMode?: ResponseMode;
  errorHandler?: (e: any) => void;
}

export type FetchMethod = <
  T = unknown,
>(...a: any[]) => Promise<T>

export type FetchMapper = Record<APIMethod | "del", FetchMethod>

export interface HTTPError<T = any> extends Error {
  body: T;
  response: Response;
}

