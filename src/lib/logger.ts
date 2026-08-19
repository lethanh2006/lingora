import "server-only";

type LogLevel = "INFO" | "WARNING" | "ERROR" | "DEBUG";

interface LogPayload {
  message: string;
  level: LogLevel;
  timestamp: string;
  userId?: string;
  path?: string;
  method?: string;
  error?: any;
  metadata?: Record<string, any>;
}

function log(
  level: LogLevel,
  message: string,
  extra?: Partial<Omit<LogPayload, "level" | "message" | "timestamp">> & { error?: any },
) {
  const payload: LogPayload = {
    message,
    level,
    timestamp: new Date().toISOString(),
  };

  if (extra) {
    if (extra.userId) payload.userId = extra.userId;
    if (extra.path) payload.path = extra.path;
    if (extra.method) payload.method = extra.method;
    if (extra.metadata) payload.metadata = extra.metadata;

    if (extra.error) {
      if (extra.error instanceof Error) {
        payload.error = {
          message: extra.error.message,
          stack: extra.error.stack,
        };
      } else {
        payload.error = {
          message: String(extra.error),
        };
      }
    }
  }

  // Outputs structured JSON logs to stdout/stderr
  const logString = JSON.stringify(payload);
  if (level === "ERROR") {
    console.error(logString);
  } else if (level === "WARNING") {
    console.warn(logString);
  } else {
    console.log(logString);
  }
}

export const logger = {
  info(
    message: string,
    extra?: Partial<Omit<LogPayload, "level" | "message" | "timestamp">> & { error?: any },
  ) {
    log("INFO", message, extra);
  },
  warn(
    message: string,
    extra?: Partial<Omit<LogPayload, "level" | "message" | "timestamp">> & { error?: any },
  ) {
    log("WARNING", message, extra);
  },
  error(
    message: string,
    extra?: Partial<Omit<LogPayload, "level" | "message" | "timestamp">> & { error?: any },
  ) {
    log("ERROR", message, extra);
  },
  debug(
    message: string,
    extra?: Partial<Omit<LogPayload, "level" | "message" | "timestamp">> & { error?: any },
  ) {
    log("DEBUG", message, extra);
  },
};
export type Logger = typeof logger;
