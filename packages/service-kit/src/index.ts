import Fastify, { type FastifyInstance } from "fastify";

export interface ServiceOptions {
  /** Short service name, e.g. "disclosure-guard" — used in logs and the /health payload. */
  name: string;
  port: number;
  logLevel?: string;
}

/**
 * Builds a Fastify instance with the conventions every Cohorti service
 * shares: structured logging, a `/health` endpoint, and graceful shutdown.
 * Business routes are registered by the caller after this returns.
 *
 * Non-functional requirement traceability: README.md requires every flow to
 * be "auditable end to end" — structured logs here are the first link in
 * that chain, feeding services/audit in later iterations.
 */
export function createService(opts: ServiceOptions): FastifyInstance {
  const app = Fastify({
    logger: {
      level: opts.logLevel ?? process.env.LOG_LEVEL ?? "info",
      base: { service: opts.name },
    },
  });

  app.get("/health", async () => ({
    status: "ok",
    service: opts.name,
    timestamp: new Date().toISOString(),
  }));

  return app;
}

export async function startService(app: FastifyInstance, port: number): Promise<void> {
  try {
    await app.listen({ port, host: "0.0.0.0" });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, async () => {
      app.log.info({ signal }, "shutting down");
      await app.close();
      process.exit(0);
    });
  }
}
