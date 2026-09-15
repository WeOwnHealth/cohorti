// SPDX-License-Identifier: Apache-2.0
// Minimal pino logger for the deploy tooling. No transports; plain stdout JSON.
import pino, { type Logger } from 'pino';

export const createLogger = (): Logger =>
  pino({
    level: process.env.LOG_LEVEL ?? 'info',
    base: undefined,
    messageKey: 'msg',
  });
