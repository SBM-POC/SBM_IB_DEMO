import axios from 'axios';
import fs from 'fs';
import path from 'path';

const XRAY_CLIENT_ID = process.env.XRAY_CLIENT_ID;
const XRAY_CLIENT_SECRET = process.env.XRAY_CLIENT_SECRET;
const ALLURE_JSON_PATH = './exported.json';

interface TokenResponse {
  token: string;
}

interface ImportResponse {
  id: number;
  key: string;
  self: string;
}

async function getXrayToken(): Promise<string> {
  if (!XRAY_CLIENT_ID || !XRAY_CLIENT_SECRET) {
    throw new Error('Missing XRAY_CLIENT_ID or XRAY_CLIENT_SECRET from environment');
  }

  const response = await axios.post<TokenResponse>(
    'https://xray.cloud.getxray.app/api/v2/authenticate',
    {
      client_id: XRAY_CLIENT_ID,
      client_secret: XRAY_CLIENT_SECRET
    },
    {
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );

  return response.data.token;
}

async function uploadResults(token: string, payload: any): Promise<string> {
  const response = await axios.post<ImportResponse>(
    'https://xray.cloud.getxray.app/api/v2/import/execution',
    payload,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );

  console.log('Results uploaded successfully:', response.data);

  const executionKey = response.data?.key;
  if (!executionKey) {
    throw new Error('Xray response missing execution key!');
  }

  return executionKey;
}

(async function main() {
  try {
    const fullPath = path.resolve(ALLURE_JSON_PATH);
    const raw = fs.readFileSync(fullPath, 'utf-8').replace(/^\uFEFF/, '');
    const payload = JSON.parse(raw);

    const testCount = payload.tests?.length || 0;
    console.log(`Found ${testCount} tests in payload.`);
    if (testCount === 0) {
      throw new Error('No tests found in the exported payload.');
    }

    const token = await getXrayToken();
    console.log('Token retrieved successfully.');

    const executionKey = await uploadResults(token, payload);

    // Use xray.cloud.getxray.app in UI link too
    const executionUrl = `https://xray.cloud.getxray.app/app/#/testexecutions/${executionKey}`;
    fs.appendFileSync(
      'notification-env.txt',
      `EXECUTION_URL=${executionUrl}\n`
    );

    console.log(`Saved execution URL: ${executionUrl}`);
    console.log('Xray upload complete.');
  } catch (error: any) {
    console.error('Upload failed:', error.response?.data || error.message);

    // Write a placeholder in case notification step runs
    fs.appendFileSync(
      'notification-env.txt',
      `EXECUTION_URL=Upload failed\n`
    );

    process.exit(1); // Fail the step explicitly if needed
  }
})();


