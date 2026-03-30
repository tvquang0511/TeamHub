import { createServer } from "http";

import app from "./app";
import { setupSocketServer } from "./realtime/socket";
import { ensureBoardMetricsDailyJob } from "./integrations/queue/analytics.queue";

const PORT = process.env.PORT || 4000;

const httpServer = createServer(app);
setupSocketServer(httpServer);

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  ensureBoardMetricsDailyJob().catch((err) => {
    console.error("Failed to schedule analytics job", err);
  });
});