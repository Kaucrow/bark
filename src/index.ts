import { RequestHandler } from 'express';

import barkMiddleware, {
  serve as _serve,
  debug as _debug,
  info as _info,
  warn as _warn,
  error as _error
} from '@/bark';
import type { Color } from '@/options';

declare namespace bark {
  interface Options {
    prefix?: string,
    showTimestamp?: boolean,
    timestampFormat?: string,
    colors?: {
      debug?: Color,
      warn?: Color,
      info?: Color,
      error?: Color,
      http?: Color
    }
  }

  interface DashboardOptions {
    port?: number,
  }

  function serve(options?: DashboardOptions): RequestHandler

  function debug(msg: string): void

  function info(msg: string): void

  function warn(msg: string): void

  function error(msg: string): void
}

bark.serve = _serve;
bark.debug = _debug;
bark.info = _info;
bark.warn = _warn;
bark.error = _error;

function bark(options?: bark.Options) {
  return barkMiddleware(options);
}

export = bark;