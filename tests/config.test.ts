import { afterEach, describe, expect, test } from 'bun:test';
import { DEFAULT_REGION, getCredentials } from '../src/config';

const originalRegion = process.env.OSS_REGION;
const originalAccessKeyId = process.env.OSS_ACCESS_KEY_ID;
const originalAccessKeySecret = process.env.OSS_ACCESS_KEY_SECRET;

afterEach(() => {
  process.env.OSS_REGION = originalRegion;
  process.env.OSS_ACCESS_KEY_ID = originalAccessKeyId;
  process.env.OSS_ACCESS_KEY_SECRET = originalAccessKeySecret;
});

describe('configuration defaults', () => {
  test('defaults OSS region to Shenzhen', () => {
    process.env.OSS_REGION = '';
    process.env.OSS_ACCESS_KEY_ID = 'id';
    process.env.OSS_ACCESS_KEY_SECRET = 'secret';

    expect(DEFAULT_REGION).toBe('oss-cn-shenzhen');
    expect(getCredentials()?.region).toBe('oss-cn-shenzhen');
  });
});
