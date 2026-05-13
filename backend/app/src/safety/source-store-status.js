// Lightweight status accessor for /ready. Mirrors the private `_repository`
// flag inside source-store.js without importing it (avoids a circular
// dependency at module load). Updated whenever configureSourceStore* is
// called via the side-channel below.
let _retrievalConfigured = false;

export function isSourceRetrievalConfigured() {
  return _retrievalConfigured;
}

/** @internal */
export function _setRetrievalConfigured(v) {
  _retrievalConfigured = Boolean(v);
}
