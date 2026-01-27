"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var path = require("path");
// --- Configuration ---
var INPUT_FILE = "suites.json";
var OUTPUT_FILE = 'xray-import.json';
var PROJECT_KEY = 'SQP'; // Default Project Key
var TEST_PLAN_KEY = 'SQP-318'; // Target Test Plan
/**
 * 1. Helper: Convert Epoch ms to ISO String (Xray Format)
 */
var formatTime = function (ms) {
    return new Date(ms).toISOString(); // Returns YYYY-MM-DDTHH:mm:ss.sssZ
};
/**
 * 2. Helper: Map Allure Status to Xray Status
 */
var mapStatus = function (allureStatus) {
    switch (allureStatus === null || allureStatus === void 0 ? void 0 : allureStatus.toLowerCase()) {
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
var extractTestKey = function (text) {
    var regex = /([A-Z]+-\d+)/;
    var match = text.match(regex);
    return match ? match[1] : null;
};
/**
 * 4. Recursive function to collect all leaf test results
 */
var collectLeaves = function (node, leaves) {
    if (leaves === void 0) { leaves = []; }
    if (node.children && node.children.length > 0) {
        for (var _i = 0, _a = node.children; _i < _a.length; _i++) {
            var child = _a[_i];
            collectLeaves(child, leaves);
        }
    }
    else {
        // It's a leaf node (actual test case)
        leaves.push(node);
    }
    return leaves;
};
// --- Main Execution Logic ---
try {
    // Read Input
    var rawData = fs.readFileSync(path.resolve(process.cwd(), 'allure-report', 'data', INPUT_FILE), 'utf-8');
    //const rawData = fs.readFileSync(path.resolve(__dirname, '..','allure-report','data', INPUT_FILE), 'utf-8');
    //const rawData = fs.readFileSync(path.resolve("C://main//allure-report//data//suites.json"), 'utf-8');
    var allureData = JSON.parse(rawData);
    console.log("\u2705 Read ".concat(INPUT_FILE));
    // Flatten the tree to get all test cases
    var allTests = collectLeaves(allureData);
    // Group tests by Test Key (e.g., SQP-1657)
    var testsByKey_1 = {};
    allTests.forEach(function (test) {
        var _a;
        // Try to find key in tags first, then name
        var key = ((_a = test.tags) === null || _a === void 0 ? void 0 : _a.find(function (t) { return extractTestKey(t); })) || extractTestKey(test.name);
        if (key) {
            if (!testsByKey_1[key])
                testsByKey_1[key] = [];
            testsByKey_1[key].push(test);
        }
        else {
            console.warn("\u26A0\uFE0F  Warning: No Test Key found for \"".concat(test.name, "\". Skipping."));
        }
    });
    // Transform to Xray Schema
    var xrayTests = Object.keys(testsByKey_1).map(function (key) {
        var group = testsByKey_1[key];
        // Calculate aggregate start/end
        var startTime = Math.min.apply(Math, group.map(function (t) { var _a; return ((_a = t.time) === null || _a === void 0 ? void 0 : _a.start) || Date.now(); }));
        var endTime = Math.max.apply(Math, group.map(function (t) { var _a; return ((_a = t.time) === null || _a === void 0 ? void 0 : _a.stop) || Date.now(); }));
        // Determine overall status (Failed if any iteration failed)
        var isAnyFailed = group.some(function (t) { return t.status === 'failed' || t.status === 'broken'; });
        var overallStatus = isAnyFailed ? 'FAILED' : 'PASSED';
        // Build Iterations
        var iterations = group.map(function (test, index) {
            var _a;
            return ({
                name: ((_a = test.name.split('|').pop()) === null || _a === void 0 ? void 0 : _a.trim()) || "Iteration ".concat(index + 1), // Clean name
                log: test.status === 'failed' ? 'Test failed. Check Allure for stack trace.' : 'Test passed successfully',
                status: mapStatus(test.status || 'unknown'),
                parameters: test.parameters ? test.parameters.map(function (p) { return ({ name: "Parameter_" + index, value: p }); }) : []
            });
        });
        return {
            testKey: key,
            start: formatTime(startTime),
            finish: formatTime(endTime),
            status: overallStatus,
            comment: "Auto-generated from Allure. Total scenarios: ".concat(group.length),
            iterations: iterations
        };
    });
    var output = {
        info: {
            project: PROJECT_KEY,
            summary: "Automated Execution - ".concat(new Date().toISOString()),
            testPlanKey: TEST_PLAN_KEY
        },
        tests: xrayTests
    };
    // Write Output
    //fs.writeFileSync(path.resolve(__dirname, OUTPUT_FILE), JSON.stringify(output, null, 2));
    fs.writeFileSync(path.resolve(process.cwd(), 'allure-report', 'data', OUTPUT_FILE), JSON.stringify(output, null, 2));
    console.log("\u2705 Successfully generated ".concat(OUTPUT_FILE, " with ").concat(xrayTests.length, " tests."));
}
catch (error) {
    console.error('❌ Error processing file:', error);
}
