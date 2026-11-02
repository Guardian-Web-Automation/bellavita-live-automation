// Posts a one-line regression summary plus the report link to Slack (#bellavita-daily-scrum via
// SLACK_WEBHOOK_URL). Reads Playwright's JSON reporter output.
import { readFileSync, existsSync } from 'node:fs';

const [resultsFile] = process.argv.slice(2);
const { SLACK_WEBHOOK_URL, REPORT_URL, RUN_URL } = process.env;

let text;
if (resultsFile && existsSync(resultsFile)) {
  const { stats } = JSON.parse(readFileSync(resultsFile, 'utf8'));
  const failed = stats.unexpected;
  const icon = failed ? ':x:' : ':white_check_mark:';
  text =
    `${icon} *Bellavita live regression*: ${stats.expected} passed, ${failed} failed, ` +
    `${stats.flaky} flaky, ${stats.skipped} skipped · <${REPORT_URL}|Playwright report>`;
} else {
  text = `:warning: *Bellavita live regression* did not produce results · <${RUN_URL}|Actions run>`;
}

if (!SLACK_WEBHOOK_URL) {
  console.log(`SLACK_WEBHOOK_URL not set; summary would be:\n${text}`);
  process.exit(0);
}
const res = await fetch(SLACK_WEBHOOK_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text }),
});
if (!res.ok) throw new Error(`Slack webhook returned ${res.status}`);
