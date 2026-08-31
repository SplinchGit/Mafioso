const API_BASE = import.meta.env.VITE_API_ENDPOINT || '';

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem('auth_token');
  const apiPath = path.startsWith('/api/') ? path : `/api${path}`;

  return fetch(`${API_BASE}${apiPath}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });
}
