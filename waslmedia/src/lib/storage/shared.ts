export function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export function normalizeObjectKey(objectKey: string) {
  return objectKey.replace(/^\/+/, '');
}

export function buildStorageReference(bucket: string, objectKey: string) {
  return `storage://${bucket}/${normalizeObjectKey(objectKey)}`;
}

export function parseStorageReference(fileUrl: string) {
  const normalized = fileUrl.trim();
  if (!normalized.startsWith('storage://')) {
    return null;
  }

  const withoutScheme = normalized.slice('storage://'.length);
  const [bucket, ...rest] = withoutScheme.replace(/^\/+/, '').split('/');
  if (!bucket || rest.length === 0) {
    return null;
  }

  return {
    bucket,
    objectKey: normalizeObjectKey(rest.join('/')),
  };
}

export function getPublicStorageBaseUrl() {
  return (process.env.STORAGE_PUBLIC_URL || 'http://localhost:9000').replace(/\/+$/, '');
}

export function buildPublicObjectUrl(bucket: string, objectKey: string) {
  return `${getPublicStorageBaseUrl()}/${bucket}/${normalizeObjectKey(objectKey)}`;
}

export function parseStorageUrl(fileUrl: string) {
  const storageReference = parseStorageReference(fileUrl);
  if (storageReference) {
    return storageReference;
  }

  try {
    const url = new URL(fileUrl);
    const parts = url.pathname.replace(/^\/+/, '').split('/');
    const [bucket, ...rest] = parts;

    if (!bucket || rest.length === 0) {
      return null;
    }

    return {
      bucket,
      objectKey: normalizeObjectKey(rest.join('/')),
    };
  } catch {
    return null;
  }
}
