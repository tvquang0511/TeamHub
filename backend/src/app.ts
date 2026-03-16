import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";

import routes from "./routes";

dotenv.config();
console.log('DATABASE_URL:', process.env.DATABASE_URL);


const app = express();
app.use(cors());
app.use(helmet());
app.use(morgan("dev"));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// root
app.get("/", (req, res) => {
  res.json({
    message: "Backend running",
  });
});

export default app;