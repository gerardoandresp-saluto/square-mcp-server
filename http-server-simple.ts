#!/usr/bin/env node
import express from "express";
import cors from 'cors';
import fetch from 'node-fetch';

const accessToken: string | undefined = process.env.ACCESS_TOKEN;

async function getAccessToken(): Promise<string> {
  return accessToken || '';
}

export function setBaseUrl() {
  let baseUrl = "https://connect.squareup.com";
  
  if (process.env.SANDBOX == "true" && process.env.PRODUCTION == "true") {
    throw new Error("Both SANDBOX and PRODUCTION env vars are true");
  }
  if (process.env.SANDBOX == "true") {
    baseUrl = "https://connect.squareupsandbox.com"
  }
  
  return baseUrl
}

// Create Express app
const app = express();
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'square-mcp-server'
  });
});

// MCP-compatible endpoint for ElevenLabs
app.post('/mcp', async (req: any, res: any) => {
  try {
    const { jsonrpc, method, params, id } = req.body;

    if (jsonrpc !== '2.0') {
      return res.status(400).json({
        jsonrpc: '2.0',
        error: { code: -32600, message: 'Invalid Request' },
        id
      });
    }

    switch (method) {
      case 'initialize':
        // Return MCP server capabilities
        return res.json({
          jsonrpc: '2.0',
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {}
            },
            serverInfo: {
              name: 'square-mcp-server',
              version: '1.0.0'
            }
          },
          id
        });

      case 'tools/list':
        // Return available tools
        return res.json({
          jsonrpc: '2.0',
          result: {
            tools: [
              {
                name: 'make_api_request',
                description: 'Unified tool for all Square API operations. Available services: locations, customers, catalog, payments, orders, and more.',
                inputSchema: {
                  type: 'object',
                  properties: {
                    service: { type: 'string', description: 'The Square API service category (e.g., "catalog", "payments")' },
                    method: { type: 'string', description: 'The API method to call (e.g., "list", "create")' },
                    request: { type: 'object', description: 'The request object for the API call.' }
                  },
                  required: ['service', 'method']
                }
              },
              {
                name: 'get_service_info',
                description: 'Get information about a Square API service.',
                inputSchema: {
                  type: 'object',
                  properties: {
                    service: { type: 'string', description: 'The Square API service category' }
                  },
                  required: ['service']
                }
              }
            ]
          },
          id
        });

      case 'tools/call':
        // Handle tool calls
        const { name, arguments: args } = params;
        
        try {
          let result;
          
          switch (name) {
            case 'make_api_request':
              const { service, method, request } = args;
              const token = await getAccessToken();
              const baseUrl = setBaseUrl();
              
              // Build the API URL
              const servicePath = service.toLowerCase();
              const url = `${baseUrl}/v2/${servicePath}`;
              
              // Make the API request
              const response = await fetch(url, {
                method: method.toUpperCase(),
                headers: {
                  'Content-Type': 'application/json',
                  'Accept': 'application/json',
                  'Authorization': `Bearer ${token}`,
                  'Square-Version': '2025-04-16',
                  'User-Agent': 'Square-MCP-Server/1.0.0'
                },
                ...(request && { body: JSON.stringify(request) })
              });
              
              const responseText = await response.text();
              
              if (!response.ok) {
                throw new Error(`Square API error: ${response.status} ${response.statusText} - ${responseText}`);
              }
              
              result = {
                content: [{ type: 'text', text: responseText }]
              };
              break;

            case 'get_service_info':
              const { service: infoService } = args;
              
              // Return basic service information
              const serviceInfo = {
                description: `Square API ${infoService} service`,
                available_methods: ['list', 'get', 'create', 'update', 'delete'],
                endpoint: `/v2/${infoService.toLowerCase()}`
              };
              
              result = {
                content: [{ type: 'text', text: JSON.stringify(serviceInfo, null, 2) }]
              };
              break;

            default:
              throw new Error(`Unknown tool: ${name}`);
          }

          return res.json({
            jsonrpc: '2.0',
            result,
            id
          });

        } catch (error: any) {
          return res.json({
            jsonrpc: '2.0',
            error: {
              code: -32000,
              message: error.message
            },
            id
          });
        }

      default:
        return res.status(400).json({
          jsonrpc: '2.0',
          error: { code: -32601, message: 'Method not found' },
          id
        });
    }
  } catch (error: any) {
    return res.status(500).json({
      jsonrpc: '2.0',
      error: { code: -32603, message: 'Internal error', data: error.message },
      id: req.body?.id
    });
  }
});

// Start HTTP server
async function startHttpServer() {
  const port = process.env.PORT || 3000;
  
  app.listen(port, () => {
    console.log(`🚀 Square MCP Server running on port ${port}`);
    console.log(`📊 Health check available at http://localhost:${port}/health`);
    console.log(`🔗 MCP endpoint available at http://localhost:${port}/mcp`);
  });
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully');
  process.exit(0);
});

// Start the server
startHttpServer().catch(console.error); 