/**
 * Resolve Mesh2Motion asset paths.
 * Soundplayground / Circle Beat: /animations and /rigs (Netlify rewrites onto /circlebeat/).
 * Free NPC Maker hub: /v1.0x/static/...
 */
export function assetUrl(path) {
  const clean = String(path || "").replace(/^\//, "");
  if (typeof location !== "undefined") {
    const m = location.pathname.match(/^\/(v[\d.]+)(?:\/|$)/i);
    if (m) return `/${m[1]}/static/${clean}`;
  }
  return `/${clean}`;
}
