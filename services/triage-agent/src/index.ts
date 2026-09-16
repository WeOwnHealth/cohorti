import { createService, startService } from "@passport/service-kit";
import { registerRoutes } from "./routes.js";

const PORT = Number(process.env.PORT_TRIAGE_AGENT_SVC ?? 4009);
const app = createService({ name: "triage-agent", port: PORT });

registerRoutes(app);

startService(app, PORT);
