#!/usr/bin/env node
import express from "express";
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'square-mcp-server-test'
  });
});

// Simple MCP endpoint
app.post('/mcp', async (req, res) => {
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
        return res.json({
          jsonrpc: '2.0',
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {}
            },
            serverInfo: {
              name: 'square-mcp-server-test',
              version: '1.0.0'
            }
          },
          id
        });

      case 'tools/list':
        return res.json({
          jsonrpc: '2.0',
          result: {
            tools: [
              {
                name: 'test_tool',
                description: 'A test tool for Square API',
                inputSchema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', description: 'Test message' }
                  },
                  required: ['message']
                }
              }
            ]
          },
          id
        });

      case 'tools/call':
        const { name, arguments: args } = params;
        
        if (name === 'test_tool') {
          return res.json({
            jsonrpc: '2.0',
            result: {
              content: [{ type: 'text', text: `Test response: ${args.message}` }]
            },
            id
          });
        }
        
        return res.json({
          jsonrpc: '2.0',
          error: { code: -32601, message: 'Method not found' },
          id
        });

      default:
        return res.status(400).json({
          jsonrpc: '2.0',
          error: { code: -32601, message: 'Method not found' },
          id
        });
    }
  } catch (error) {
    return res.status(500).json({
      jsonrpc: '2.0',
      error: { code: -32603, message: 'Internal error', data: error.message },
      id: req.body?.id
    });
  }
});

// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 Test Square MCP Server running on port ${port}`);
  console.log(`📊 Health check available at http://localhost:${port}/health`);
  console.log(`🔗 MCP endpoint available at http://localhost:${port}/mcp`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully');
  process.exit(0);
}); 