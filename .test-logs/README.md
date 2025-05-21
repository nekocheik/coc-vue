# Test Logs

This directory contains the history of test runs and coverage metrics for the project.

## Structure

- `history.json`: Contains a chronological record of test runs with the following information for each commit:
  - `hash`: The commit hash (or "staged" for uncommitted changes)
  - `time`: Timestamp of when the tests were run
  - `coverage`: Coverage metrics including statements, branches, functions, and lines
  - `failingTests`: List of failing tests, if any

## Auditing Test History

To review the test history and identify potential issues:

1. **View the complete history**:
   ```bash
   cat .test-logs/history.json | jq
   ```

2. **Check for coverage drops**:
   ```bash
   node -e "
     const history = require('./.test-logs/history.json');
     const drops = [];
     for (let i = 1; i < history.length; i++) {
       const prev = history[i-1].coverage;
       const curr = history[i].coverage;
       if (curr.statements < prev.statements || 
           curr.branches < prev.branches ||
           curr.functions < prev.functions ||
           curr.lines < prev.lines) {
         drops.push({
           from: history[i-1].hash,
           to: history[i].hash,
           time: history[i].time,
           diff: {
             statements: (curr.statements - prev.statements).toFixed(2),
             branches: (curr.branches - prev.branches).toFixed(2),
             functions: (curr.functions - prev.functions).toFixed(2),
             lines: (curr.lines - prev.lines).toFixed(2)
           }
         });
       }
     }
     console.log(JSON.stringify(drops, null, 2));
   "
   ```

3. **Check for new failing tests**:
   ```bash
   node -e "
     const history = require('./.test-logs/history.json');
     const newFailures = [];
     for (let i = 1; i < history.length; i++) {
       const prev = history[i-1].failingTests || [];
       const curr = history[i].failingTests || [];
       if (curr.length > prev.length) {
         newFailures.push({
           commit: history[i].hash,
           time: history[i].time,
           newFailingTests: curr.filter(test => !prev.includes(test))
         });
       }
     }
     console.log(JSON.stringify(newFailures, null, 2));
   "
   ```

## Enforcement Policy

The pre-commit hook enforces the following rules:

1. All tests must pass
2. Coverage must be at least 80% for all metrics (statements, branches, functions, lines)
3. Test files must be located in `__tests__/` or `helper-test/` directories

If any of these rules are violated, the commit will be blocked.
