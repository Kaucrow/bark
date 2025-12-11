import {
  Request,
  Response,
  NextFunction,
  Router,
} from 'express';
import Handlebars from 'handlebars';
import { WebSocketServer, WebSocket } from 'ws';

import type bark from '@/index';
import type { LogMessage, ClientMessage } from '@/bark-types';

import dashboardHtml from '@/templates/dashboard/index.html';
import dashboardJs from '@/templates/dashboard/script.asset.js';
import dashboardCss from '@/templates/dashboard/styles.css';

Handlebars.registerHelper('formatTime', function(timestamp: Date | string) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
});

class DashboardComponent {
  static #instance: DashboardComponent;
  #options: bark.DashboardOptions | null = null;
  #wss: WebSocketServer | null = null;
  #clients: Set<WebSocket>;
  #logs: LogMessage[];

  private constructor() {
    this.#clients = new Set<WebSocket>();
    this.#logs = []
  }
  
  public static get instance(): DashboardComponent {
    if (!DashboardComponent.#instance) {
      DashboardComponent.#instance = new DashboardComponent();
    }
    return DashboardComponent.#instance;
  }

  init(options: bark.DashboardOptions = {}) {
    if (this.#options !== null) {
      throw new Error('Dashboard has already been initialzed');
    }

    this.#options = options;
    this.#logs = [];

    this.#wss = new WebSocketServer({
      port: options.port || 8080,
      clientTracking: true,
    });

    this.#clients = new Set<WebSocket>();

    this.#wss.on('connection', (ws: WebSocket) => {
      this.#clients.add(ws);

      // Send initial logs to new client
      ws.send(JSON.stringify({
        type: 'INITIAL_LOGS',
        data: this.#logs.slice(-100)
      }));

      // Handle messages from client
      ws.on('message', (data: Buffer) => {
        try {
          const message: ClientMessage = JSON.parse(data.toString());
          this.#handleClientMessage(ws, message);
        } catch (err) {
          console.error('Error parsing client message:', err);
        }
      });

      ws.on('close', () => {
        this.#clients.delete(ws);
      });

      ws.on('error', (err) => {
        console.error('WebSocket error:', err);
      });
    });
  }

  serve(): Router {
    const router = Router();

    router.get('/', (req: Request, res: Response, next: NextFunction) => {
      if (!this.#options) {
        throw new Error("Dashboard hasn't been initialized");
      }

      const assetPath = req.baseUrl || '';

      const template = Handlebars.compile(dashboardHtml);

      const templateData = {
        STATUS: 'Running owo',
        initialLogs: this.#logs.slice(-50),
        totalLogs: this.#logs.length,
        version: '1.0.0',
        environment: 'development',
        timestamp: new Date().toISOString(),
        wsPort: this.#options.port || 8080,
        assetPath: assetPath,
        ...this.#options
      };
  
      const html = template(templateData);

      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    });

    router.get('/script.js', (req: Request, res: Response, next: NextFunction) => {
      if (!this.#options) {
        throw new Error("Dashboard hasn't been initialized");
      }

      const template = Handlebars.compile(dashboardJs);

      const templateData = {
        wsPort: this.#options.port || 8080,
      };

      const js = template(templateData);

      res.setHeader('Content-Type', 'application/javascript');
      res.send(js);
    });
    
    router.get('/styles.css', (req: Request, res: Response, next: NextFunction) => {
      res.setHeader('Content-Type', 'text/css');
      res.send(dashboardCss);
    });

    return router;
  }

  addLog(log: Omit<LogMessage, 'id' | 'timestamp'>) {
    const newLog: LogMessage = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
      timestamp: new Date(),
      ...log
    };

    this.#logs.push(newLog);

    const maxLogs = 1000;
    if (this.#logs.length > maxLogs) {
      this.#logs.splice(0, this.#logs.length - maxLogs);
    }

    this.#broadcast({
      type: 'NEW_LOG',
      data: newLog
    });

    return newLog;
  }

  #handleClientMessage(ws: WebSocket, msg: ClientMessage) {
    switch (msg.type) {
      case 'FILTER_CHANGE': {
        break;
      }

      case 'CLEAR_LOGS': {
        this.#logs.length = 0;
        this.#broadcast({
          type: 'LOGS_CLEARED',
          data: { timestamp: new Date() }
        });
        break;
      }

      case 'GET_STATS': {
        ws.send(JSON.stringify({
          type: 'STATS_UPDATE',
          data: {
            totalLogs: this.#logs.length,
            connectedClients: this.#clients.size,
            memoryUsage: process.memoryUsage(),
            uptime: process.uptime(),
          }
        }));
        break;
      }

      case 'EXPORT_REQUEST': {
        const exportData = this.#logs.map(log => ({
          ...log,
          timestamp: log.timestamp.toISOString()
        }));
        ws.send(JSON.stringify({
          type: 'EXPORT_DATA',
          data: exportData,
        }));
        break;
      }

      default: {
        console.log('Unknown message type:', msg.type);
      }
    }
  }

  #broadcast(msg: ClientMessage) {
    const data = JSON.stringify(msg);

    this.#clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }
}

export const dashboard = DashboardComponent.instance;