export function resolvePlaywrightRuntime(env: Record<string, string | undefined> = process.env) {
  const rawPort = env.PLAYWRIGHT_PORT?.trim() || "3000";
  const port = Number.parseInt(rawPort, 10);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`PLAYWRIGHT_PORT must be an integer from 1 to 65535; received ${rawPort}`);
  }

  const baseURL = env.PLAYWRIGHT_BASE_URL?.trim() || `http://127.0.0.1:${port}`;
  const parsed = new URL(baseURL);
  const serverPort = parsed.port ? Number.parseInt(parsed.port, 10) : parsed.protocol === "https:" ? 443 : 80;
  const hostname = parsed.hostname;
  if (!/^[a-zA-Z0-9.:-]+$/.test(hostname)) throw new Error("PLAYWRIGHT_BASE_URL contains an unsupported hostname");

  return { baseURL: parsed.toString().replace(/\/$/, ""), hostname, port: serverPort };
}
