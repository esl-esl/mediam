import { PlannerApp } from "@/components/planner/planner-app";

export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  return <PlannerApp initialRoute={[section]} />;
}
