import { createService, startService } from "@cohorti/service-kit";
import { registerRoutes } from "./routes.js";

const PORT = Number(process.env.PORT_VERIFIER_API_SVC ?? 4008);
const app = createService({ name: "verifier-api", port: PORT });

registerRoutes(app);

startService(app, PORT);
