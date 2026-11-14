export async function apiRequest<T>(
  path: string,
  token: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    body?: unknown;
  } = {}
): Promise<T> {
  const response = await fetch(path, {
    method: options.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    let errorMessage = `Request failed (${response.status})`;
    try {
      const data = (await response.json()) as { error?: string };
      if (data?.error) errorMessage = data.error;
    } catch {
      // Ignore JSON parse fallback
    }
    throw new Error(errorMessage);
  }

  return (await response.json()) as T;
}
