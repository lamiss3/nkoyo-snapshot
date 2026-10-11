# Choice-led Snapshot

New assessments use `adaptive-v2`. Saved `adaptive-v1` assessments can still finish in their existing flow. Restart begins the new flow. Completed reports and email journeys remain readable.

## Phase 1 — Opening picture (up to 7 short screens)

The former first question is split into three screens: decisions/authority/relationships/values; demand/workload/key-person dependence/funding; strategy/technology/requirements/other. The former second question is split into two screens: decisions and coordination under pressure; work and priorities under pressure. Each of these five screens offers four substantive choices plus a neutral choice. For pressure responses, “It varies” is grouped with None/unsure because it supplies no clear pattern. Respondents may choose up to two per screen; None/unsure must be chosen alone. Selecting Other does not open a text box. Earlier saved seven-screen opening layouts remain readable and can finish; Restart begins the shorter flow.

A consequence screen offers three relevant consequences matched to earlier choices plus None/no clear impact/unsure. The former first written question becomes a fixed scenario-choice question: two or three observable examples from the 20-topic bank, ranked from the earlier selections, plus None/unsure. These routing weights select examples only; they do not set Jev scores. Returning to change an earlier choice updates dependent questions and clears a scenario answer if its available options have changed.

Jev then evaluates all 20 topics. Existing evidence categories, probabilities, candidate ranking and tie rules are retained.

## Phase 2 — Check the likely issues (up to 4 probes)

The same four topic-specific fixed probes are used, including their existing answer choices. Jev evaluates all 20 topics again. The unchanged rules select up to two finalists. An assessment may finish early when there is no relevant finding or only one candidate remains, as before.

## Phase 3 — Scenarios and optional detail (up to 3 screens)

1. Gemini receives all opening and probe answers plus both finalists. It writes a question with two or three hypothetical situations distinguishing whether the issues connect, appear separately or whether one fits better. The website adds None/unsure. Jev reassesses both finalists after the selection.
2. Gemini receives the accumulated answers, including that scenario selection, and writes a second, distinct scenario question to clarify the explanations and impact. The website again adds None/unsure. Gemini never selects the finalists or assigns scores.
3. The final example-and-impact question remains written, with the same second-finalist focus. It is predefined and optional. A Skip button records a skipped answer and calculates the result without any new written evidence. No additional Gemini call is needed for this prompt.

If Gemini fails or returns invalid scenario JSON, predefined scenario choices keep the journey moving. They are clearly labelled fixed backup questions. A failure never replaces these screens with a required text box.

The longest new flow has 14 short screens, with only the last offering a text box. Progress and report numbering use the stored opening layout, so older 16-screen sessions still display correctly.

Within a phase, Next saves on the device and moves immediately while the server checkpoint runs in the background. The complete confirmed answers are still submitted at the phase boundary before model evaluation. A saving failure is shown and retried; it does not erase local answers.

## Interpretation, logs and emails

A scenario match is a self-reported similarity to a hypothetical situation, not proof that the described event happened. Jev receives this distinction with the selected option text. None/unsure and a skipped final answer provide no extra evidence; they do not confirm an issue or prove it absent. The usual final evidence, impact and urgency signals and priority formula are retained.

Admin reports show the displayed options, selected answers, hypothetical-match labels, model inputs/outputs and explicit skips across the three phases. Detailed reports and personalized emails may refer to the chosen example as a match, but must not present its imagined event as the respondent’s real story. Consent and email scheduling remain unchanged.

Regression coverage includes legacy sessions, choice limits, answer-dependent fixed scenarios, the two Gemini calls and accumulated context, invalid-output backups, optional skips, Jev input semantics, unchanged score calculations, full reports and email evidence.
