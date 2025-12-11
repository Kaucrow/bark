import { Request, Response, NextFunction } from 'express';
import pc from 'picocolors';
import DBManager from './components/database';

import type bark from '@/index';
import { timestamp, color } from '@/components';
import { options } from '@/options';

import fs from 'fs/promises'

async function logMessage(level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR', msg: string) {
  const colorKey = level.toLowerCase() as keyof typeof options.value.colors;
  const colorFormat = color.format(options.value.colors?.[colorKey]);
  const ts = timestamp.now();
  const log = `${level}: ${ts} ${msg}`;

  console.log(colorFormat(log));
  logToFile(log);

  const db = DBManager.getInstance();
  (await db).addLog(ts, msg, level);
}

export const debug = (msg: string) => logMessage('DEBUG', msg);
export const info = (msg: string) => logMessage('INFO', msg);
export const warn = (msg: string) => logMessage('WARN', msg);
export const error = (msg: string) => logMessage('ERROR', msg);

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

    console.log(colorFormat(log));
    logToFile(log);
    
    let message: string = `REQ: ${req.method} ${req.url}`;
    (await db).addLog(startTimeString, message , prefix);

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

      let log = `${prefix} REQ: ${startTimeString} ${req.method} ${req.url} ${status.toString()} ${`- ${duration}ms`}`

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

// logs in file

async function createFolder(): Promise<void> {
  try {
    await fs.access('./logs');
  } catch {
    await fs.mkdir('./logs', { recursive: true });
     try {
        await fs.writeFile('./logs/log.txt', '');
    } catch (error) {
        console.error(`Error creating log file`);
    }
  }
}

async function logToFile(message:string): Promise<void> {
  try {
    await fs.appendFile('./logs/log.txt', `${message}\n`);
  } catch (error) {
    console.error('Error saving log in file:', error);
  }
}