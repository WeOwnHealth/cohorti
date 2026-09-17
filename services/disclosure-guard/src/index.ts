import { createService, startService } from "@passport/service-kit";
import { registerRoutes } from "./routes.js";

const PORT = Number(process.env.PORT_DISCLOSURE_GUARD_SVC ?? 4007);
const app = createService({ name: "disclosure-guard", port: PORT });

registerRoutes(app);

startService(app, PORT);
