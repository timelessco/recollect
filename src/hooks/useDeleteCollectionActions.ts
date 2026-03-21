import { useCallback, useState } from "react";

import { useDeleteCollection } from "./useDeleteCollection";

type PendingMode = "delete-all" | "keep-bookmarks" | null;

interface UseDeleteCollectionActionsProps {
  categoryId: number;
  isCurrent: boolean;
}

export function useDeleteCollectionActions({
  categoryId,
  isCurrent,
}: UseDeleteCollectionActionsProps): {
  pendingMode: PendingMode;
  handleDeleteAll: () => Promise<void>;
  handleKeepBookmarks: () => Promise<void>;
} {
  const { onDeleteCollection } = useDeleteCollection();
  const [pendingMode, setPendingMode] = useState<PendingMode>(null);

  const handleDeleteAll = useCallback(async () => {
    setPendingMode("delete-all");
    try {
      await onDeleteCollection({
        current: isCurrent,
        categoryId,
        keepBookmarks: false,
      });
    } finally {
      setPendingMode(null);
    }
  }, [isCurrent, categoryId, onDeleteCollection]);

  const handleKeepBookmarks = useCallback(async () => {
    setPendingMode("keep-bookmarks");
    try {
      await onDeleteCollection({
        current: isCurrent,
        categoryId,
        keepBookmarks: true,
      });
    } finally {
      setPendingMode(null);
    }
  }, [isCurrent, categoryId, onDeleteCollection]);

  return { pendingMode, handleDeleteAll, handleKeepBookmarks };
}
