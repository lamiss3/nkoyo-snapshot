import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  buildEmailJourney,
  emailJourneySystemInstruction,
} from "../src/assessment-v2/email-journey.server.ts";
import {
  emailJourneyMarkdown,
  journeyEmailHtml,
  emailDayOffsets,
} from "../src/assessment-v2/email-journey.ts";
import { paragraphWordCount } from "../src/assessment-v2/email-validation.ts";
import { fictionalSession, fictionalOutput } from "../tests/fixtures/email-v3-fictional.mjs";

// Local editorial review only. No environment loading, network request or delivery.
const notice =
  "HISTORICAL MANUAL V3 SAMPLE — invented answers and manually written copy from before the writing-quality revision, retained for comparison. This is not current model-generated output. No AI call, recipient, Kit upload or email send. Structural validation does not establish factual accuracy or copy quality.";
const journey = buildEmailJourney(
  fictionalSession(),
  fictionalOutput,
  "Fictional editorial sample — no AI called",
  "2026-10-16T12:00:00Z",
);
const directory = new URL("../docs/examples/", import.meta.url);
await mkdir(directory, { recursive: true });
const escape = (text) =>
  text.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
await writeFile(
  new URL("snapshot-email-v3-fictional.json", directory),
  JSON.stringify({ notice, journey }, null, 2) + "\n",
);
await writeFile(
  new URL("snapshot-email-v3-fictional.md", directory),
  `# Fictional v3 email sequence\n\n${notice}\n\n${emailJourneyMarkdown(journey)}`,
);
await writeFile(
  new URL("snapshot-email-v3-fictional.html", directory),
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Fictional Snapshot v3 email review</title><style>body{margin:0;background:#fff7fc;color:#17245a;font:17px/1.65 system-ui,sans-serif}main{max-width:760px;margin:40px auto;padding:0 22px}article{margin:28px 0;padding:28px;background:white;border:1px solid #eadce9;border-radius:20px}h1{font-size:30px;line-height:1.25}h2{font-size:21px;line-height:1.35}small,.note{font-size:14px;color:#626782}a{color:#9f147c}.notice{padding:18px;border-left:4px solid #d11aab;background:white}header{padding-bottom:16px;border-bottom:1px solid #eadce9}</style></head><body><main><h1>Five practical Snapshot emails</h1><p class="notice">${escape(notice)}</p>${journey.emails.map((e) => `<article><header><small>Email ${e.number} · ${e.number === 1 ? "Report as soon as prepared" : `Day ${emailDayOffsets[e.number - 1]}`}</small><h1>${escape(e.subject)}</h1><p class="note">${escape(e.preview)}</p></header>${journeyEmailHtml(e, journey.version).replace('<p><a href="{{ unsubscribe_url }}">Unsubscribe</a><br>{{ address }}</p>', '<p class="note">Kit supplies the unsubscribe link and sender address in actual sends. This is a local review sample.</p>')}</article>`).join("")}</main></body></html>`,
);
await writeFile(
  new URL("snapshot-email-v3-system-prompt.md", directory),
  `# Implemented v3 system prompt\n\nGenerated from source for local review. No AI call was made.\n\n\`\`\`text\n${emailJourneySystemInstruction}\n\`\`\`\n`,
);
console.log(
  JSON.stringify({
    directory: fileURLToPath(directory),
    version: journey.version,
    validated: true,
    words: journey.emails.map(paragraphWordCount),
    networkCalls: 0,
    sends: 0,
  }),
);
