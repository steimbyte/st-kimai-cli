# Kimai CLI - Complete Use Case Reference

## Installation

```bash
cd kimai-cli
npm install
npm run build
npm link  # or: ln -s $(pwd)/dist/index.js ~/bin/kimai-cli
```

## Configuration

Create `auth.json`:

```json
{
  "url": "https://kimai.ccp-intern.de:8443",
  "apiKey": "your-api-key"
}
```

---

## ✅ All Implemented Use Cases

### 📊 System & Status

| Command            | Description                      | Implemented |
| ------------------ | -------------------------------- | ----------- |
| `kimai-cli status` | Check API ping, version, plugins | ✅          |
| `kimai-cli --help` | Show help                        | ✅          |

### ⏱️ Timesheets - Create

| Command                                                                  | Description                           | Implemented |
| ------------------------------------------------------------------------ | ------------------------------------- | ----------- |
| `kimai-cli start -p <id> -a <id> -d "text"`                              | Start running timesheet               | ✅          |
| `kimai-cli start -p 5 -a 4 "Working on X" -b "2026-05-21T09:00:00+0200"` | Start with specific time              | ✅          |
| `kimai-cli add -p <id> -a <id> -d "text" -e "2026-05-21T12:00:00+0200"`  | Add completed entry                   | ✅          |
| `kimai-cli log "Quick description" -d 60`                                | Quick log using last project/activity | ✅          |

### ⏱️ Timesheets - Read

| Command                      | Description                   | Implemented |
| ---------------------------- | ----------------------------- | ----------- |
| `kimai-cli list`             | List recent timesheets        | ✅          |
| `kimai-cli ls`               | List (alias)                  | ✅          |
| `kimai-cli list -n 100`      | List with limit               | ✅          |
| `kimai-cli list --full`      | List with full entity details | ✅          |
| `kimai-cli list --json`      | Output as JSON                | ✅          |
| `kimai-cli current`          | Show running timesheets       | ✅          |
| `kimai-cli running`          | Show running (alias)          | ✅          |
| `kimai-cli timesheet <id>`   | Get timesheet details         | ✅          |
| `kimai-cli today`            | Today's timesheets            | ✅          |
| `kimai-cli week`             | This week's timesheets        | ✅          |
| `kimai-cli month`            | This month's timesheets       | ✅          |
| `kimai-cli month -m 2026-04` | Specific month                | ✅          |
| `kimai-cli summary`          | Summary with totals           | ✅          |
| `kimai-cli sum`              | Summary (alias)               | ✅          |
| `kimai-cli search "query"`   | Search by description         | ✅          |
| `kimai-cli tagged "KTE"`     | Find by tag                   | ✅          |

### ⏱️ Timesheets - Update

| Command                                             | Description             | Implemented |
| --------------------------------------------------- | ----------------------- | ----------- |
| `kimai-cli stop`                                    | Stop current running    | ✅          |
| `kimai-cli stop <id>`                               | Stop specific timesheet | ✅          |
| `kimai-cli stop -t "2026-05-21T17:00:00+0200"`      | Stop at specific time   | ✅          |
| `kimai-cli edit <id> -d "new description"`          | Edit description        | ✅          |
| `kimai-cli edit <id> -p 5 -a 4`                     | Edit project/activity   | ✅          |
| `kimai-cli edit <id> -e "2026-05-21T18:00:00+0200"` | Edit end time           | ✅          |

### ⏱️ Timesheets - Delete

| Command                 | Description                 | Implemented |
| ----------------------- | --------------------------- | ----------- |
| `kimai-cli delete <id>` | Delete with confirmation    | ✅          |
| `kimai-cli rm <id> -y`  | Delete without confirmation | ✅          |

### 📋 Timesheets - Filters

| Command                        | Description          | Implemented |
| ------------------------------ | -------------------- | ----------- |
| `kimai-cli list -p 5`          | Filter by project    | ✅          |
| `kimai-cli list -a 4`          | Filter by activity   | ✅          |
| `kimai-cli list -u 96`         | Filter by user       | ✅          |
| `kimai-cli list -b 2026-05-01` | Filter start date    | ✅          |
| `kimai-cli list -e 2026-05-21` | Filter end date      | ✅          |
| `kimai-cli list -s active`     | Filter active state  | ✅          |
| `kimai-cli list -s stopped`    | Filter stopped state | ✅          |
| `kimai-cli list --billable`    | Filter billable      | ✅          |
| `kimai-cli list --exported`    | Filter exported      | ✅          |

### 📁 Projects

| Command                        | Description            | Implemented |
| ------------------------------ | ---------------------- | ----------- |
| `kimai-cli projects`           | List all projects      | ✅          |
| `kimai-cli proj`               | List (alias)           | ✅          |
| `kimai-cli projects --full`    | List with full details | ✅          |
| `kimai-cli projects --visible` | Only visible projects  | ✅          |
| `kimai-cli projects --json`    | Output as JSON         | ✅          |
| `kimai-cli project <id>`       | Get project details    | ✅          |

### 🎯 Activities

| Command                           | Description              | Implemented |
| --------------------------------- | ------------------------ | ----------- |
| `kimai-cli activities`            | List all activities      | ✅          |
| `kimai-cli acts`                  | List (alias)             | ✅          |
| `kimai-cli activities --full`     | List with full details   | ✅          |
| `kimai-cli activities --visible`  | Only visible activities  | ✅          |
| `kimai-cli activities --billable` | Only billable activities | ✅          |
| `kimai-cli activities --json`     | Output as JSON           | ✅          |
| `kimai-cli activity <id>`         | Get activity details     | ✅          |

### 👥 Customers

| Command                         | Description            | Implemented |
| ------------------------------- | ---------------------- | ----------- |
| `kimai-cli customers`           | List all customers     | ✅          |
| `kimai-cli custs`               | List (alias)           | ✅          |
| `kimai-cli customers --full`    | List with full details | ✅          |
| `kimai-cli customers --visible` | Only visible customers | ✅          |
| `kimai-cli customers --json`    | Output as JSON         | ✅          |
| `kimai-cli customer <id>`       | Get customer details   | ✅          |

### 🏷️ Tags

| Command                                | Description                  | Implemented |
| -------------------------------------- | ---------------------------- | ----------- |
| `kimai-cli tags`                       | List all tags                | ✅          |
| `kimai-cli tags --json`                | Output as JSON               | ✅          |
| `kimai-cli tagged "KTE"`               | Find timesheets with tag     | ✅          |
| `kimai-cli tagged "KTE" -b 2026-01-01` | Find by tag with date filter | ✅          |

### 📈 Statistics

| Command                                         | Description                  | Implemented |
| ----------------------------------------------- | ---------------------------- | ----------- |
| `kimai-cli summary`                             | Summary by project/activity  | ✅          |
| `kimai-cli summary -b 2026-05-01 -e 2026-05-31` | Summary with date range      | ✅          |
| `kimai-cli summary -p 5`                        | Summary for specific project | ✅          |
| `kimai-cli summary --json`                      | Summary as JSON              | ✅          |
| `kimai-cli today`                               | Today's summary              | ✅          |
| `kimai-cli week`                                | This week's summary          | ✅          |
| `kimai-cli month`                               | This month's summary         | ✅          |

---

## ❌ Not Implemented (API Limitations)

| Use Case                 | Reason             |
| ------------------------ | ------------------ |
| Create projects          | 403 Forbidden      |
| Create customers         | 403 Forbidden      |
| Create activities        | 403 Forbidden      |
| Create tags              | 403 Forbidden      |
| Update projects          | 403 Forbidden      |
| Update customers         | 403 Forbidden      |
| Update activities        | 403 Forbidden      |
| Delete projects          | 403 Forbidden      |
| Delete customers         | 403 Forbidden      |
| Delete activities        | 403 Forbidden      |
| List users               | 403 Forbidden      |
| List teams               | 403 Forbidden      |
| Reports/Export endpoints | 404 Not Found      |
| API documentation        | Redirects to login |

---

## Examples

### Daily Workflow

```bash
# Start working
kimai-cli start -p 5 -a 4 "Working on feature X"

# Check current
kimai-cli current

# Stop when done
kimai-cli stop

# List today's entries
kimai-cli today

# Get summary
kimai-cli today
```

### Weekly Review

```bash
# Show week summary
kimai-cli week

# List all week entries
kimai-cli week --json | jq '.'

# Search for specific work
kimai-cli search "bugfix"
```

### Monthly Report

```bash
# Get month summary
kimai-cli month -m 2026-05

# Filter by customer project
kimai-cli list -p 14 -b 2026-05-01 -e 2026-05-31

# Show only billable time
kimai-cli summary -b 2026-05-01 -e 2026-05-31 --billable
```

### Quick Commands

```bash
# Just log 30 min to last project
kimai-cli log "Meeting" -d 30

# Start with specific time
kimai-cli start -p 5 -a 4 -b "2026-05-21T09:00:00+0200" "Planning session"

# Find all entries for a tag
kimai-cli tagged "BMI" -b 2026-01-01
```

---

## Global Options

| Option                | Description               |
| --------------------- | ------------------------- |
| `-c, --config <path>` | Custom auth.json location |
| `--json`              | JSON output (per command) |
| `--full`              | Full entity details       |
