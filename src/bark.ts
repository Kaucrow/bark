import { Request, Response, NextFunction } from 'express';
import pc from 'picocolors';
import bark from '@/index';
import { optionsManager } from '@/options';

const createTimestampFormat = (options: bark.Options) => {
  const { timestampFormat = 'DD-MM-YY HH:mm:ss:ms'} = options;

  return (d: Date) => {
    const tokens: { [key: string]: string } = {
      'YYYY': d.getFullYear().toString(),
      'YY': d.getFullYear().toString().slice(-2),
      'MM': (d.getMonth() + 1).toString().padStart(2, '0'),
      'M': (d.getMonth() + 1).toString(),
      'DD': d.getDate().toString().padStart(2, '0'),
      'D': d.getDate().toString(),
      'HH': d.getHours().toString().padStart(2, '0'),
      'H': d.getHours().toString(),
      'mm': d.getMinutes().toString().padStart(2, '0'),
      'm': d.getMinutes().toString(),
      'ss': d.getSeconds().toString().padStart(2, '0'),
      's': d.getSeconds().toString(),
      'ms': d.getMilliseconds().toString().padStart(3, '0'),
      'SSS': d.getMilliseconds().toString().padStart(3, '0'),
    };

    return timestampFormat.replace(
      /YYYY|YY|MM|M|DD|D|HH|H|mm|m|ss|s|ms|SSS/g,
      (match) => tokens[match]
    );
  };
};

const getTimestamp = (): string => {
  let timestamp = '';

  if (optionsManager.get().showTimestamp) {
    const now = new Date();
    const formatted = timestampFormat(now);
    timestamp = formatted;
  }

  return `[${timestamp}]`;
};

let timestampFormat: (d: Date) => string = createTimestampFormat({});

optionsManager.subscribe((options) => {
  timestampFormat = createTimestampFormat(options);
});

export function debug(msg: string) {
  const timestamp = getTimestamp();

  console.log(
    `DEBUG: ` +
    `${timestamp} ` +
    msg
  );
}

export function info(msg: string) {
  const timestamp = getTimestamp();

  console.log(
    `INFO: ` +
    `${timestamp} ` +
    msg
  );
}

export function warn(msg: string) {
  const timestamp = getTimestamp();

  console.log(
    `WARN: ` +
    `${timestamp} ` +
    msg
  );
}

export function error(msg: string) {
  const timestamp = getTimestamp();

  console.log(
    `ERROR: ` +
    `${timestamp} ` +
    msg
  );
}

export default (options: bark.Options = {}) => {
  optionsManager.updateOptions(options);

  const {
    prefix = 'LOG',
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    let startTimeString = getTimestamp();
    let startTime = Date.now();

    console.log(
      `${prefix}: ` +
      `${startTimeString} ` +
      `${req.method} ` +
      `${req.url}`
    );

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

      let endTimeString = getTimestamp();

      console.log(
        `${prefix}: ` +
        `${endTimeString} ` +
        `${pc.white(req.method)} ` +
        `${req.url} ` +
        `${statusColor(status.toString())} ` +
        `${pc.gray(`- ${duration}ms`)}`
      );
    });

    next();
  };
};