import {
  BookOpen, Brain, BriefcaseBusiness, Calculator, Camera, ChartNoAxesColumnIncreasing,
  Code2, FlaskConical, Globe2, Landmark, Languages, Lightbulb, Mic2, Newspaper,
  Palette, PenLine, Radio, Search, Sparkles, Video,
} from "lucide-react";
import type { Subject } from "@/lib/planner-types";
import { inferSubjectIcon } from "@/lib/subject-icons";
import { cn } from "@/lib/utils";

const icons = {
  book: BookOpen, sparkles: Sparkles, chart: ChartNoAxesColumnIncreasing, film: Video,
  radio: Radio, newspaper: Newspaper, globe: Globe2, brain: Brain,
  calculator: Calculator, flask: FlaskConical, code: Code2, palette: Palette,
  languages: Languages, landmark: Landmark, briefcase: BriefcaseBusiness, camera: Camera,
  microphone: Mic2, pen: PenLine, search: Search, lightbulb: Lightbulb,
};

export function SubjectIcon({ subject, className }: { subject: Pick<Subject, "title" | "shortTitle" | "icon">; className?: string }) {
  const key = subject.icon ?? inferSubjectIcon(subject.title);
  if (key === "letter") return <span className={cn("font-semibold", className)}>{(subject.shortTitle || subject.title).trim().slice(0, 1).toUpperCase()}</span>;
  const Icon = icons[key] ?? BookOpen;
  return <Icon className={cn("size-5", className)} />;
}

export const subjectIconOptions = Object.keys(icons) as Array<keyof typeof icons>;
