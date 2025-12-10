export interface LogMessage {
  id: string;
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  source?: string;
}

export interface ClientMessage {
  type: string;
  data: any;
}