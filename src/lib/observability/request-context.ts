import { AsyncLocalStorage } from 'node:async_hooks';

export type RequestLogContext = {
  request_id: string;
  route: string;
  method: string;
};

const requestContext = new AsyncLocalStorage<RequestLogContext>();

export function withRequestLogContext<T>(context: RequestLogContext, callback: () => T): T {
  return requestContext.run(context, callback);
}

export function currentRequestLogContext(): RequestLogContext | undefined {
  return requestContext.getStore();
}
