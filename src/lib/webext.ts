// The extension API: `browser` in Firefox, `chrome` in Chrome, which take the same promise-based calls
// in Manifest V3. Undefined in plain `npm run dev` (Chrome gives ordinary pages a `chrome` object too,
// but without storage).
const scope = globalThis as { browser?: typeof browser; chrome?: typeof browser }
const api   = scope.browser ?? scope.chrome
export const webext = api?.storage ? api : undefined
