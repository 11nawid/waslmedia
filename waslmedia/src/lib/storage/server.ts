import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import type { PutObjectCommandInput } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { buildStorageReference, normalizeObjectKey } from './shared';
import { getStorageRuntimeConfig } from '@/server/utils/runtime-config';

const storageConfig = getStorageRuntimeConfig();

export const storageClient = new S3Client({
  region: 'us-east-1',
  endpoint: storageConfig.endpoint,
  forcePathStyle: true,
  credentials: {
    accessKeyId: storageConfig.accessKeyId,
    secretAccessKey: storageConfig.secretAccessKey,
  },
});

const publicStorageClient = new S3Client({
  region: 'us-east-1',
  endpoint: storageConfig.publicEndpoint,
  forcePathStyle: true,
  credentials: {
    accessKeyId: storageConfig.accessKeyId,
    secretAccessKey: storageConfig.secretAccessKey,
  },
});

export async function uploadObjectToStorage(params: {
  bucket: string;
  objectKey: string;
  body: NonNullable<PutObjectCommandInput['Body']>;
  contentType?: string;
  contentLength?: number;
}) {
  const objectKey = normalizeObjectKey(params.objectKey);

  await storageClient.send(
    new PutObjectCommand({
      Bucket: params.bucket,
      Key: objectKey,
      Body: params.body,
      ContentType: params.contentType || 'application/octet-stream',
      ContentLength: params.contentLength,
    })
  );

  return {
    bucket: params.bucket,
    objectKey,
    storageRef: buildStorageReference(params.bucket, objectKey),
  };
}

export async function createSignedUploadUrl(params: {
  bucket: string;
  objectKey: string;
  contentType?: string;
  expiresInSeconds?: number;
}) {
  const objectKey = normalizeObjectKey(params.objectKey);
  const command = new PutObjectCommand({
    Bucket: params.bucket,
    Key: objectKey,
    ContentType: params.contentType || 'application/octet-stream',
  });

  const url = await getSignedUrl(publicStorageClient, command, {
    expiresIn: params.expiresInSeconds ?? 300,
  });

  return {
    url,
    method: 'PUT' as const,
    headers: {
      'Content-Type': params.contentType || 'application/octet-stream',
    },
    bucket: params.bucket,
    objectKey,
    storageRef: buildStorageReference(params.bucket, objectKey),
  };
}

export async function deleteObjectFromStorage(bucket: string, objectKey: string) {
  await storageClient.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: normalizeObjectKey(objectKey),
    })
  );
}

export async function getObjectFromStorage(params: { bucket: string; objectKey: string; range?: string }) {
  return storageClient.send(
    new GetObjectCommand({
      Bucket: params.bucket,
      Key: normalizeObjectKey(params.objectKey),
      Range: params.range,
    })
  );
}
