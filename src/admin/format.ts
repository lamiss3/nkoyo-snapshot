import { dimensions, questions } from "@/config/questions";
import { questionPatterns } from "@/config/results";
import { problemById } from "@/assessment-v2/problem-bank";
import type { ProblemId } from "@/assessment-v2/types";

export const displayDate = (value: string | null) =>
  value ? new Date(value).toLocaleString() : "Not recorded";
export function patternLabel(key: string) {
  if (key in problemById) return problemById[key as ProblemId].name;
  const [dimensionId, tail] = key.split(":");
  const dimension = dimensions.find((item) => item.id === dimensionId)?.name ?? dimensionId;
  const question = questions.find((item) => item.id === tail);
  return `${dimension} — ${question ? (questionPatterns[question.id]?.headline ?? tail) : tail}`;
}
export function downloadFile(filename: string, content: string, type = "text/csv;charset=utf-8;") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
