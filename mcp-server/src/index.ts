import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { execFileSync } from 'child_process';
import * as sqlite3 from 'sqlite3';
import * as path from 'path';

const DB_PATH = path.join(__dirname, '..', '..', 'database.sqlite');

// Validation functions
function validateContainer(container: string): void {
  if (!container || !/^[a-zA-Z0-9_-]+$/.test(container)) {
    throw new Error('Invalid container name. Must contain only letters, numbers, - and _');
  }
}

function validateLineCount(lines: number): void {
  if (!Number.isInteger(lines) || lines < 1 || lines > 1000) {
    throw new Error('Lines must be an integer between 1 and 1000');
  }
}

function validateSQL(sql: string): void {
  const sql_upper = sql.trim().toUpperCase();
  if (!sql_upper.startsWith('SELECT') && !sql_upper.startsWith('PRAGMA')) {
    throw new Error('Only SELECT and PRAGMA queries allowed. Write operations are prohibited.');
  }
}

// Tool implementations
async function getContainerLogs(container: string = 'auth-service', tail: number = 100): Promise<string> {
  validateContainer(container);
  validateLineCount(tail);

  try {
    const output = execFileSync('docker', ['logs', '--tail', tail.toString(), container], {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
    });
    return output;
  } catch (error) {
    throw new Error(`Failed to get container logs: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function readAppLog(lines: number = 100, filter: string = ''): Promise<string> {
  validateLineCount(lines);

  try {
    const output = execFileSync('docker', ['exec', 'auth-service', 'tail', '-n', lines.toString(), '/app/logs/app.log'], {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
    });

    if (filter) {
      const filtered = output
        .split('\n')
        .filter(line => line.includes(filter))
        .join('\n');
      return filtered;
    }

    return output;
  } catch (error) {
    throw new Error(`Failed to read app log: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function queryDatabase(sql: string): Promise<string> {
  validateSQL(sql);

  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY, (err) => {
      if (err) {
        reject(new Error(`Failed to open database: ${err.message}`));
        return;
      }

      db.all(sql, [], (err, rows) => {
        db.close();

        if (err) {
          reject(new Error(`SQL Error: ${err.message}`));
        } else {
          resolve(JSON.stringify(rows || [], null, 2));
        }
      });
    });
  });
}

async function describeDatabase(): Promise<string> {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY, (err) => {
      if (err) {
        reject(new Error(`Failed to open database: ${err.message}`));
        return;
      }

      db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables: any[]) => {
        if (err) {
          db.close();
          reject(new Error(`Failed to list tables: ${err.message}`));
          return;
        }

        const results: any[] = [];
        let pending = tables.length;

        if (pending === 0) {
          db.close();
          resolve(JSON.stringify({ tables: [] }, null, 2));
          return;
        }

        tables.forEach(table => {
          db.all(`PRAGMA table_info(${table.name})`, [], (err, columns) => {
            if (!err) {
              results.push({ name: table.name, columns });
            }

            if (--pending === 0) {
              db.close();
              resolve(JSON.stringify({ tables: results }, null, 2));
            }
          });
        });
      });
    });
  });
}

// Initialize MCP server
const server = new Server(
  {
    name: 'authservice-inspector',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'get_container_logs',
        description: 'Get Docker container logs (stdout/stderr from docker logs command)',
        inputSchema: {
          type: 'object' as const,
          properties: {
            container: {
              type: 'string',
              description: 'Container name (default: auth-service)',
            },
            tail: {
              type: 'number',
              description: 'Number of lines to retrieve (1-1000, default: 100)',
            },
          },
          required: [],
        },
      },
      {
        name: 'read_app_log',
        description: 'Read application JSON logs from /app/logs/app.log in container via docker exec',
        inputSchema: {
          type: 'object' as const,
          properties: {
            lines: {
              type: 'number',
              description: 'Number of lines to read (1-1000, default: 100)',
            },
            filter: {
              type: 'string',
              description: 'Optional filter string to match log lines',
            },
          },
          required: [],
        },
      },
      {
        name: 'query_database',
        description: 'Execute read-only SQL query on database.sqlite (SELECT and PRAGMA only)',
        inputSchema: {
          type: 'object' as const,
          properties: {
            sql: {
              type: 'string',
              description: 'SQL query (only SELECT and PRAGMA allowed)',
            },
          },
          required: ['sql'],
        },
      },
      {
        name: 'describe_database',
        description: 'Get database schema (tables and columns)',
        inputSchema: {
          type: 'object' as const,
          properties: {},
          required: [],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    let result: string;

    switch (request.params.name) {
      case 'get_container_logs': {
        const args = request.params.arguments as any;
        result = await getContainerLogs(args.container || 'auth-service', args.tail || 100);
        break;
      }

      case 'read_app_log': {
        const args = request.params.arguments as any;
        result = await readAppLog(args.lines || 100, args.filter || '');
        break;
      }

      case 'query_database': {
        const args = request.params.arguments as any;
        if (!args.sql) {
          throw new Error('SQL query is required');
        }
        result = await queryDatabase(args.sql);
        break;
      }

      case 'describe_database': {
        result = await describeDatabase();
        break;
      }

      default:
        throw new Error(`Unknown tool: ${request.params.name}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: result,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
