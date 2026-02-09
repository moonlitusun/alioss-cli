import 'dotenv/config';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { getCredentials, saveConfig, loadConfig, getConfigPath } from './config';

const args = process.argv.slice(2);

async function main() {
  if (args[0] === 'set') {
    await handleSet();
    return;
  }

  if (args[0] === 'get') {
    handleGet();
    return;
  }

  if (args[0] === 'config') {
    console.log(chalk.gray(`Config file: ${getConfigPath()}`));
    return;
  }

  if (args[0] === 'help' || args[0] === '--help' || args[0] === '-h') {
    showHelp();
    return;
  }

  console.log(chalk.cyan.bold('\n🚀 Ali OSS Upload Tool\n'));

  const creds = getCredentials();
  if (!creds) {
    console.log(chalk.yellow('⚠️  No OSS credentials found.\n'));
    console.log(chalk.gray('You can set credentials via:'));
    console.log(chalk.gray('  1. Environment variables: OSS_ACCESS_KEY_ID, OSS_ACCESS_KEY_SECRET'));
    console.log(chalk.gray('  2. Run: alioss set\n'));

    const { shouldSetup } = await inquirer.prompt<{ shouldSetup: boolean }>([
      {
        type: 'confirm',
        name: 'shouldSetup',
        message: 'Would you like to set up credentials now?',
        default: true,
      },
    ]);

    if (shouldSetup) {
      await handleSet();
      console.log('');
    } else {
      process.exit(1);
    }
  }

  const { startDashboard } = await import('./dashboard');
  startDashboard();
}

async function handleSet() {
  const config = loadConfig();

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'accessKeyId',
      message: 'Access Key ID:',
      default: config.accessKeyId || '',
    },
    {
      type: 'password',
      name: 'accessKeySecret',
      message: 'Access Key Secret:',
      default: config.accessKeySecret || '',
      mask: '*',
    },
    {
      type: 'input',
      name: 'region',
      message: 'Region:',
      default: config.region || 'oss-cn-hangzhou',
    },
  ]);

  saveConfig({
    accessKeyId: answers.accessKeyId,
    accessKeySecret: answers.accessKeySecret,
    region: answers.region,
  });

  console.log(chalk.green('\n✓ Credentials saved!\n'));
}

function handleGet() {
  const config = loadConfig();
  console.log(chalk.cyan('\nStored Configuration:\n'));
  console.log(`  Access Key ID: ${config.accessKeyId ? chalk.green(maskString(config.accessKeyId)) : chalk.gray('(not set)')}`);
  console.log(`  Access Key Secret: ${config.accessKeySecret ? chalk.green('********') : chalk.gray('(not set)')}`);
  console.log(`  Region: ${config.region ? chalk.green(config.region) : chalk.gray('(default: oss-cn-hangzhou)')}`);
  console.log(`  Last Bucket: ${config.lastBucket ? chalk.green(config.lastBucket) : chalk.gray('(none)')}`);
  console.log(`  Last Path: ${config.lastPath ? chalk.green(config.lastPath) : chalk.gray('/')}`);
  console.log('');
}

function maskString(str: string): string {
  if (str.length <= 8) return '****';
  return str.slice(0, 4) + '****' + str.slice(-4);
}

function showHelp() {
  console.log(chalk.cyan.bold('\n🚀 Ali OSS Upload Tool\n'));
  console.log('Usage: alioss [command]\n');
  console.log('Commands:');
  console.log('  (none)     Start interactive upload dashboard');
  console.log('  set        Configure OSS credentials');
  console.log('  get        Show current configuration');
  console.log('  config     Show config file path');
  console.log('  help       Show this help message');
  console.log('\nEnvironment Variables:');
  console.log('  OSS_ACCESS_KEY_ID      Access Key ID');
  console.log('  OSS_ACCESS_KEY_SECRET  Access Key Secret');
  console.log('  OSS_REGION             Region (default: oss-cn-hangzhou)');
  console.log('');
}

main().catch(console.error);
