import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const plannerStates = sqliteTable("planner_states", {
  userId: text("user_id").primaryKey(),
  payload: text("payload").notNull(),
  revision: integer("revision").notNull().default(1),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const materials = sqliteTable(
  "materials",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    subjectId: text("subject_id"),
    lessonId: text("lesson_id"),
    topicId: text("topic_id"),
    lessonIds: text("lesson_ids"),
    topicIds: text("topic_ids"),
    scope: text("scope").notNull().default("subject"),
    name: text("name").notNull(),
    label: text("label").notNull().default("Материал"),
    kind: text("kind").notNull().default("file"),
    mimeType: text("mime_type").notNull(),
    size: integer("size").notNull(),
    r2Key: text("r2_key").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_materials_user_subject").on(table.userId, table.subjectId),
    index("idx_materials_user_created").on(table.userId, table.createdAt),
  ],
);
