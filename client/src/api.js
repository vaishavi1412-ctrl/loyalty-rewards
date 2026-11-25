// One helper for talking to the server. Every request sends the custom header
// the server requires, and errors carry the server's friendly message.
export async function api(path, { method = 'GET', body } = {}) {
  const headers = { 'X-Requested-With': 'fetch' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch('/api' + path, {
    method,
    credentials: 'same-origin',
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* no JSON body */ }
  if (!res.ok) {
    const err = new Error((data && data.error) || 'Something went wrong. Please try again.');
    err.status = res.status;
    err.code = data && data.code;
    throw err;
  }
  return data;
}

export const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString() : '-');
