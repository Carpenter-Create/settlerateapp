/**
 * Docker Postgres readiness helpers for entitlement SQL authority tests.
 * Pure functions are unit-tested; exec functions accept injectable runners for tests.
 */

export const DEFAULT_READINESS = {
  maxAttempts: 60,
  intervalMs: 1000,
};

/**
 * Returns true while another readiness attempt should be made.
 */
export function shouldRetryReadiness(attemptIndex, maxAttempts) {
  return attemptIndex < maxAttempts - 1;
}

/**
 * Human-readable failure message when Postgres never becomes ready.
 */
export function formatReadinessFailure(options) {
  const {
    containerName,
    maxAttempts,
    intervalMs,
    lastError,
    logs,
  } = options;
  const waitedSeconds = Math.round((maxAttempts * intervalMs) / 1000);
  const lines = [
    `Postgres container "${containerName}" did not become ready within ${waitedSeconds}s (${maxAttempts} attempts).`,
  ];
  if (lastError) {
    lines.push(`Last probe error: ${lastError}`);
  }
  if (logs) {
    lines.push("Container logs:");
    lines.push(logs);
  }
  return lines.join("\n");
}

export function buildPgIsreadyCommand(containerName, user) {
  return `docker exec ${containerName} pg_isready -U ${user} -d postgres`;
}

export function buildPsqlProbeCommand(containerName, user) {
  return `docker exec ${containerName} psql -U ${user} -d postgres -v ON_ERROR_STOP=1 -c "SELECT 1" -t -A`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Poll pg_isready and a real psql probe until both succeed or timeout.
 */
export async function waitForPostgresReady(options) {
  const {
    containerName,
    user,
    maxAttempts = DEFAULT_READINESS.maxAttempts,
    intervalMs = DEFAULT_READINESS.intervalMs,
    exec,
    onAttemptFailure,
  } = options;

  let lastError = "unknown";

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      exec(buildPgIsreadyCommand(containerName, user), { stdio: "pipe" });
      const probe = exec(buildPsqlProbeCommand(containerName, user), { stdio: "pipe" });
      if (!probe.includes("1")) {
        throw new Error(`Unexpected psql probe output: ${probe}`);
      }
      return;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      if (onAttemptFailure) {
        onAttemptFailure({ attempt, lastError });
      }
      if (!shouldRetryReadiness(attempt, maxAttempts)) {
        break;
      }
      await sleep(intervalMs);
    }
  }

  let logs;
  try {
    logs = exec(`docker logs ${containerName} 2>&1 | tail -n 80`, { stdio: "pipe" });
  } catch {
    logs = "(unable to read container logs)";
  }

  throw new Error(
    formatReadinessFailure({
      containerName,
      maxAttempts,
      intervalMs,
      lastError,
      logs,
    })
  );
}

/**
 * Remove a named container if it exists (stale CI/local runs).
 */
export function removeDockerContainer(containerName, exec) {
  try {
    exec(`docker rm -f ${containerName}`, { stdio: "pipe" });
  } catch {
    // Container may not exist; ignore removal errors.
  }
}

/**
 * Start a fresh Postgres 16 container on the given host port.
 */
export function startPostgresContainer(options) {
  const { containerName, password, hostPort, exec } = options;
  removeDockerContainer(containerName, exec);
  exec(
    `docker run -d --name ${containerName} -e POSTGRES_PASSWORD=${password} -p ${hostPort}:5432 postgres:16-alpine`,
    { stdio: "pipe" }
  );
}
