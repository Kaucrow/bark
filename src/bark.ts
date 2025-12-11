import {
  Request,
  Response,
  NextFunction,
  RequestHandler,
} from 'express';
import pc from 'picocolors';
import DBManager from './components/database';

import type bark from '@/index';
import { timestamp, color, dashboard } from '@/components';
import { options } from '@/options';
import { createFolder, logToFile } from './components/logFileManager';

async function logMessage(level: 'debug' | 'info' | 'warn' | 'error', msg: string) {
  const colorKey = level.toLowerCase() as keyof typeof options.value.colors;
  const colorFormat = color.format(options.value.colors?.[colorKey]);
  const ts = timestamp.now();
  const log = `${level.toUpperCase()}: ${ts} ${msg}`;

  console.log(colorFormat(log));
  logToFile(log);
 
  dashboard.addLog({
    level: level,
    message: msg,
    source: 'manual'
  });

  const db = DBManager.getInstance();
  (await db).addLog(ts, msg, level);
}

export function serve(options: bark.DashboardOptions = {}): RequestHandler {
  dashboard.init(options);
 
  const router = dashboard.serve();

  return router;
}

export const debug = (msg: string) => logMessage('debug', msg);
export const info = (msg: string) => logMessage('info', msg);
export const warn = (msg: string) => logMessage('warn', msg);
export const error = (msg: string) => logMessage('error', msg);

export default (newOptions: bark.Options = {}) => {
  options.value = { ...options.value, ...newOptions };
  const db = DBManager.getInstance();
  createFolder();

  const prefix = options.value.prefix!;

  return async (req: Request, res: Response, next: NextFunction) => {
    let startTimeString = timestamp.now();
    let startTime = Date.now();
    const colorFormat = color.format(options.value.colors?.http);
    let log = `${prefix} REQ: ${startTimeString} ${req.method} ${req.url}`

    dashboard.addLog({
      level: 'http',
      message: log,
      source: 'request'
    });

    console.log(colorFormat(
      `${prefix}: ` +
      `${startTimeString}` +
      `${req.method} ` +
      `${req.url}`
    ));

    res.on('finish', async () => {
      const duration = Date.now() - startTime;
      const status = res.statusCode;

      let statusColor = pc.green;

      if (status >= 500) {
        statusColor = pc.red;
      } else if (status >= 400) {
        statusColor = pc.yellow;
      } else if (status >= 300) {
        statusColor = pc.cyan;
      }

      let endTimeString = timestamp.now();

      let log = `${prefix} RES: ${startTimeString} ${req.method} ${req.url} ${status.toString()} ${`- ${duration}ms`}`

      dashboard.addLog({
        level: 'http',
        message: log,
        source: 'response'
      });

      console.log(colorFormat(
        `${prefix} RES: ` +
        `${endTimeString}` +
        `${req.method} ` +
        `${req.url} ` +
        `${statusColor(status.toString())} ` +
        `${pc.gray(`- ${duration}ms`)}`
      ));

      logToFile(log);

      (await db).addLog(endTimeString, `RES: ${req.method} ${status.toString()} ${req.url} - ${duration}ms`, prefix);
    });

    next();
  };
};