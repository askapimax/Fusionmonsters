import { ConcordRegistry } from '../genetics/registry';

/**
 * The app-wide Concord registry (see README "The Concord registry"): a
 * single persistent-for-the-session log of every distinct Fusion signature
 * the player has encountered or bred, mirroring the module-level singleton
 * pattern `src/state/party.ts` / `src/state/inventory.ts` already use
 * instead of dependency injection.
 *
 * `ConcordRegistry` itself (src/genetics/registry.ts) stays a plain,
 * DI-friendly class - CatalogPreviewScene still makes its own throwaway
 * instance for its debug pipeline demo - this module is just the one real
 * instance the actual game wires gameplay into.
 */
export const concordRegistry = new ConcordRegistry();
