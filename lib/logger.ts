import pino from "pino";

// A structured logger using Pino.
// This is critical for Datadog / Sentry observability.
export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  // In development, you might want to use pino-pretty for readable logs
  // transport: process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty' } : undefined,
  base: {
    env: process.env.NODE_ENV,
  },
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});
