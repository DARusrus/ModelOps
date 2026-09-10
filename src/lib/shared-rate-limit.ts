type RpcClient = { rpc: (name: string, args: Record<string, unknown>) => PromiseLike<{ data: boolean | null; error: unknown }> };

export async function consumeSharedRateLimit(client: RpcClient, route: string, maxRequests: number, windowSeconds: number): Promise<boolean> {
  const { data, error } = await client.rpc('consume_rate_limit', {
    p_route: route,
    p_max_requests: maxRequests,
    p_window_seconds: windowSeconds,
  });
  if (error || data === null) throw new Error('RATE_LIMIT_UNAVAILABLE');
  return data;
}
