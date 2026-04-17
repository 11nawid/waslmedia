import { parseStorageUrl } from './shared';

export async function uploadFileToStorage(params: {
  bucket: string;
  objectKey: string;
  file: File;
  intentScope?: 'default' | 'signup-profile';
  mediaKind?: 'long' | 'short';
}) {
  const intentResponse = await fetch('/api', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'upload-intent',
      bucket: params.bucket,
      filename: params.file.name,
      contentType: params.file.type,
      scope: params.intentScope || 'default',
      mediaKind: params.mediaKind || null,
    }),
  });

  if (!intentResponse.ok) {
    const payload = await intentResponse.json().catch(() => null);
    throw new Error(payload?.error || 'Upload intent failed.');
  }

  const intentPayload = await intentResponse.json();
  const formData = new FormData();
  formData.append('token', String(intentPayload.token || ''));
  formData.append('file', params.file);

  const response = await fetch('/api/storage/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error || 'Upload failed.');
  }

  return response.json();
}

export async function deleteStorageObject(params: { bucket: string; objectKey: string }) {
  const response = await fetch('/api/storage/delete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error || 'Delete failed.');
  }
}

export async function deleteStorageObjectByUrl(fileUrl: string) {
  if (!parseStorageUrl(fileUrl)) {
    return;
  }

  const response = await fetch('/api/storage/delete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fileUrl }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error || 'Delete failed.');
  }
}
