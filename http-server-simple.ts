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

// Enhanced CORS configuration for ElevenLabs
app.use(cors({
  origin: true, // Allow all origins
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true
}));

app.use(express.json());

// Add request logging for debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Handle preflight requests
app.options('/mcp', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
  res.status(200).end();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'square-mcp-server'
  });
});

// GET endpoint for /mcp (for debugging)
app.get('/mcp', (req, res) => {
  res.status(200).json({
    message: 'Square MCP Server is running',
    instructions: 'This endpoint only accepts POST requests with JSON-RPC 2.0 payloads',
    available_methods: ['initialize', 'tools/list', 'tools/call'],
    server_info: {
      name: 'square-mcp-server',
      version: '1.0.0'
    }
  });
});

// MCP-compatible endpoint for ElevenLabs
app.post('/mcp', async (req: any, res: any) => {
  // Set headers for ElevenLabs compatibility
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
  res.header('Content-Type', 'application/json');
  
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
                name: 'get_service_info',
                description: 'Discover methods available for a Square API service. Use this to explore what operations are available for a specific service like locations, customers, catalog, etc.',
                inputSchema: {
                  type: 'object',
                  properties: {
                    service: { 
                      type: 'string', 
                      description: 'The Square API service category (e.g., "locations", "customers", "catalog", "payments", "orders")',
                      enum: ['locations', 'customers', 'catalog', 'payments', 'orders', 'inventory', 'giftcards', 'loyalty', 'bookings', 'devices', 'disputes', 'invoices', 'labor', 'merchants', 'payouts', 'refunds', 'subscriptions', 'team', 'terminal', 'vendors', 'webhooksubscriptions']
                    }
                  },
                  required: ['service']
                }
              },
              {
                name: 'get_type_info',
                description: 'Get detailed parameter requirements for a specific Square API method. Use this to understand what parameters are needed for an API call.',
                inputSchema: {
                  type: 'object',
                  properties: {
                    service: { 
                      type: 'string', 
                      description: 'The Square API service category',
                      enum: ['locations', 'customers', 'catalog', 'payments', 'orders', 'inventory', 'giftcards', 'loyalty', 'bookings', 'devices', 'disputes', 'invoices', 'labor', 'merchants', 'payouts', 'refunds', 'subscriptions', 'team', 'terminal', 'vendors', 'webhooksubscriptions']
                    },
                    method: { 
                      type: 'string', 
                      description: 'The API method to get info for (e.g., "list", "create", "get", "update", "delete")',
                      enum: ['list', 'get', 'create', 'update', 'delete']
                    }
                  },
                  required: ['service', 'method']
                }
              },
              {
                name: 'make_api_request',
                description: 'Execute API calls to Square. Use this to perform actual operations like listing locations, creating customers, processing payments, etc.',
                inputSchema: {
                  type: 'object',
                  properties: {
                    service: { 
                      type: 'string', 
                      description: 'The Square API service category (e.g., "locations", "customers", "catalog", "payments")',
                      enum: ['locations', 'customers', 'catalog', 'payments', 'orders', 'inventory', 'giftcards', 'loyalty', 'bookings', 'devices', 'disputes', 'invoices', 'labor', 'merchants', 'payouts', 'refunds', 'subscriptions', 'team', 'terminal', 'vendors', 'webhooksubscriptions']
                    },
                    method: { 
                      type: 'string', 
                      description: 'The API method to call (e.g., "list", "create", "get", "update", "delete")',
                      enum: ['list', 'get', 'create', 'update', 'delete']
                    },
                    request: { 
                      type: 'object', 
                      description: 'The request object for the API call. Required for POST/PUT operations, optional for GET operations.' 
                    }
                  },
                  required: ['service', 'method']
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
              
              // Map service names to correct Square API endpoints
              const serviceEndpoints: { [key: string]: string } = {
                'locations': '/v2/locations',
                'customers': '/v2/customers',
                'catalog': '/v2/catalog',
                'payments': '/v2/payments',
                'orders': '/v2/orders',
                'inventory': '/v2/inventory',
                'giftcards': '/v2/gift-cards',
                'loyalty': '/v2/loyalty',
                'bookings': '/v2/bookings',
                'devices': '/v2/devices',
                'disputes': '/v2/disputes',
                'invoices': '/v2/invoices',
                'labor': '/v2/labor',
                'merchants': '/v2/merchants',
                'payouts': '/v2/payouts',
                'refunds': '/v2/refunds',
                'subscriptions': '/v2/subscriptions',
                'team': '/v2/team',
                'terminal': '/v2/terminal',
                'vendors': '/v2/vendors',
                'webhooksubscriptions': '/v2/webhook-subscriptions'
              };
              
              const endpoint = serviceEndpoints[service.toLowerCase()];
              if (!endpoint) {
                throw new Error(`Unsupported service: ${service}. Available services: ${Object.keys(serviceEndpoints).join(', ')}`);
              }
              
              const url = `${baseUrl}${endpoint}`;
              
              // Map common methods to correct HTTP methods for Square API
              const methodMap: { [key: string]: string } = {
                'list': 'GET',
                'get': 'GET',
                'create': 'POST',
                'update': 'PUT',
                'delete': 'DELETE'
              };
              
              const httpMethod = methodMap[method.toLowerCase()] || method.toUpperCase();
              
              // Make the API request
              const response = await fetch(url, {
                method: httpMethod,
                headers: {
                  'Content-Type': 'application/json',
                  'Accept': 'application/json',
                  'Authorization': `Bearer ${token}`,
                  'Square-Version': '2025-04-16',
                  'User-Agent': 'Square-MCP-Server/1.0.0'
                },
                ...(request && ['POST', 'PUT', 'PATCH'].includes(httpMethod) && { body: JSON.stringify(request) })
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
              
              // Map service names to correct Square API endpoints
              const serviceEndpointsInfo: { [key: string]: string } = {
                'locations': '/v2/locations',
                'customers': '/v2/customers',
                'catalog': '/v2/catalog',
                'payments': '/v2/payments',
                'orders': '/v2/orders',
                'inventory': '/v2/inventory',
                'giftcards': '/v2/gift-cards',
                'loyalty': '/v2/loyalty',
                'bookings': '/v2/bookings',
                'devices': '/v2/devices',
                'disputes': '/v2/disputes',
                'invoices': '/v2/invoices',
                'labor': '/v2/labor',
                'merchants': '/v2/merchants',
                'payouts': '/v2/payouts',
                'refunds': '/v2/refunds',
                'subscriptions': '/v2/subscriptions',
                'team': '/v2/team',
                'terminal': '/v2/terminal',
                'vendors': '/v2/vendors',
                'webhooksubscriptions': '/v2/webhook-subscriptions'
              };
              
              const infoEndpoint = serviceEndpointsInfo[infoService.toLowerCase()];
              if (!infoEndpoint) {
                throw new Error(`Unsupported service: ${infoService}. Available services: ${Object.keys(serviceEndpointsInfo).join(', ')}`);
              }
              
              // Return basic service information
              const serviceInfo = {
                description: `Square API ${infoService} service`,
                available_methods: ['list', 'get', 'create', 'update', 'delete'],
                endpoint: infoEndpoint
              };
              
              result = {
                content: [{ type: 'text', text: JSON.stringify(serviceInfo, null, 2) }]
              };
              break;

            case 'get_type_info':
              const { service: typeService, method: typeMethod } = args;
              
              // Define parameter information for different services and methods
              const typeInfo = {
                service: typeService,
                method: typeMethod,
                description: `Parameters for ${typeService} ${typeMethod} operation`,
                parameters: {
                  // Common parameters for most operations
                  ...(typeMethod === 'list' && {
                    limit: { type: 'number', description: 'Maximum number of items to return', optional: true },
                    cursor: { type: 'string', description: 'Pagination cursor', optional: true }
                  }),
                  ...(typeMethod === 'get' && {
                    id: { type: 'string', description: 'ID of the item to retrieve', required: true }
                  }),
                  ...(typeMethod === 'create' && {
                    body: { type: 'object', description: 'Data for creating the item', required: true }
                  }),
                  ...(typeMethod === 'update' && {
                    id: { type: 'string', description: 'ID of the item to update', required: true },
                    body: { type: 'object', description: 'Data for updating the item', required: true }
                  }),
                  ...(typeMethod === 'delete' && {
                    id: { type: 'string', description: 'ID of the item to delete', required: true }
                  })
                },
                http_method: typeMethod === 'list' || typeMethod === 'get' ? 'GET' : 
                             typeMethod === 'create' ? 'POST' : 
                             typeMethod === 'update' ? 'PUT' : 'DELETE',
                endpoint: `/v2/${typeService.toLowerCase()}`
              };
              
              result = {
                content: [{ type: 'text', text: JSON.stringify(typeInfo, null, 2) }]
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