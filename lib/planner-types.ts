export type TaskStatus = "todo" | "doing" | "done";
export type Priority = "high" | "medium" | "low";
export type SubjectStatus = "required" | "elective" | "magolego";
export type ThemeMode = "light" | "dark" | "system";
export type LessonKind = "lecture" | "seminar" | "nis" | "control" | "exam" | "workshop";
export type AssessmentFormat = "none" | "numeric" | "plusminus" | "text";
export type SubjectIconKey =
  | "book" | "sparkles" | "chart" | "film" | "radio" | "newspaper"
  | "globe" | "brain" | "calculator" | "flask" | "code" | "palette"
  | "languages" | "landmark" | "briefcase" | "camera" | "microphone"
  | "pen" | "search" | "lightbulb" | "letter";

export interface Profile {
  name: string;
  program: string;
  year: number;
  module?: number;
  academicYear: string;
  weeklyGoal?: number;
  semesterStart: string;
  semesterEnd: string;
  theme: ThemeMode;
}

export interface AssessmentPart {
  id: string;
  title: string;
  weight: number;
  score: number | null;
  maxScore: number;
  dueDate?: string;
}

export interface Subject {
  id: string;
  title: string;
  shortTitle: string;
  icon?: SubjectIconKey;
  emoji?: string;
  color: string;
  pattern: "grid" | "waves" | "dots" | "blocks" | "lines" | "orbit";
  module: number;
  modules?: number[];
  year: number;
  credits: number;
  status: SubjectStatus;
  language: "RU" | "EN";
  scheduleLabel: string;
  room: string;
  description: string;
  objectives?: string[];
  sourceUrl?: string;
  targetGrade?: number;
  roundingRule: "math" | "hse07" | "none";
  pinned: boolean;
  finalGrade?: number | null;
}

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface StudyTask {
  id: string;
  subjectId: string | null;
  title: string;
  type: "lecture" | "seminar" | "homework" | "exam" | "project" | "reading" | "other";
  dueDate: string;
  plannedDate?: string;
  status: TaskStatus;
  priority: Priority;
  estimatedMinutes: number;
  notes: string;
  subtasks: Subtask[];
  createdAt: string;
}

export interface GradeComponent extends AssessmentPart {
  subjectId: string;
  calculation?: "single" | "lesson_average";
  lessonKind?: LessonKind;
  scoreFormat?: AssessmentFormat;
  scoreText?: string;
  minScore?: number;
}

export interface CourseTopic {
  id: string;
  subjectId: string;
  title: string;
  notes: string;
}

export interface CourseLesson {
  id: string;
  subjectId: string;
  number: number;
  kind: LessonKind;
  title?: string;
  topic?: string;
  topicIds: string[];
  date?: string;
  deadline?: string;
  grade?: number | null;
  assessmentFormat: AssessmentFormat;
  assessmentValue: string;
  assessmentMin?: number;
  assessmentMax?: number;
  notes: string;
}

export interface Note {
  id: string;
  subjectId: string | null;
  title: string;
  body: string;
  format?: "text" | "link";
  url?: string;
  lessonIds?: string[];
  topicIds?: string[];
  kind: "lecture" | "seminar" | "idea" | "summary";
  tags: string[];
  updatedAt: string;
}

export interface ScheduleEvent {
  id: string;
  subjectId: string;
  weekday: number;
  start: string;
  end: string;
  location: string;
  format: "lecture" | "seminar" | "online";
  parity: "every" | "odd" | "even";
}

export interface Material {
  id: string;
  subjectId: string | null;
  name: string;
  label: string;
  kind: "file" | "link" | "textbook" | "recording" | "presentation" | "gradebook";
  storage: "upload" | "link";
  scope?: "general" | "subject" | "topic" | "lesson" | "coursework" | "thesis";
  lessonId?: string | null;
  topicId?: string | null;
  lessonIds?: string[];
  topicIds?: string[];
  mimeType?: string;
  size?: number;
  url?: string;
  createdAt: string;
}

export interface ThesisChapter {
  id: string;
  title: string;
  progress: number;
  status: TaskStatus;
  deadline: string;
}

export interface ThesisMilestone {
  id: string;
  title: string;
  deadline: string;
  done: boolean;
  note: string;
}

export interface ThesisBlock {
  id: string;
  title: string;
  content: string;
}

export interface ThesisState {
  title: string;
  blocks: ThesisBlock[];
  supervisor?: string;
  stage?: string;
  progress?: number;
  targetWords?: number;
  currentWords?: number;
  nextMeeting?: string;
  researchQuestion?: string;
  chapters?: ThesisChapter[];
  milestones?: ThesisMilestone[];
}

export interface Activity {
  id: string;
  title: string;
  category: "magolego" | "internship" | "career" | "club" | "event";
  status: TaskStatus;
  date: string;
  deadline?: string;
  link?: string;
  progress?: number;
  notes: string;
}

export interface StudySession {
  id: string;
  subjectId: string | null;
  date: string;
  minutes: number;
  focusScore: number;
}

export interface PlannerState {
  profile: Profile;
  subjects: Subject[];
  tasks: StudyTask[];
  grades: GradeComponent[];
  topics: CourseTopic[];
  lessons: CourseLesson[];
  notes: Note[];
  schedule: ScheduleEvent[];
  materials: Material[];
  coursework: ThesisState;
  thesis: ThesisState;
  activities: Activity[];
  sessions: StudySession[];
}
