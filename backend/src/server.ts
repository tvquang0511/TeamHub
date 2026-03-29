import { createServer } from "http";

import app from "./app";
import { setupSocketServer } from "./realtime/socket";

const PORT = process.env.PORT || 4000;

const httpServer = createServer(app);
setupSocketServer(httpServer);

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});