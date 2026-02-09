import { uploadFile } from './oss-client';
import { execSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import type OSS from 'ali-oss';

export async function uploadLocalFile(localPath: string, remotePath: string): Promise<OSS.PutObjectResult> {
  return await uploadFile(localPath, remotePath);
}

export async function uploadFromClipboard(remotePath: string): Promise<OSS.PutObjectResult> {
  const tempFile = path.join(os.tmpdir(), `clipboard_${Date.now()}.png`);

  try {
    try {
      execSync(`pngpaste ${tempFile}`, { stdio: 'pipe' });
    } catch {
      const script = `
        set theFile to POSIX file "${tempFile}"
        try
          set imageData to the clipboard as «class PNGf»
          set fileRef to open for access theFile with write permission
          write imageData to fileRef
          close access fileRef
        on error
          try
            close access theFile
          end try
          error "No image in clipboard"
        end try
      `;
      execSync(`osascript -e '${script}'`, { stdio: 'pipe' });
    }

    if (!fs.existsSync(tempFile)) {
      throw new Error('No image in clipboard');
    }

    const result = await uploadFile(tempFile, remotePath);
    fs.unlinkSync(tempFile);

    return result;
  } catch (error) {
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
    throw new Error(`Failed to get image from clipboard: ${(error as Error).message}`);
  }
}
