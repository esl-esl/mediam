import type { SubjectIconKey } from "./planner-types";

export const subjectIconKeys: SubjectIconKey[] = [
  "book", "sparkles", "chart", "film", "radio", "newspaper", "globe",
  "brain", "calculator", "flask", "code", "palette", "languages",
  "landmark", "briefcase", "camera", "microphone", "pen", "search",
  "lightbulb", "letter",
];

const keywordIcons: Array<[RegExp, SubjectIconKey]> = [
  [/искусствен|нейро|\bии\b/i, "sparkles"],
  [/аналит|данн|статист/i, "chart"],
  [/кино|видео|аудиовиз/i, "film"],
  [/радио|аудио|подкаст/i, "radio"],
  [/журнал|новост|медиа|редакц/i, "newspaper"],
  [/международ|глобал|географ/i, "globe"],
  [/психолог|когнитив/i, "brain"],
  [/математ|экономет|финанс/i, "calculator"],
  [/исслед|методолог|науч/i, "search"],
  [/программ|код|цифров/i, "code"],
  [/дизайн|искусств|визуал/i, "palette"],
  [/англий|язык|лингв/i, "languages"],
  [/право|истор|полит/i, "landmark"],
  [/менедж|бизнес|управлен/i, "briefcase"],
  [/фото|камер/i, "camera"],
  [/коммуникац|речь|интервью/i, "microphone"],
  [/письм|литератур|сценар/i, "pen"],
  [/маркет|креатив|иде/i, "lightbulb"],
];

export function inferSubjectIcon(title: string): SubjectIconKey {
  return keywordIcons.find(([pattern]) => pattern.test(title))?.[1] ?? "book";
}
