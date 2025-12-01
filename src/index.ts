import barkMiddleware, {
  debug as _debug,
  info as _info,
  warn as _warn,
  error as _error
} from '@/bark';

declare namespace bark {
  interface Options {
    prefix?: string,
    showTimestamp?: boolean,
    timestampFormat?: string,
  }

  function debug(msg: string): void

  function info(msg: string): void

  function warn(msg: string): void

  function error(msg: string): void
}

bark.debug = _debug;
bark.info = _info;
bark.warn = _warn;
bark.error = _error;

function bark(options?: bark.Options) {
  return barkMiddleware(options);
}

export = bark;