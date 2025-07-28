#!/usr/bin/env node
import express from "express";
import cors from 'cors';
import { z } from "zod";
import { typeMap } from './utils/type-map.js';
import { ApiMethodInfo, ApiParameter } from './api-types.js';

import { ApplePayMethods, ApplePayHandlers } from './services/applepay.js';
import { BankAccountsMethods, BankAccountsHandlers } from './services/bankaccounts.js';
import { BookingCustomAttributesMethods, BookingCustomAttributesHandlers } from './services/bookingcustomattributes.js';
import { BookingsMethods, BookingsHandlers } from './services/bookings.js';
import { CardsMethods, CardsHandlers } from './services/cards.js';
import { CashDrawersMethods, CashDrawersHandlers } from './services/cashdrawers.js';
import { CatalogMethods, CatalogHandlers } from './services/catalog.js';
import { CheckoutMethods, CheckoutHandlers } from './services/checkout.js';
import { CustomerCustomAttributesMethods, CustomerCustomAttributesHandlers } from './services/customercustomattributes.js';
import { CustomerGroupsMethods, CustomerGroupsHandlers } from './services/customergroups.js';
import { CustomerSegmentsMethods, CustomerSegmentsHandlers } from './services/customersegments.js';
import { CustomersMethods, CustomersHandlers } from './services/customers.js';
import { DevicesMethods, DevicesHandlers } from './services/devices.js';
import { DisputesMethods, DisputesHandlers } from './services/disputes.js';
import { EventsMethods, EventsHandlers } from './services/events.js';
import { GiftCardActivitiesMethods, GiftCardActivitiesHandlers } from './services/giftcardactivities.js';
import { GiftCardsMethods, GiftCardsHandlers } from './services/giftcards.js';
import { InventoryMethods, InventoryHandlers } from './services/inventory.js';
import { InvoicesMethods, InvoicesHandlers } from './services/invoices.js';
import { LaborMethods, LaborHandlers } from './services/labor.js';
import { LocationCustomAttributesMethods, LocationCustomAttributesHandlers } from './services/locationcustomattributes.js';
import { LocationsMethods, LocationsHandlers } from './services/locations.js';
import { LoyaltyMethods, LoyaltyHandlers } from './services/loyalty.js';
import { MerchantCustomAttributesMethods, MerchantCustomAttributesHandlers } from './services/merchantcustomattributes.js';
import { MerchantsMethods, MerchantsHandlers } from './services/merchants.js';
import { OAuthMethods, OAuthHandlers } from './services/oauth.js';
import { OrderCustomAttributesMethods, OrderCustomAttributesHandlers } from './services/ordercustomattributes.js';
import { OrdersMethods, OrdersHandlers } from './services/orders.js';
import { PaymentsMethods, PaymentsHandlers } from './services/payments.js';
import { PayoutsMethods, PayoutsHandlers } from './services/payouts.js';
import { RefundsMethods, RefundsHandlers } from './services/refunds.js';
import { SitesMethods, SitesHandlers } from './services/sites.js';
import { SnippetsMethods, SnippetsHandlers } from './services/snippets.js';
import { SubscriptionsMethods, SubscriptionsHandlers } from './services/subscriptions.js';
import { TeamMethods, TeamHandlers } from './services/team.js';
import { TerminalMethods, TerminalHandlers } from './services/terminal.js';
import { VendorsMethods, VendorsHandlers } from './services/vendors.js';
import { WebhookSubscriptionsMethods, WebhookSubscriptionsHandlers } from './services/webhooksubscriptions.js';

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

// Define types for service maps
type ServiceMethods = { [key: string]: { [key: string]: ApiMethodInfo } };
type ServiceHandlers = { [key: string]: { [key: string]: (accessToken: string, args: Record<string, unknown>) => Promise<unknown> } };

// Create a mapping of service methods and handlers
export const serviceMethodsMap: ServiceMethods = {
  "ApplePay": ApplePayMethods,
  "BankAccounts": BankAccountsMethods,
  "BookingCustomAttributes": BookingCustomAttributesMethods,
  "Bookings": BookingsMethods,
  "Cards": CardsMethods,
  "CashDrawers": CashDrawersMethods,
  "Catalog": CatalogMethods,
  "Checkout": CheckoutMethods,
  "CustomerCustomAttributes": CustomerCustomAttributesMethods,
  "CustomerGroups": CustomerGroupsMethods,
  "CustomerSegments": CustomerSegmentsMethods,
  "Customers": CustomersMethods,
  "Devices": DevicesMethods,
  "Disputes": DisputesMethods,
  "Events": EventsMethods,
  "GiftCardActivities": GiftCardActivitiesMethods,
  "GiftCards": GiftCardsMethods,
  "Inventory": InventoryMethods,
  "Invoices": InvoicesMethods,
  "Labor": LaborMethods,
  "LocationCustomAttributes": LocationCustomAttributesMethods,
  "Locations": LocationsMethods,
  "Loyalty": LoyaltyMethods,
  "MerchantCustomAttributes": MerchantCustomAttributesMethods,
  "Merchants": MerchantsMethods,
  "OAuth": OAuthMethods,
  "OrderCustomAttributes": OrderCustomAttributesMethods,
  "Orders": OrdersMethods,
  "Payments": PaymentsMethods,
  "Payouts": PayoutsMethods,
  "Refunds": RefundsMethods,
  "Sites": SitesMethods,
  "Snippets": SnippetsMethods,
  "Subscriptions": SubscriptionsMethods,
  "Team": TeamMethods,
  "Terminal": TerminalMethods,
  "Vendors": VendorsMethods,
  "WebhookSubscriptions": WebhookSubscriptionsMethods
};

export const serviceHandlersMap: ServiceHandlers = {
  "ApplePay": ApplePayHandlers,
  "BankAccounts": BankAccountsHandlers,
  "BookingCustomAttributes": BookingCustomAttributesHandlers,
  "Bookings": BookingsHandlers,
  "Cards": CardsHandlers,
  "CashDrawers": CashDrawersHandlers,
  "Catalog": CatalogHandlers,
  "Checkout": CheckoutHandlers,
  "CustomerCustomAttributes": CustomerCustomAttributesHandlers,
  "CustomerGroups": CustomerGroupsHandlers,
  "CustomerSegments": CustomerSegmentsHandlers,
  "Customers": CustomersHandlers,
  "Devices": DevicesHandlers,
  "Disputes": DisputesHandlers,
  "Events": EventsHandlers,
  "GiftCardActivities": GiftCardActivitiesHandlers,
  "GiftCards": GiftCardsHandlers,
  "Inventory": InventoryHandlers,
  "Invoices": InvoicesHandlers,
  "Labor": LaborHandlers,
  "LocationCustomAttributes": LocationCustomAttributesHandlers,
  "Locations": LocationsHandlers,
  "Loyalty": LoyaltyHandlers,
  "MerchantCustomAttributes": MerchantCustomAttributesHandlers,
  "Merchants": MerchantsHandlers,
  "OAuth": OAuthHandlers,
  "OrderCustomAttributes": OrderCustomAttributesHandlers,
  "Orders": OrdersHandlers,
  "Payments": PaymentsHandlers,
  "Payouts": PayoutsHandlers,
  "Refunds": RefundsHandlers,
  "Sites": SitesHandlers,
  "Snippets": SnippetsHandlers,
  "Subscriptions": SubscriptionsHandlers,
  "Team": TeamHandlers,
  "Terminal": TerminalHandlers,
  "Vendors": VendorsHandlers,
  "WebhookSubscriptions": WebhookSubscriptionsHandlers
};

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
                description: `Unified tool for all Square API operations. Available services: ${Object.keys(serviceMethodsMap).map(name => name.toLowerCase()).join(", ")}.`,
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
                name: 'get_type_info',
                description: 'Get type information for a Square API method.',
                inputSchema: {
                  type: 'object',
                  properties: {
                    service: { type: 'string', description: 'The Square API service category' },
                    method: { type: 'string', description: 'The API method to call' }
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
              const serviceName = service.charAt(0).toUpperCase() + service.slice(1);
              
              const methods = serviceMethodsMap[serviceName];
              if (!methods) {
                throw new Error(`Invalid service: ${service}. Available services: ${JSON.stringify(Object.keys(serviceMethodsMap), null, 2)}`);
              }

              const handlers = serviceHandlersMap[serviceName];
              if (!methods[method]) {
                throw new Error(`Invalid method ${method} for service ${service}. Available methods: ${JSON.stringify(Object.keys(methods), null, 2)}`);
              }

              const methodInfo = methods[method];
              if (process.env.DISALLOW_WRITES == "true" && methodInfo?.isWrite) {
                throw new Error(`Write operations are not allowed in this environment. Attempted operation: ${service}.${method}`);
              }

              const handler = handlers[method];
              if (!handler) {
                throw new Error(`No handler found for ${service}.${method}`);
              }

              const token = await getAccessToken();
              const apiResult = await handler(token, request || {});
              
              result = {
                content: [{ type: 'text', text: apiResult as string }]
              };
              break;

            case 'get_type_info':
              const { service: typeService, method: typeMethod } = args;
              const typeServiceName = typeService.charAt(0).toUpperCase() + typeService.slice(1);
              
              const typeMethods = serviceMethodsMap[typeServiceName];
              if (!typeMethods) {
                throw new Error(`Invalid service: ${typeService}. Available services: ${JSON.stringify(Object.keys(serviceMethodsMap), null, 2)}`);
              }

              if (!typeMethods[typeMethod]) {
                throw new Error(`Invalid method ${typeMethod} for service ${typeService}. Available methods: ${JSON.stringify(Object.keys(typeMethods), null, 2)}`);
              }

              const methodInfo2 = typeMethods[typeMethod];
              const requestTypeName = methodInfo2.requestType;
              
              const typeInfo = typeMap[requestTypeName];
              if (!typeInfo) {
                throw new Error(`Type information not found for ${requestTypeName}`);
              }

              result = {
                content: [{ type: 'text', text: JSON.stringify(typeInfo, null, 2) }]
              };
              break;

            case 'get_service_info':
              const { service: infoService } = args;
              const infoServiceName = infoService.charAt(0).toUpperCase() + infoService.slice(1);
              
              const infoMethods = serviceMethodsMap[infoServiceName];
              if (!infoMethods) {
                throw new Error(`Invalid service: ${infoService}. Available services: ${JSON.stringify(Object.keys(serviceMethodsMap), null, 2)}`);
              }

              const methodInfo3 = Object.entries(infoMethods).reduce((acc, [methodName, info]) => {
                acc[methodName] = { description: info.description };
                return acc;
              }, {} as Record<string, { description: string }>);

              result = {
                content: [{ type: 'text', text: JSON.stringify(methodInfo3, null, 2) }]
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