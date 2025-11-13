const base = '/backend';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    headers: {
      'Content-Type': 'application/json'
    },
    ...init
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }

  if (res.status === 204) {
    return {} as T;
  }

  return res.json() as Promise<T>;
}

export const pingApi = () => request<{ ok: boolean }>('/ping');
export const fetchVisits = () => request<{ count: number }>('/visits');
export const addVisit = () => request<{ count: number }>('/visits', {
  method: 'POST'
});
