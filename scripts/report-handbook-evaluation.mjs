import { readFile, writeFile } from 'node:fs/promises';
const matrix = JSON.parse(await readFile(new URL('../tests/evaluation/modelops-cases.json', import.meta.url), 'utf8'));
const result = JSON.parse(await readFile(new URL('../test-results/handbook-evaluation.json', import.meta.url), 'utf8'));
const assertions = result.testResults.flatMap((suite) => suite.assertionResults);
const rows = matrix.map((entry) => {
  const matches = assertions.filter((test) => test.title.startsWith(entry.id + ':'));
  if (matches.length !== 1 || matches[0].status !== 'passed') throw new Error('Missing or failed execution: ' + entry.id);
  return { ...entry, observed: 'Assertions passed', duration_ms: matches[0].duration };
});
if (!result.success) throw new Error('Evaluation runner failed');
const report = { generated_at: new Date().toISOString(), scope: 'Local synthetic fixtures and mocked AI provider; no live provider or database validation', cases: rows };
await writeFile(new URL('../test-results/handbook-evaluation-report.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
await writeFile(new URL('../test-results/handbook-evaluation-report.md', import.meta.url),
  '# Handbook evaluation results\n\nGenerated: ' + report.generated_at + '\n\n' + report.scope + '\n\n| Case | Category | Expected | Observed |\n|---|---|---|---|\n' +
  rows.map((row) => '| ' + row.id + ' | ' + row.category + ' | ' + row.expected_behavior + ' | ' + row.observed + ' |').join('\n') + '\n');
console.log('10/10 handbook cases executed and passed. Reports: test-results/handbook-evaluation-report.{md,json}');
