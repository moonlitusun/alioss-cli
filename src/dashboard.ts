import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import fs from 'fs';
import { listBuckets, listFiles, initClient } from './oss-client';
import { uploadLocalFile, uploadFromClipboard } from './uploader';
import { loadConfig, saveConfig } from './config';

interface FileItem {
  type: 'file';
  name: string;
  path: string;
  size: number;
  lastModified: string;
}

interface Selection {
  action: 'parent' | 'enter' | 'switch_bucket' | 'upload' | 'clipboard' | 'file' | 'exit';
  path?: string;
  file?: FileItem;
}

let currentBucket: string | null = null;
let currentPath: string = '';
let navigationStack: Array<{ bucket: string | null; path: string }> = [];

function pushState() {
  navigationStack.push({ bucket: currentBucket, path: currentPath });
}

function popState(): boolean {
  const prev = navigationStack.pop();
  if (prev) {
    currentBucket = prev.bucket;
    currentPath = prev.path;
    return true;
  }
  return false;
}

export async function startDashboard(): Promise<void> {
  const config = loadConfig();
  
  if (config.lastBucket) {
    try {
      const { useLastLocation } = await inquirer.prompt<{ useLastLocation: boolean }>([
        {
          type: 'confirm',
          name: 'useLastLocation',
          message: `Use last location? ${chalk.cyan(config.lastBucket + ':' + (config.lastPath || '/'))}`,
          default: true,
        },
      ]);

      if (useLastLocation) {
        currentBucket = config.lastBucket;
        currentPath = config.lastPath;
        initClient(currentBucket);
        console.log(chalk.green(`✓ Restored: ${currentBucket}:${currentPath || '/'}\n`));
        await browseDirectory();
        return;
      }
    } catch {
      console.log(chalk.gray('\n(Cancelled)\n'));
      process.exit(0);
    }
  }

  await selectBucket();
}

async function selectBucket(): Promise<void> {
  const spinner = ora('Fetching bucket list...').start();

  try {
    const buckets = await listBuckets();
    spinner.stop();

    if (buckets.length === 0) {
      console.log(chalk.yellow('No buckets found'));
      return;
    }

    const config = loadConfig();
    const choices = buckets.map(b => ({
      name: `${b.name} (${b.region})${b.name === config.lastBucket ? chalk.green(' [last]') : ''}`,
      value: b.name,
    }));

    const defaultIndex = buckets.findIndex(b => b.name === config.lastBucket);

    try {
      const { bucket } = await inquirer.prompt<{ bucket: string }>([
        {
          type: 'list',
          name: 'bucket',
          message: 'Select Bucket (Ctrl+C to exit):',
          choices,
          default: defaultIndex >= 0 ? defaultIndex : 0,
        },
      ]);

      pushState();
      currentBucket = bucket;
      currentPath = '';
      initClient(bucket);
      saveConfig({ lastBucket: bucket, lastPath: '' });
      console.log(chalk.green(`✓ Selected Bucket: ${bucket}\n`));

      await browseDirectory();
    } catch {
      console.log(chalk.cyan('\n👋 Goodbye!\n'));
      process.exit(0);
    }
  } catch (error) {
    spinner.stop();
    console.log(chalk.red(`Failed to fetch buckets: ${(error as Error).message}`));
  }
}

async function browseDirectory(): Promise<void> {
  const spinner = ora('Loading directory...').start();

  try {
    const { directories, files } = await listFiles(currentPath);
    spinner.stop();

    saveConfig({ lastBucket: currentBucket, lastPath: currentPath });

    const choices: Array<{ name: string; value: Selection } | inquirer.Separator> = [];

    if (currentPath) {
      choices.push({
        name: chalk.yellow('📁 .. (Go back)'),
        value: { action: 'parent' },
      });
    }

    choices.push({
      name: chalk.cyan('🔄 Switch Bucket'),
      value: { action: 'switch_bucket' },
    });

    choices.push({
      name: chalk.green('📤 Upload File'),
      value: { action: 'upload' },
    });

    choices.push({
      name: chalk.green('📋 Upload from Clipboard'),
      value: { action: 'clipboard' },
    });

    choices.push(new inquirer.Separator());

    directories.forEach(dir => {
      choices.push({
        name: chalk.blue(`📁 ${dir.name}/`),
        value: { action: 'enter', path: dir.path },
      });
    });

    files.forEach(file => {
      const size = formatSize(file.size);
      choices.push({
        name: chalk.gray(`📄 ${file.name} (${size})`),
        value: { action: 'file', file },
      });
    });

    choices.push(new inquirer.Separator());
    choices.push({
      name: chalk.red('❌ Exit'),
      value: { action: 'exit' },
    });

    const displayPath = currentPath || '/';
    console.log(chalk.cyan(`\nCurrent location: ${currentBucket}:${displayPath}`));
    console.log(chalk.gray('(Press Ctrl+C to go back)\n'));

    try {
      const { selection } = await inquirer.prompt<{ selection: Selection }>([
        {
          type: 'list',
          name: 'selection',
          message: 'Select action:',
          choices,
          pageSize: 20,
        },
      ]);

      await handleSelection(selection);
    } catch {
      if (currentPath) {
        const parts = currentPath.split('/').filter(Boolean);
        parts.pop();
        currentPath = parts.length ? parts.join('/') + '/' : '';
        console.log(chalk.gray('\n(Going back...)\n'));
        await browseDirectory();
      } else {
        console.log(chalk.gray('\n(Switching bucket...)\n'));
        await selectBucket();
      }
    }
  } catch (error) {
    spinner.stop();
    console.log(chalk.red(`Failed to load directory: ${(error as Error).message}`));
    await browseDirectory();
  }
}

async function handleSelection(selection: Selection): Promise<void> {
  switch (selection.action) {
    case 'parent':
      const parts = currentPath.split('/').filter(Boolean);
      parts.pop();
      currentPath = parts.length ? parts.join('/') + '/' : '';
      await browseDirectory();
      break;

    case 'enter':
      pushState();
      currentPath = selection.path!;
      await browseDirectory();
      break;

    case 'switch_bucket':
      currentPath = '';
      await selectBucket();
      break;

    case 'upload':
      await handleUpload();
      break;

    case 'clipboard':
      await handleClipboardUpload();
      break;

    case 'file':
      console.log(chalk.gray(`\nFile: ${selection.file!.name}`));
      console.log(chalk.gray(`Size: ${formatSize(selection.file!.size)}`));
      console.log(chalk.gray(`Modified: ${selection.file!.lastModified}\n`));
      await browseDirectory();
      break;

    case 'exit':
      console.log(chalk.cyan('\n👋 Goodbye!\n'));
      process.exit(0);
      break;

    default:
      await browseDirectory();
  }
}

async function handleUpload(): Promise<void> {
  try {
    const { localPath } = await inquirer.prompt<{ localPath: string }>([
      {
        type: 'input',
        name: 'localPath',
        message: 'Enter local file path (Ctrl+C to cancel):',
        validate: (input: string) => {
          const absPath = path.resolve(input);
          if (!fs.existsSync(absPath)) {
            return 'File does not exist';
          }
          if (fs.statSync(absPath).isDirectory()) {
            return 'Please select a file, not a directory';
          }
          return true;
        },
      },
    ]);

    const absPath = path.resolve(localPath);
    const fileName = path.basename(absPath);

    const { confirmName } = await inquirer.prompt<{ confirmName: string }>([
      {
        type: 'input',
        name: 'confirmName',
        message: 'Remote file name:',
        default: fileName,
      },
    ]);

    const remotePath = currentPath + confirmName;

    const spinner = ora('Uploading...').start();
    try {
      const result = await uploadLocalFile(absPath, remotePath);
      spinner.succeed(chalk.green(`Upload successful!`));
      console.log(chalk.gray(`URL: ${result.url}\n`));
    } catch (error) {
      spinner.fail(chalk.red(`Upload failed: ${(error as Error).message}`));
    }
  } catch {
    console.log(chalk.gray('\n(Cancelled)\n'));
  }

  await browseDirectory();
}

async function handleClipboardUpload(): Promise<void> {
  try {
    const { fileName } = await inquirer.prompt<{ fileName: string }>([
      {
        type: 'input',
        name: 'fileName',
        message: 'Save as file name (Ctrl+C to cancel):',
        default: `clipboard_${Date.now()}.png`,
      },
    ]);

    const remotePath = currentPath + fileName;

    const spinner = ora('Uploading from clipboard...').start();
    try {
      const result = await uploadFromClipboard(remotePath);
      spinner.succeed(chalk.green(`Upload successful!`));
      console.log(chalk.gray(`URL: ${result.url}\n`));
    } catch (error) {
      spinner.fail(chalk.red(`Upload failed: ${(error as Error).message}`));
    }
  } catch {
    console.log(chalk.gray('\n(Cancelled)\n'));
  }

  await browseDirectory();
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
