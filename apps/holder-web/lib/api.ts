import type { Credential } from "@cohorti/shared-types";

const ISSUANCE_URL = process.env.ISSUANCE_SVC_URL ?? "http://localhost:4004";

export async function listCredentials(holderId: string): Promise<Credential[]> {
  try {
    const res = await fetch(`${ISSUANCE_URL}/credentials?holderId=${encodeURIComponent(holderId)}`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    return (await res.json()) as Credential[];
  } catch {
    // issuance-svc not running locally — surfaced as an empty state, not a crash.
    return [];
  }
}
