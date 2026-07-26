import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import routes from "./routes";
import errorHandler from './common/middlewares/errorHandler';
import swaggerUi from 'swagger-ui-express';
import { buildOpenApiDocument } from './docs/openapi';
import env from "./config/env";

const app = express();

// Important for correct req.ip when running behind Nginx/reverse proxy.
app.set("trust proxy", env.TRUST_PROXY ? 1 : false);

app.use(
  cors({
    origin: (requestOrigin, callback) => {
      // Allow non-browser requests (Postman, curl, server-to-server)
      if (!requestOrigin) return callback(null, true);

      const rawCorsEnv = env.CORS_ORIGIN ?? '*';
      const configuredOrigins = rawCorsEnv.split(',').map((s) => s.trim()).filter(Boolean);

      // Dynamically reflect origin to satisfy credentials: true spec
      if (
        configuredOrigins.includes('*') ||
        configuredOrigins.includes(requestOrigin) ||
        requestOrigin.endsWith('.vercel.app') ||
        requestOrigin.includes('localhost')
      ) {
        return callback(null, requestOrigin);
      }

      return callback(null, requestOrigin);
    },
    credentials: true,
  }),
);

app.use(helmet());
app.use(morgan("dev"));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// OpenAPI / Swagger
const openApiDocument = buildOpenApiDocument();
app.get('/openapi.json', (_req, res) => res.json(openApiDocument));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));

// health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: env.NODE_ENV,
  });
});

// App Routes
app.use(routes);

// Error Handler
app.use(errorHandler);

export default app;
