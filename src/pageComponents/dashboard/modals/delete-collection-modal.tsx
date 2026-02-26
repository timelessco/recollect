import { type ReactNode } from "react";

import useFetchBookmarksCount from "../../../async/queryHooks/bookmarks/useFetchBookmarksCount";
import { useDeleteCollection } from "../../../hooks/useDeleteCollection";

import { Dialog } from "@/components/ui/recollect/dialog";

type DeleteCollectionModalProps = {
	categoryId: number;
	children: ReactNode;
	isCurrent: boolean;
};

export function DeleteCollectionModal({
	categoryId,
	children,
	isCurrent,
}: DeleteCollectionModalProps) {
	return (
		<Dialog.Root>
			<Dialog.Trigger className="w-full text-left">{children}</Dialog.Trigger>
			<Dialog.Portal>
				<Dialog.Backdrop />
				<Dialog.Popup className="w-[448px] rounded-xl p-6">
					<Dialog.Title>Delete Collection</Dialog.Title>
					<DeleteCollectionDescription categoryId={categoryId} />
					<div className="mt-4 flex justify-end gap-3">
						<Dialog.Close className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">
							Cancel
						</Dialog.Close>
						<DeleteCollectionConfirmButton
							categoryId={categoryId}
							isCurrent={isCurrent}
						/>
					</div>
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	);
}

function DeleteCollectionDescription({ categoryId }: { categoryId: number }) {
	const { bookmarksCountData } = useFetchBookmarksCount();
	const bookmarkCount =
		bookmarksCountData?.data?.categoryCount?.find(
			(item) => item?.category_id === categoryId,
		)?.count ?? 0;

	if (bookmarkCount <= 0) {
		return null;
	}

	return (
		<Dialog.Description>
			You have {bookmarkCount} bookmarks in this collection.
		</Dialog.Description>
	);
}

function DeleteCollectionConfirmButton({
	categoryId,
	isCurrent,
}: {
	categoryId: number;
	isCurrent: boolean;
}) {
	const { onDeleteCollection } = useDeleteCollection();

	const handleConfirm = async () => {
		await onDeleteCollection(isCurrent, categoryId);
	};

	return (
		<button
			className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
			onClick={() => {
				void handleConfirm();
			}}
			type="button"
		>
			Delete
		</button>
	);
}
