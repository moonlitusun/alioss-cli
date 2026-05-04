import fs from 'fs';
import path from 'path';
import os from 'os';

interface Config {
  lastBucket: string | null;
  lastPath: string;
  lastBucketRegion?: string;
  accessKeyId?: string;
  accessKeySecret?: string;
  region?: string;
}

const CONFIG_FILE = path.join(os.homedir(), '.alioss-config.json');
export const DEFAULT_REGION = 'oss-cn-shenzhen';

export function loadConfig(): Config {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch {}
  return { lastBucket: null, lastPath: '' };
}

export function saveConfig(config: Partial<Config>): void {
  try {
    const existing = loadConfig();
    const merged = { ...existing, ...config };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2));
  } catch {}
}

export function getCredentials(): { accessKeyId: string; accessKeySecret: string; region: string } | null {
  const config = loadConfig();
  
  const accessKeyId = process.env.OSS_ACCESS_KEY_ID || config.accessKeyId;
  const accessKeySecret = process.env.OSS_ACCESS_KEY_SECRET || config.accessKeySecret;
  const region = process.env.OSS_REGION || config.region || DEFAULT_REGION;

  if (accessKeyId && accessKeySecret) {
    return { accessKeyId, accessKeySecret, region };
  }
  return null;
}

export function setCredential(key: string, value: string): void {
  const config = loadConfig();
  if (key === 'accessKeyId' || key === 'accessKeySecret' || key === 'region') {
    (config as any)[key] = value;
    saveConfig(config);
  }
}

export function getConfigPath(): string {
  return CONFIG_FILE;
}
