import * as fs from 'fs';
import * as path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';



// --- Interfaces for Allure Input ---
interface AllureTime {
  start: number;
  stop: number;
  duration: number;
}

interface AllureNode {
  uid: string;
  name: string;
  children?: AllureNode[]; // Nested structure
  status?: 'passed' | 'failed' | 'broken' | 'skipped' | 'unknown';
  time?: AllureTime;
  tags?: string[];
  parameters?: string[];
}

// --- Interfaces for Xray Output ---
interface XrayIterationParameter {
  name: string;
  value: string;
}

interface XrayIteration {
  name: string;
  parameters?: XrayIterationParameter[];
  log?: string;
  status: string;
}

interface XrayTest {
  testKey: string;
  start: string;
  finish: string;
  status: string;
  comment?: string;
  iterations?: XrayIteration[];
}

interface XrayInfo {
  project: string;
  summary: string;
  testPlanKey?: string;
}

interface XrayReport {
  info: XrayInfo;
  tests: XrayTest[];
}

// --- Configuration ---
const INPUT_FILE = "suites.json";
const OUTPUT_FILE = 'xray-import.json';
const PROJECT_KEY = 'SQP'; // Default Project Key
const TEST_PLAN_KEY = process.env.TEST_PLAN_KEY; // Target Test Plan

/**
 * 1. Helper: Convert Epoch ms to ISO String (Xray Format)
 */
const formatTime = (ms: number): string => {
  return new Date(ms).toISOString(); // Returns YYYY-MM-DDTHH:mm:ss.sssZ
};

/**
 * 2. Helper: Map Allure Status to Xray Status
 */
const mapStatus = (allureStatus: string): string => {
  switch (allureStatus?.toLowerCase()) {
    case 'passed': return 'PASSED';
    case 'failed': return 'FAILED';
    case 'broken': return 'FAILED'; // Treat broken as failed
    case 'skipped': return 'ABORTED';
    default: return 'EXECUTING';
  }
};

/**
 * 3. Helper: Extract Issue Key (e.g., SQP-1657) from text
 * Logic: Looks for pattern "PROJECT-NUMBER"
 */
const extractTestKey = (text: string): string | null => {
  const regex = /([A-Z]+-\d+)/;
  const match = text.match(regex);
  return match ? match[1] : null;
};

/**
 * 4. Recursive function to collect all leaf test results
 */
const collectLeaves = (node: AllureNode, leaves: AllureNode[] = []): AllureNode[] => {
  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      collectLeaves(child, leaves);
    }
  } else {
    // It's a leaf node (actual test case)
    leaves.push(node);
  }
  return leaves;
};

// --- Main Execution Logic ---

try {
  // Read Input
  const rawData = fs.readFileSync(
  path.resolve(process.cwd(), 'allure-report', 'data', INPUT_FILE),
  'utf-8'
);

  //const rawData = fs.readFileSync(path.resolve(__dirname, '..','allure-report','data', INPUT_FILE), 'utf-8');
  //const rawData = fs.readFileSync(path.resolve("C://main//allure-report//data//suites.json"), 'utf-8');

  const allureData: AllureNode = JSON.parse(rawData);

  console.log(`✅ Read ${INPUT_FILE}`);

  // Flatten the tree to get all test cases
  const allTests = collectLeaves(allureData);
  
  // Group tests by Test Key (e.g., SQP-1657)
  const testsByKey: Record<string, AllureNode[]> = {};

  allTests.forEach(test => {
    // Try to find key in tags first, then name
    let key = test.tags?.find(t => extractTestKey(t)) || extractTestKey(test.name);

    if (key) {
      if (!testsByKey[key]) testsByKey[key] = [];
      testsByKey[key].push(test);
    } else {
      console.warn(`⚠️  Warning: No Test Key found for "${test.name}". Skipping.`);
    }
  });

  // Transform to Xray Schema
  const xrayTests: XrayTest[] = Object.keys(testsByKey).map(key => {
    const group = testsByKey[key];
    
    // Calculate aggregate start/end
    const startTime = Math.min(...group.map(t => t.time?.start || Date.now()));
    const endTime = Math.max(...group.map(t => t.time?.stop || Date.now()));
    
    // Determine overall status (Failed if any iteration failed)
    const isAnyFailed = group.some(t => t.status === 'failed' || t.status === 'broken');
    const overallStatus = isAnyFailed ? 'FAILED' : 'PASSED';

    // Build Iterations
    const iterations: XrayIteration[] = group.map((test, index) => ({
      name: test.name.split('|').pop()?.trim() || `Iteration ${index + 1}`, // Clean name
      log: test.status === 'failed' ? 'Test failed. Check Allure for stack trace.' : 'Test passed successfully',
      status: mapStatus(test.status || 'unknown'),
      parameters: test.parameters ? test.parameters.map(p => ({ name: "Parameter_"+index, value: p })) : []
    }));

    return {
      testKey: key,
      start: formatTime(startTime),
      finish: formatTime(endTime),
      status: overallStatus,
      comment: `Auto-generated from Allure. Total scenarios: ${group.length}`,
      iterations: iterations
    };
  });

  const output: XrayReport = {
    info: {
      project: PROJECT_KEY,
      summary: `Automated Execution - ${new Date().toISOString()}`,
      testPlanKey: TEST_PLAN_KEY
    },
    tests: xrayTests
  };

  // Write Output
  //fs.writeFileSync(path.resolve(__dirname, OUTPUT_FILE), JSON.stringify(output, null, 2));
  fs.writeFileSync(path.resolve(process.cwd(), 'allure-report', 'data', OUTPUT_FILE)
, JSON.stringify(output, null, 2));

  console.log(`✅ Successfully generated ${OUTPUT_FILE} with ${xrayTests.length} tests.`);

} catch (error) {
  console.error('❌ Error processing file:', error);
}