# alioss

A simple CLI tool for uploading files to Alibaba Cloud OSS with an interactive dashboard.

## Installation

```bash
npm install -g alioss-upload2
```

Or with bun:

```bash
bun install -g alioss-upload2
```

## Quick Start

```bash
# First run - will prompt for credentials
alioss

# Equivalent command name
alioss-upload2

# Or set credentials manually
alioss set
```

## Commands

| Command | Description |
|---------|-------------|
| `alioss` / `alioss-upload2` | Start interactive upload dashboard |
| `alioss set` | Configure OSS credentials |
| `alioss get` | Show current configuration |
| `alioss config` | Show config file path |
| `alioss help` | Show help message |

## Configuration

### Option 1: Interactive Setup

```bash
alioss set
```

This will prompt you for:
- Access Key ID
- Access Key Secret
- Region (default: oss-cn-shenzhen)

Credentials are stored in `~/.alioss-config.json`.

### Option 2: Environment Variables

```bash
export OSS_ACCESS_KEY_ID=your_access_key_id
export OSS_ACCESS_KEY_SECRET=your_access_key_secret
export OSS_REGION=oss-cn-shenzhen  # optional
```

Environment variables take precedence over stored config.

## Features

- 📁 **Browse buckets and directories**
- 📤 **Upload local files**
- 📋 **Upload from clipboard** (macOS)
- 🔄 **Remember last location**
- ⌨️ **Keyboard navigation** (Ctrl+C to go back)

## Usage

1. Run `alioss` to start the dashboard
2. Select a bucket
3. Navigate to target directory
4. Choose "Upload File" or "Upload from Clipboard"

## License

MIT
