const explicitBaseUrl = process.env.SG_WEATHER_OPS_URL;
const candidates = explicitBaseUrl
  ? [explicitBaseUrl]
  : [
      `http://sg-weather-ops-dashboard.localhost:${process.env.PORTLESS_PORT ?? '1355'}`,
      `http://127.0.0.1:${process.env.PORT ?? '3000'}`,
    ];

async function check(baseUrl, path) {
  const response = await fetch(`${baseUrl}${path}`);
  if (!response.ok) {
    throw new Error(`${path} returned HTTP ${response.status}`);
  }
  return response;
}

const failures = [];

for (const baseUrl of candidates) {
  try {
    await check(baseUrl, '/health');
    await check(baseUrl, '/api/locations');
    console.log(`SG Weather Ops Dashboard is healthy at ${baseUrl}`);
    process.exit(0);
  } catch (error) {
    failures.push(`${baseUrl}: ${error instanceof Error ? error.message : 'unknown error'}`);
  }
}

throw new Error(`SG Weather Ops Dashboard is not healthy. Checked: ${failures.join('; ')}`);
