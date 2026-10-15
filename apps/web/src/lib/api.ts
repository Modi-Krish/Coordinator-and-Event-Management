export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  // Get token from localStorage if in browser
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    if (res.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.reload();
    }

    // Attempt to parse error JSON
    let errorMsg = `API error: ${res.status} ${res.statusText}`;
    try {
      const errorData = await res.json();
      if (errorData.message) errorMsg = Array.isArray(errorData.message) ? errorData.message.join(', ') : errorData.message;
    } catch (_e) {}
    throw new Error(errorMsg);
  }

  return res.json();
}

export function getAttachmentUrl(fileUrl?: string | null): string {
  if (!fileUrl) return '';
  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
    return fileUrl;
  }
  const cleanPath = fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`;
  return `${API_URL}${cleanPath}`;
}

export async function uploadIssueAttachment(issueId: string, file: File) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const formData = new FormData();
  formData.append('file', file);

  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}/issues/${issueId}/attachments`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!res.ok) {
    let errorMsg = `Upload error: ${res.status} ${res.statusText}`;
    try {
      const err = await res.json();
      if (err.message) errorMsg = Array.isArray(err.message) ? err.message.join(', ') : err.message;
    } catch (_e) {}
    throw new Error(errorMsg);
  }

  return res.json();
}
