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
  handleDeleteAll: () => Promise<void>;
  handleKeepBookmarks: () => Promise<void>;
  pendingMode: PendingMode;
} {
  const { onDeleteCollection } = useDeleteCollection();
  const [pendingMode, setPendingMode] = useState<PendingMode>(null);

  const handleDeleteAll = useCallback(async () => {
    setPendingMode("delete-all");
    try {
      await onDeleteCollection({
        categoryId,
        current: isCurrent,
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
        categoryId,
        current: isCurrent,
        keepBookmarks: true,
      });
    } finally {
      setPendingMode(null);
    }
  }, [isCurrent, categoryId, onDeleteCollection]);

  return { handleDeleteAll, handleKeepBookmarks, pendingMode };
}
