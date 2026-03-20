import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";

import routes from "./routes";
import errorHandler from './common/middlewares/errorHandler';
import swaggerUi from 'swagger-ui-express';
import { buildOpenApiDocument } from './docs/openapi';

dotenv.config();


const app = express();
app.use(
  cors({
    origin: process.env.CORS_ORIGIN
      ?.split(',')
      .map((s) => s.trim())
      .filter(Boolean) ?? [
      'http://localhost:5173',
    ],
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
    service: "teamhub-backend",
    time: new Date().toISOString(),
  });
});

// API routes
app.use("/api", routes);

// not found
app.use((req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Cannot ${req.method} ${req.path}`,
      details: {},
    },
  });
});

app.use(errorHandler);

// root
app.get("/", (req, res) => {
  res.json({
    message: "Backend running",
  });
});

export default app;
