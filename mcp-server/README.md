# AuthService Inspector MCP Server

An MCP (Model Context Protocol) server for inspecting AuthService Docker container, logs, and database.

## Overview

This server provides 4 tools for Claude Code to interact with the running AuthService:

1. **get_container_logs** - Read Docker container stdout/stderr
2. **read_app_log** - Read JSON application logs from `/app/logs/app.log`
3. **query_database** - Execute read-only SQL queries on database.sqlite
4. **describe_database** - Get database schema (tables and columns)

## Build

```bash
npm install
npm run build
```

Output: `dist/index.js`

## Usage

The server is registered in `.mcp.json` and automatically started by Claude Code.

### Tool: get_container_logs

Get Docker container logs (stdout/stderr).

**Parameters:**
- `container` (string, optional, default: "auth-service"): Container name
- `tail` (number, optional, default: 100): Number of lines (1-1000)

**Example:**
```
Get last 50 lines of auth-service logs
```

**Security:** Container name validated to contain only alphanumeric, `-`, and `_` characters.

### Tool: read_app_log

Read application JSON logs from `/app/logs/app.log` in the container via `docker exec`.

**Parameters:**
- `lines` (number, optional, default: 100): Number of lines to read (1-1000)
- `filter` (string, optional): Filter string to match log lines

**Example:**
```
Read 100 lines from app log and filter for "login_success"
```

**Security:** Line count validated to be 1-1000.

### Tool: query_database

Execute read-only SQL query on `database.sqlite`.

**Parameters:**
- `sql` (string, required): SQL query (only SELECT and PRAGMA allowed)

**Example:**
```
Query all users: SELECT * FROM users
```

**Security:**
- Database opened in read-only mode (sqlite3.OPEN_READONLY)
- Only SELECT and PRAGMA queries allowed
- Write operations (INSERT, UPDATE, DELETE, etc.) rejected

### Tool: describe_database

Get database schema with all tables and their columns.

**Parameters:** None

**Example:**
```
Describe the database schema
```

**Output:**
```json
{
  "tables": [
    {
      "name": "users",
      "columns": [
        { "cid": 0, "name": "id", "type": "INTEGER", "notnull": 0, "dflt_value": null, "pk": 1 },
        { "cid": 1, "name": "email", "type": "TEXT", "notnull": 1, "dflt_value": null, "pk": 0 },
        ...
      ]
    }
  ]
}
```

## Security

- **Docker commands:** Use `execFileSync` with argument arrays to prevent command injection
- **Input validation:**
  - Container names: alphanumeric, `-`, `_` only
  - Line counts: integers 1-1000
  - SQL queries: SELECT and PRAGMA only, read-only database access
- **Database:** Opened in read-only mode (sqlite3.OPEN_READONLY)

## Verification in Claude Code

1. Restart Claude Code (to load MCP servers)
2. Open project: `C:\Users\srmil\Desktop\ai-bootcamp-2`
3. Use ToolSearch: Find tools named:
   - `get_container_logs`
   - `read_app_log`
   - `query_database`
   - `describe_database`
4. Test each tool by calling it in Claude Code

## Implementation Details

- **Transport:** Stdio (reads JSON-RPC from stdin, writes to stdout)
- **SDK:** @modelcontextprotocol/sdk ^1.32.0
- **Database:** sqlite3 ^5.1.6
- **TypeScript:** ES2020, strict mode

## Development

```bash
npm run dev      # Run with ts-node
npm run build    # Compile TypeScript
npm start        # Run compiled server
```

Note: Do not run `npm start` directly in terminal - it waits for stdin. Server is started by Claude Code via stdio transport.
