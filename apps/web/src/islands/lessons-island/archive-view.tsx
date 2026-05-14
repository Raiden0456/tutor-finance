import { useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  ResponsiveModal,
  ResponsiveModalBody,
  ResponsiveModalContent,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-modal';
import { LessonCard } from '@/components/lesson-card';
import type { Lesson } from '@/lib/types';

export function ArchiveView({
  lessons,
  studentMap,
  loading,
  onRefresh,
}: {
  lessons: Lesson[];
  studentMap: Map<string, string>;
  loading: boolean;
  onRefresh: () => void;
}) {
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);

  async function handleDeleteAll() {
    setDeletingAll(true);
    try {
      await api.delete('/lessons/archive');
      setDeleteAllOpen(false);
      onRefresh();
    } finally {
      setDeletingAll(false);
    }
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center justify-between gap-2 px-0.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">Archive</span>
          {lessons.length > 0 && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {lessons.length}
            </span>
          )}
          {loading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
        </div>
        {lessons.length > 0 && (
          <button
            onClick={() => setDeleteAllOpen(true)}
            className="flex items-center gap-1.5 text-xs text-destructive transition-opacity hover:opacity-70 active:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete all
          </button>
        )}
      </div>

      {!loading && lessons.length === 0 ? (
        <div className="flex items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 px-6 py-10 text-sm text-muted-foreground">
          No archived lessons
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {lessons.map((l) => (
            <LessonCard
              key={l.id}
              lesson={l}
              studentName={studentMap.get(l.studentId) ?? l.studentId}
              isArchived
              onDeleted={onRefresh}
            />
          ))}
        </div>
      )}

      <ResponsiveModal open={deleteAllOpen} onOpenChange={setDeleteAllOpen}>
        <ResponsiveModalContent className="max-w-sm">
          <ResponsiveModalHeader>
            <ResponsiveModalTitle>Delete all archived?</ResponsiveModalTitle>
          </ResponsiveModalHeader>
          <ResponsiveModalBody>
            <p className="text-sm text-muted-foreground">
              This permanently deletes all {lessons.length} archived lesson
              {lessons.length !== 1 ? 's' : ''}. This action cannot be undone.
            </p>
          </ResponsiveModalBody>
          <ResponsiveModalFooter>
            <Button variant="outline" onClick={() => setDeleteAllOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleDeleteAll}
              disabled={deletingAll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete all
            </Button>
          </ResponsiveModalFooter>
        </ResponsiveModalContent>
      </ResponsiveModal>
    </div>
  );
}
