import { describe, expect, test } from 'bun:test';
import packageJson from '../package.json';

describe('package metadata', () => {
  test('publishes the documented package and command names', () => {
    expect(packageJson.name).toBe('alioss-upload2');
    expect(packageJson.bin).toEqual({
      alioss: './bin/alioss',
      'alioss-upload2': './bin/alioss',
    });
  });
});
