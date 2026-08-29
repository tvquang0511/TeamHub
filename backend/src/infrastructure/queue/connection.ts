import IORedis from "ioredis";
import env from "../../config/env";

let _queueConnection: IORedis | null = null;

export function getQueueConnection(): IORedis {
  if (_queueConnection) return _queueConnection;

  _queueConnection = new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
  });

  _queueConnection.on("error", (err) => {
    // eslint-disable-next-line no-console
    console.error("[queue-connection] Redis error:", err);
  });

  return _queueConnection;
}
