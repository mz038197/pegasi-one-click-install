/**
 * Parse Sign-in Handoff from a vscode:// / cursor:// URI or a bare paste code.
 * Never expects an API key in the URI.
 */

const HANDOFF_PATH = "/handoff";
const TOKEN_QUERY = "token";

/** Handoff tokens look like nonce:userId:unixTs:hexSig */
const BARE_TOKEN_RE = /^[A-Za-z0-9_-]+:\d+:\d+:[a-f0-9]{64}$/;

export function parseHandoffToken(input: string): string | undefined {
  const raw = (input || "").trim();
  if (!raw) {
    return undefined;
  }
  if (BARE_TOKEN_RE.test(raw)) {
    return raw;
  }
  try {
    const uri = new URL(raw);
    if (uri.protocol !== "vscode:" && uri.protocol !== "cursor:") {
      return undefined;
    }
    // URL path may be "//publisher.ext/handoff" depending on parser
    const path = uri.pathname.replace(/^\/\//, "/");
    const pathOk =
      path.endsWith(HANDOFF_PATH) ||
      path.includes(".pegasi-classroom-install/handoff");
    if (!pathOk && !raw.includes("/handoff?")) {
      return undefined;
    }
    const token = uri.searchParams.get(TOKEN_QUERY)?.trim();
    if (token && BARE_TOKEN_RE.test(token)) {
      return token;
    }
  } catch {
    // fall through
  }
  // Manual parse for vscode://host/path?token=...
  const match = raw.match(/[?&]token=([^&]+)/);
  if (match?.[1]) {
    try {
      const token = decodeURIComponent(match[1]).trim();
      if (BARE_TOKEN_RE.test(token)) {
        return token;
      }
    } catch {
      return undefined;
    }
  }
  return undefined;
}
