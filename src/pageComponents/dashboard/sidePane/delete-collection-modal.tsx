import useFetchBookmarksCount from "../../../async/queryHooks/bookmarks/useFetchBookmarksCount";
import { useDeleteCollection } from "../../../hooks/useDeleteCollection";

import { Dialog } from "@/components/ui/recollect/dialog";

type DeleteCollectionModalProps = {
	deleteConfirmation: {
		categoryId: number | null;
		isCurrent: boolean;
		isOpen: boolean;
	};
	onClose: () => void;
};

export function DeleteCollectionModal({
	deleteConfirmation,
	onClose,
}: DeleteCollectionModalProps) {
	const { bookmarksCountData } = useFetchBookmarksCount();
	const { onDeleteCollection } = useDeleteCollection();

	const bookmarkCount =
		bookmarksCountData?.data?.categoryCount?.find(
			(item) => item?.category_id === deleteConfirmation.categoryId,
		)?.count ?? 0;

	const handleConfirm = async () => {
		if (deleteConfirmation.categoryId === null) {
			onClose();
			return;
		}

		try {
			await onDeleteCollection(
				deleteConfirmation.isCurrent,
				deleteConfirmation.categoryId,
			);
			onClose();
		} catch {
			// Modal stays open on error; mutation hook handles error toast
		}
	};

	return (
		<Dialog.Root
			open={deleteConfirmation.isOpen}
			onOpenChange={(isOpen) => {
				if (!isOpen) {
					onClose();
				}
			}}
		>
			<Dialog.Portal>
				<Dialog.Backdrop />
				<Dialog.Popup className="w-[448px] rounded-xl p-6">
					<Dialog.Title>Delete Collection</Dialog.Title>
					{bookmarkCount > 0 && (
						<Dialog.Description>
							You have {bookmarkCount} bookmarks in this collection.
						</Dialog.Description>
					)}
					<div className="mt-4 flex justify-end gap-3">
						<button
							className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
							onClick={onClose}
							type="button"
						>
							Cancel
						</button>
						<button
							className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
							onClick={() => {
								void handleConfirm();
							}}
							type="button"
						>
							Delete
						</button>
					</div>
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
