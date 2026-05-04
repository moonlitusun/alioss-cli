import { describe, expect, test } from 'bun:test';
import { buildClientConfig } from '../src/oss-client';

describe('OSS client configuration', () => {
  test('uses the selected bucket region when creating a bucket client', () => {
    const config = buildClientConfig(
      {
        accessKeyId: 'id',
        accessKeySecret: 'secret',
        region: 'oss-cn-shenzhen',
      },
      'diary-note',
      'oss-cn-shanghai'
    );

    expect(config).toMatchObject({
      accessKeyId: 'id',
      accessKeySecret: 'secret',
      region: 'oss-cn-shanghai',
      bucket: 'diary-note',
    });
  });
});
