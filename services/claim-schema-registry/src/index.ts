import { createService, startService } from "@cohorti/service-kit";

const PORT = Number(process.env.PORT_CLAIM_SCHEMA_SVC ?? 4006);
const app = createService({ name: "claim-schema-registry", port: PORT });

// TODO: register routes implementing this service's slice of
// README.md § "Requirements" — see this package's README.md for
// which DFD process / component-diagram box this service is.

startService(app, PORT);
