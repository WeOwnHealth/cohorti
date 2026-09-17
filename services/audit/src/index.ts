import { createService, startService } from "@passport/service-kit";
import { registerRoutes } from "./routes.js";

const PORT = Number(process.env.PORT_AUDIT_SVC ?? 4010);
const app = createService({ name: "audit", port: PORT });

registerRoutes(app);

startService(app, PORT);
