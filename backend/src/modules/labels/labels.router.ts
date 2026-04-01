import { Router } from "express";

import { authJwt } from "../../common/middlewares/authJwt";
import { labelsRateLimit } from "../../common/middlewares/rateLimit";
import { labelsController } from "./labels.controller";

const router = Router();

router.use(authJwt);
router.use(labelsRateLimit);

// Query-based list so we can reuse the same endpoint across workspace views
router.get("/", labelsController.list);
router.post("/", labelsController.create);
router.patch("/:id", labelsController.update);
router.delete("/:id", labelsController.delete);

export const labelsRoutes = router;
