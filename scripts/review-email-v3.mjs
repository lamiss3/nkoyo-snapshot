// LOCAL ONLY. Run without flags to prepare inputs. --generate-once permits one AI request.
// Load credentials through Node --env-file; this script never loads a DB or delivery client.
import { access, mkdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { geminiConfigFromEnv } from "../src/assessment-v2/gemini-client.server.ts";
import { emailJourneyBrief } from "../src/assessment-v2/email-journey.ts";
import { emailJourneySystemInstruction } from "../src/assessment-v2/email-journey.server.ts";
import { validateReviewCases } from "../tests/fixtures/email-v3-review-cases.mjs";
import {
  runIsolatedEmailReview,
  customerReviewHtml,
  isolationNotice,
} from "./lib/email-v3-review.mjs";

const args = process.argv.slice(2);
const live = args.includes("--generate-once");
const directoryIndex = args.indexOf("--output");
if (
  (directoryIndex >= 0 &&
    (!args[directoryIndex + 1] || args[directoryIndex + 1].startsWith("--"))) ||
  args.some(
    (arg, i) =>
      !["--generate-once", "--output"].includes(arg) &&
      !(directoryIndex >= 0 && i === directoryIndex + 1),
  )
)
  throw new Error("Use [--generate-once] [--output directory]");
const output = resolve(
  directoryIndex >= 0 ? args[directoryIndex + 1] : "docs/examples/email-v3-model-review",
);
await mkdir(output, { recursive: true });
try {
  await access(join(output, "generation-attempt.json"));
  throw new Error(
    "An earlier generation attempt is retained here. Use a new output directory for a separately authorized review; existing evidence will not be overwritten.",
  );
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
const save = (file, value) =>
  writeFile(
    join(output, file),
    typeof value === "string" ? value : JSON.stringify(value, null, 2) + "\n",
  );
const cases = validateReviewCases();
await save("fictional-inputs.json", {
  notice: isolationNotice,
  cases: cases.map((c) => ({ ...c, generationBrief: emailJourneyBrief(c.session) })),
});
await save("system-prompt.txt", emailJourneySystemInstruction);
const config = geminiConfigFromEnv("email");
const preflight = {
  mode: live ? "single-development-generation" : "prepare-only-no-generation",
  transport: config.transport,
  model: config.model,
  keyPresent: Boolean(config.apiKey),
  fixtureInputsValidated: cases.length,
  networkAllowlist: "One POST to the configured model endpoint; redirects rejected",
  recorder: "Local memory/files only",
  subscribers: false,
  kit: false,
  jobs: false,
  sends: false,
  productionWrites: false,
};
await save("preflight.json", preflight);
console.log(JSON.stringify(preflight));
if (live) {
  // Exclusive creation prevents accidentally repeating the same paid run on rerun.
  await writeFile(
    join(output, "generation-attempt.json"),
    JSON.stringify({ attemptedAt: new Date().toISOString(), ...preflight }, null, 2),
    { flag: "wx" },
  );
  const review = await runIsolatedEmailReview(config);
  const {
    modelText,
    structuredResponse,
    journey,
    customerText,
    customerHtml,
    request,
    fictionalInput: _input,
    ...summary
  } = review;
  await save("run.json", summary);
  await save("request.json", request);
  if (modelText !== null) await save("model-response.txt", modelText);
  if (structuredResponse !== null) await save("model-response.json", structuredResponse);
  if (journey) {
    await save("validated-journey.json", { notice: isolationNotice, journey });
    await save(
      "customer-emails.txt",
      isolationNotice + "\n\n" + customerText.join("\n\n====================\n\n"),
    );
    await save("customer-emails.html", customerReviewHtml({ ...review, customerHtml }));
  }
  console.log(
    JSON.stringify({
      status: review.status,
      networkRequests: review.networkRequests,
      httpStatus: review.httpStatus,
      paragraphWords: review.paragraphWords,
      error: review.error,
      output,
    }),
  );
  if (!journey) process.exitCode = 1;
}
