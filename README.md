# st-kimai-cli

CLI tool for Kimai time-tracking API with smart features like pause detection and quick entry.

## Installation

```bash
npm install -g st-kimai-cli
# or
git clone <repo>
cd st-kimai-cli
npm install
npm run link
```

## Configuration

Create `~/.kimai-cli/auth.json`:

```json
{
  "url": "https://your-kimai-server.com",
  "apiKey": "your-api-key"
}
```

Or use environment variables:

```bash
export KIMAI_URL="https://your-kimai-server.com"
export KIMAI_API_KEY="your-api-key"
```

## Usage

### Quick Entry (fastest)

```bash
kimai-cli quick "Meeting" -m 30     # 30 minutes
kimai-cli quick "Working on X"       # 1 hour default
```

### Log Entry

```bash
kimai-cli log "Working on X" -m 45
```

### Add Entry (full options)

```bash
kimai-cli add -p 5 -a 4 -d "Description" -b "2024-05-21T09:00" -e "2024-05-21T17:00"
```

### Copy Entry

```bash
kimai-cli copy 12345 -d 1 -c 5   # Copy entry 12345, +1 day, 5 copies
```

### Interactive Timer

```bash
kimai-cli timer -p 5 -a 4 -d "Working"
# Press Ctrl+C to stop
```

### View Entries

```bash
kimai-cli today        # Today's entries
kimai-cli week        # This week's entries
kimai-cli month       # Current month
kimai-cli list        # All entries (with filters)
```

### Other Commands

```bash
kimai-cli status           # API status
kimai-cli projects         # List projects
kimai-cli activities       # List activities
kimai-cli customers        # List customers
kimai-cli current          # Running timesheets
kimai-cli stop             # Stop running
kimai-cli delete <id>      # Delete entry
kimai-cli search "query"   # Search entries
```

## Features

- **Quick Entry**: Uses last project/activity automatically
- **Pause Detection**: Warns when no break between entries
- **Multiple Date Formats**: ISO, YYYY-MM-DD, etc.
- **Environment Variable Support**: KIMAI_URL, KIMAI_API_KEY
- **File Permission Warnings**: Security alerts for auth.json

## Options

Most commands support:

- `--json` - JSON output
- `-y, --yes` - Skip confirmation

## License

MIT
