import type { ReportBlock, SessionReport } from "@/assessment-v2/session-report";

function Blocks({ blocks }: { blocks: ReportBlock[] }) {
  return <div className="space-y-4">{blocks.map((block, index) => {
    if (block.kind === "heading") return <h6 key={index} className="pt-4 text-base font-extrabold">{block.text}</h6>;
    if (block.kind === "paragraph") return <p key={index} className="whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">{block.text}</p>;
    if (block.kind === "quote") return <blockquote key={index} className="whitespace-pre-wrap break-words rounded-r-xl border-l-4 border-magenta bg-blush px-4 py-3 text-sm leading-relaxed">{block.text}</blockquote>;
    if (block.kind === "list") return <ul key={index} className="list-disc space-y-2 pl-5 text-sm leading-relaxed">{block.items.map((item, i) => <li key={i} className="whitespace-pre-wrap break-words">{item}</li>)}</ul>;
    if (block.kind === "details") return <details key={index} className="rounded-xl border border-border p-4"><summary className="cursor-pointer text-sm font-semibold">{block.title}</summary><div className="mt-4"><Blocks blocks={block.blocks} /></div></details>;
    return <div key={index} className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-border">{block.headers.map((label) => <th key={label} className="p-2 align-top">{label}</th>)}</tr></thead><tbody>{block.rows.map((row, i) => <tr key={i} className="border-b border-border/60">{row.map((cell, j) => <td key={j} className="p-2 align-top">{cell}</td>)}</tr>)}</tbody></table></div>;
  })}</div>;
}

/** Render plain text as React nodes; never interpret respondent/model HTML. */
export function AssessmentSessionReport({ report }: { report: SessionReport }) {
  return <article aria-label="Readable assessment report" className="mt-5 space-y-5">
    <h4 className="text-xl font-black">{report.title}</h4>
    {report.sections.map((section) => <section key={section.title} className="rounded-2xl border border-border bg-card p-5 sm:p-7">
      <h5 className="border-b border-border pb-3 text-lg font-black">{section.title}</h5>
      <div className="mt-4"><Blocks blocks={section.blocks} /></div>
    </section>)}
  </article>;
}
