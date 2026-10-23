export type LessonPatch = (body: Record<string, unknown>) => Promise<boolean | undefined>;
