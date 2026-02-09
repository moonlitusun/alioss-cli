import OSS from 'ali-oss';
import { getCredentials } from './config';

interface FileItem {
  type: 'file';
  name: string;
  path: string;
  size: number;
  lastModified: string;
}

interface DirectoryItem {
  type: 'directory';
  name: string;
  path: string;
}

interface ListResult {
  directories: DirectoryItem[];
  files: FileItem[];
}

let client: OSS | null = null;

export function initClient(bucket: string | null = null): OSS {
  const creds = getCredentials();
  if (!creds) {
    throw new Error('No credentials configured');
  }

  const config: any = {
    region: creds.region,
    accessKeyId: creds.accessKeyId,
    accessKeySecret: creds.accessKeySecret,
  };

  if (bucket) {
    config.bucket = bucket;
  }

  client = new OSS(config);
  return client;
}

export async function listBuckets(): Promise<OSS.Bucket[]> {
  if (!client) initClient();
  const result = await client!.listBuckets({});
  return result.buckets || [];
}

export async function listFiles(prefix: string = '', bucket: string | null = null): Promise<ListResult> {
  if (bucket) {
    initClient(bucket);
  }

  const result = await client!.list({
    prefix: prefix,
    delimiter: '/',
    'max-keys': 100,
  }, {});

  const directories: DirectoryItem[] = (result.prefixes || []).map((p: string) => ({
    type: 'directory' as const,
    name: p.replace(prefix, '').replace(/\/$/, ''),
    path: p,
  }));

  const files: FileItem[] = (result.objects || [])
    .filter((obj: OSS.ObjectMeta) => obj.name !== prefix)
    .map((obj: OSS.ObjectMeta) => ({
      type: 'file' as const,
      name: obj.name.replace(prefix, ''),
      path: obj.name,
      size: obj.size,
      lastModified: obj.lastModified,
    }));

  return { directories, files };
}

export async function uploadFile(localPath: string, remotePath: string): Promise<OSS.PutObjectResult> {
  if (!client) {
    throw new Error('Please select a bucket first');
  }
  const result = await client.put(remotePath, localPath);
  return result;
}

export async function uploadBuffer(
  buffer: Buffer,
  remotePath: string,
  options: OSS.PutObjectOptions = {}
): Promise<OSS.PutObjectResult> {
  if (!client) {
    throw new Error('Please select a bucket first');
  }
  const result = await client.put(remotePath, buffer, options);
  return result;
}

export function getCurrentBucket(): string | null {
  return (client as any)?.options?.bucket || null;
}

export { client };
