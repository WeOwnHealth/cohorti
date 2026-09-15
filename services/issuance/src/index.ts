import { createService, startService } from "@cohorti/service-kit";
import { registerRoutes } from "./routes.js";

const PORT = Number(process.env.PORT_ISSUANCE_SVC ?? 4004);
const app = createService({ name: "issuance", port: PORT });

registerRoutes(app);

// TODO: signing is not yet implemented — see the NatSpec-style comment in
// src/routes.ts. Everything else in README.md § "Requirements" → "Ingestion
// and issuance" beyond persisting the credential shape is still open.

startService(app, PORT);
