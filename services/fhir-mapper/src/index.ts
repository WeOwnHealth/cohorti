import { createService, startService } from "@passport/service-kit";

const PORT = Number(process.env.PORT_FHIR_MAPPER_SVC ?? 4003);
const app = createService({ name: "fhir-mapper", port: PORT });

// TODO: register routes implementing this service's slice of
// README.md § "Requirements" — see this package's README.md for
// which DFD process / component-diagram box this service is.

startService(app, PORT);
