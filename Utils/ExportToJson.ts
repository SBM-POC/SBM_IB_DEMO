import fs from 'fs';
import path from 'path';

// Configuration values — change as needed
const INPUT_DIR = './allure-results';  // Folder where Allure stores its raw JSON files
const OUTPUT_FILE = './exported.json'; // Final output to be uploaded to Xray
const DEFAULT_TEST_KEY = 'SQP-288';    // The manual test key in Xray (same for all scenarios)
const TEST_PLAN_KEY = 'SQP-318';       // Link this execution to a Test Plan in Jira

// Step 1: Read all files that end with -result.json (Allure test outputs)
const resultFiles = fs
  .readdirSync(INPUT_DIR)
  .filter((f) => f.endsWith('-result.json'));

// Track all iterations
const iterations: { status: string; comment: string }[] = [];

resultFiles.forEach((fileName) => {
  try {
    const raw = fs.readFileSync(path.join(INPUT_DIR, fileName), 'utf-8');
    const data = JSON.parse(raw);

    iterations.push({
      status: data.status?.toUpperCase() ?? 'SKIPPED',
      comment: data.name ?? 'Unnamed Test'               // Use scenario name as comment
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`Skipping [${fileName}]: ${message}`);                     // Log bad JSONs or unreadable files
  }
});

// Step 3: Determine overall test status for Xray
// Rule: If ANY scenario failed or broke, mark the whole execution as FAILED
const getOverallStatus = (statuses: string[]): string => {
  if (statuses.includes('FAILED') || statuses.includes('BROKEN')) return 'FAILED';
  if (statuses.includes('SKIPPED')) return 'SKIPPED';
  return 'PASSED';
};

const allStatuses = iterations.map((i) => i.status);

// Step 4: Combine all scenario results into one multi-line comment
const combinedComment = iterations
  .map((i, index) => `Scenario ${index + 1}: ${i.comment} (${i.status})`)
  .join('\n');

// Step 5: Build the Xray-compatible JSON payload
const payload = {
  info: {
    summary: 'Execution of automated tests',       // What appears as the execution title in Jira
    description: 'Imported from Allure exports',   // Additional context
    startDate: new Date().toISOString(),           // Required by Xray API
    finishDate: new Date().toISOString(),          // Can be same as startDate for simplicity
    testPlanKey: TEST_PLAN_KEY                     // Links execution to a Test Plan               
  },
  tests: [
    {
      testKey: DEFAULT_TEST_KEY,                   // Manual test case in Xray
      status: getOverallStatus(allStatuses),       // Overall status for the whole test
      comment: combinedComment                     // Detailed scenario outcomes as a single string
    }
  ]
};
// Step 6: Write the JSON to disk for later upload
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(payload, null, 2));
// Success log
console.log(`✅ Exported ${iterations.length} scenario(s) to "${OUTPUT_FILE}" as a single test result.`);