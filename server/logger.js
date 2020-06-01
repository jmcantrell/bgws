import pino from "pino";

export default function create(child = null) {
  const level = process.env.LOG_LEVEL;
  const logger = pino({ level });
  return child ? logger.child(child) : logger;
}
