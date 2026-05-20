import net from 'node:net';

function parseRedisUrl(redisUrl) {
  try {
    const url = new URL(redisUrl);
    return {
      host: url.hostname || '127.0.0.1',
      port: Number(url.port || 6379),
    };
  } catch {
    return null;
  }
}

/**
 * Probe Redis reachability with a minimal TCP connect (no redis client dependency).
 */
export function probeRedisReachable(redisUrl, { timeoutMs = 1500 } = {}) {
  const target = parseRedisUrl(redisUrl);
  if (!target) {
    return Promise.resolve({ configured: false, reachable: false, error_type: 'invalid_url' });
  }

  return new Promise((resolve) => {
    const socket = net.createConnection({ host: target.host, port: target.port });
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      try { socket.destroy(); } catch { /* ignore */ }
      resolve(result);
    };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish({ configured: true, reachable: true, error_type: null }));
    socket.once('timeout', () => finish({ configured: true, reachable: false, error_type: 'timeout' }));
    socket.once('error', (err) => finish({
      configured: true,
      reachable: false,
      error_type: String(err?.code || err?.name || 'connect_failed'),
    }));
  });
}

export async function redisReadiness({ timeoutMs = 1500 } = {}) {
  const url = process.env.REDIS_URL;
  const configured = typeof url === 'string' && url.length > 0 && !/CHANGE_ME|REPLACE_ME/i.test(url);
  if (!configured) {
    return {
      configured: false,
      reachable: false,
      ready: false,
    };
  }
  const probe = await probeRedisReachable(url, { timeoutMs });
  return {
    configured: true,
    reachable: probe.reachable === true,
    ready: probe.reachable === true,
    error_type: probe.error_type || null,
  };
}
