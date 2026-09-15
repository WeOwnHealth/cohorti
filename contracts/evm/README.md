# @cohorti/contracts-evm

**Why does an EVM chain exist in a Midnight-focused product?** Today, for one reason only: `AuditAnchor.sol` anchors `services/audit`'s hash-chain digest on-chain, and this was the chain at hand when that piece was scaffolded. **The actual proof layer — the reason Midnight is the core of this product — lives entirely in `contracts/midnight`, untouched by anything here.** If you're looking for the ZK claim circuits, they're not in this directory.

One Solidity contract, validated with the real Foundry toolchain (`forge build` + `forge test`, 8/8 passing) before landing here:

- **`src/AuditAnchor.sol`** — a small, non-standard contract that anchors `services/audit`'s hash-chain digest so historical tampering becomes provable. See README.md § "digest anchored on-chain".

## Deliberately not here: agent identity

README.md's spec names **ERC-7857** — an Ethereum standard — for the triage agent's verifiable identity (§ "Agentic layer"). An implementation existed in this package at one point (`AgentIdentity.sol` + the `IERC7857` interface, reproduced from [EIP-7857](https://eips.ethereum.org/EIPS/eip-7857)) and was rolled back: building the identity/verification mechanism ahead of a team decision on *how* to implement it (ERC-7857 on this EVM chain, a Midnight-native scheme instead, or something else) risked baking in a choice nobody had actually agreed to. `packages/shared-types/src/agent.ts`'s `AuditTrace.agentIdentity` stays a plain, unverified string in the meantime — accepted and recorded by `services/triage-agent`, not authenticated against anything — so the rest of the system isn't coupled to a specific chain or format ahead of that decision. Whoever picks this back up should start from EIP-7857 directly rather than assuming the prior implementation is still relevant; check `git log -- contracts/evm` for it if useful as a reference.

## Install Foundry

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

## Build & test

```bash
pnpm --filter @cohorti/contracts-evm build
pnpm --filter @cohorti/contracts-evm test
```

## Design notes worth knowing before you touch this

- **`admin` is a single address, not a multisig or timelock.** Fine for local dev; replace before anything real is at stake — a compromised or lost admin key can reassign the audit anchor's authorized anchorers.
- **`AuditAnchor.sol` is append-only by design** — there's no update or delete. A wrong digest is corrected by anchoring a new, later entry, never by rewriting history.
