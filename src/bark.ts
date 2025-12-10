import {
  Request,
  Response,
  NextFunction,
} from 'express';
import pc from 'picocolors';

import type bark from '@/index';
import { timestamp, color, dashboard } from '@/components';
import { options } from '@/options';

export function serve(options: bark.DashboardOptions = {}) {
  dashboard.init(options);
 
  const router = dashboard.serve();

  return router;
}

export function debug(msg: string) {
  const colorFormat = color.format(options.value.colors?.debug);

  console.log(colorFormat(
    `DEBUG: ` +
    `${timestamp.now()}` +
    msg
  ));
}

export function info(msg: string) {
  const colorFormat = color.format(options.value.colors?.info);

  console.log(colorFormat(
    `INFO: ` +
    `${timestamp.now()}` +
    msg
  ));
}

export function warn(msg: string) {
  const colorFormat = color.format(options.value.colors?.warn);

  console.log(colorFormat(
    `WARN: ` +
    `${timestamp.now()}` +
    msg
  ));
}

export function error(msg: string) {
  const colorFormat = color.format(options.value.colors?.error);

  console.log(colorFormat(
    `ERROR: ` +
    `${timestamp.now()}` +
    msg
  ));
}

export default (newOptions: bark.Options = {}) => {
  options.value = { ...options.value, ...newOptions };

  const {
    prefix = 'LOG',
  } = options.value;

  return (req: Request, res: Response, next: NextFunction) => {
    let startTimeString = timestamp.now();
    let startTime = Date.now();
    const colorFormat = color.format(options.value.colors?.http);

    dashboard.addLog({
      level: 'info',
      message: 'feli cumpleanio :)',
      source: 'request'
    });

    console.log(colorFormat(
      `${prefix}: ` +
      `${startTimeString}` +
      `${req.method} ` +
      `${req.url}`
    ));

    res.on('finish', () => {
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

      console.log(colorFormat(
        `${prefix}: ` +
        `${endTimeString}` +
        `${req.method} ` +
        `${req.url} ` +
        `${statusColor(status.toString())} ` +
        `${pc.gray(`- ${duration}ms`)}`
      ));
    });

    next();
  };
};