import { PlannerApp } from "@/components/planner/planner-app";

export default async function SubjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PlannerApp initialRoute={["subjects", id]} />;
}
