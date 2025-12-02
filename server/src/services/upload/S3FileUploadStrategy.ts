import { IFileUploadStrategy, UploadResult, FetchResult } from './IFileUploadStrategy';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import path from 'path';
import { Readable } from 'stream';

/**
 * S3 configuration interface
 */
interface S3Config {
  bucketName: string;
  region: string;
  endpoint?: string;
  accessKeyId: string;
  secretAccessKey: string;
}

/**
 * Load S3 configuration from environment variables
 */
const loadS3Config = (): S3Config => {
  const bucketName = process.env.AWS_S3_BUCKET_NAME || '';
  const region = process.env.AWS_S3_REGION || 'us-east-1';
  const endpoint = process.env.AWS_S3_ENDPOINT;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID || '';
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || '';

  if (!bucketName) {
    throw new Error('AWS_S3_BUCKET_NAME environment variable is required for S3 upload strategy');
  }

  return {
    bucketName,
    region,
    endpoint,
    accessKeyId,
    secretAccessKey,
  };
};

/**
 * Create S3 client from configuration
 */
const createS3Client = (config: S3Config): S3Client => {
  return new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
};

/**
 * Generate a unique S3 key (path) for the file
 */
const generateS3Key = (originalName: string): string => {
  const ext = path.extname(originalName);
  const uuid = randomUUID();
  const timestamp = Date.now();
  return `uploads/${timestamp}-${uuid}${ext}`;
};

/**
 * Construct S3 URL from bucket, region, endpoint, and key
 */
const constructS3Url = (
  bucketName: string,
  region: string,
  key: string,
  endpoint?: string
): string => {
  if (endpoint) {
    return `${endpoint}/${bucketName}/${key}`;
  }
  return `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
};

/**
 * Extract S3 key from URL
 * Handles both path-style and virtual-hosted-style URLs
 */
const extractS3Key = (url: string, bucketName: string): string => {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;

    // For path-style URLs: https://s3.region.amazonaws.com/bucket/key
    if (pathname.startsWith(`/${bucketName}/`)) {
      return pathname.substring(`/${bucketName}/`.length);
    }

    // For virtual-hosted-style URLs: https://bucket.s3.region.amazonaws.com/key
    // Or custom endpoint URLs: https://endpoint/bucket/key
    if (pathname.startsWith('/')) {
      return pathname.substring(1);
    }

    return pathname;
  } catch {
    // If URL parsing fails, assume it's already a key
    return url;
  }
};

/**
 * Upload a file to S3
 */
const uploadFile = (s3Client: S3Client, config: S3Config) => async (
  file: Express.Multer.File
): Promise<UploadResult> => {
  const key = generateS3Key(file.originalname);

  const command = new PutObjectCommand({
    Bucket: config.bucketName,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
    Metadata: {
      originalName: file.originalname,
    },
  });

  await s3Client.send(command);

  const url = constructS3Url(config.bucketName, config.region, key, config.endpoint);

  return {
    url,
    size: file.size,
    mimeType: file.mimetype,
    originalName: file.originalname,
  };
};

/**
 * Fetch a file from S3
 * NOTE : Ideally, I would prefer to use signed urls in production instead of streaming the file through my servers
 * for both security as well as scalability.
 * The reason for not doing so here, is to ensure consistency in the api response for both dev and prod envs.
 */
const fetchFile = (s3Client: S3Client, config: S3Config) => async (
  fileUrl: string
): Promise<FetchResult> => {
  const key = extractS3Key(fileUrl, config.bucketName);

  const command = new GetObjectCommand({
    Bucket: config.bucketName,
    Key: key,
  });

  const response = await s3Client.send(command);

  if (!response.Body) {
    throw new Error('Failed to fetch file from S3');
  }

  // Get metadata
  const mimeType = response.ContentType || 'application/octet-stream';
  const size = response.ContentLength || 0;
  const originalName = response.Metadata?.originalName || path.basename(key);

  // Convert Body to Readable stream
  const stream = response.Body as Readable;

  return {
    stream,
    mimeType,
    size,
    filename: originalName,
  };
};

/**
 * Delete a file from S3
 */
const deleteFile = (s3Client: S3Client, config: S3Config) => async (
  fileUrl: string
): Promise<void> => {
  const key = extractS3Key(fileUrl, config.bucketName);

  const command = new DeleteObjectCommand({
    Bucket: config.bucketName,
    Key: key,
  });

  await s3Client.send(command);
};

/**
 * Create an S3 file upload strategy
 * Factory function that returns an implementation of IFileUploadStrategy
 */
export const createS3FileUploadStrategy = (): IFileUploadStrategy => {
  const config = loadS3Config();
  const s3Client = createS3Client(config);

  return {
    upload: uploadFile(s3Client, config),
    fetch: fetchFile(s3Client, config),
    delete: deleteFile(s3Client, config),
  };
};
