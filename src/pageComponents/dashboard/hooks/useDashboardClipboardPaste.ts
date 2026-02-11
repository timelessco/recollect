import { useEffect } from "react";

import { clipboardUpload } from "../../../async/uploads/clipboard-upload";
import { TRASH_URL } from "../../../utils/constants";

type MutationWithMutateAsync = {
	mutateAsync: (params: unknown) => Promise<unknown>;
};

type UseDashboardClipboardPasteParams = {
	CATEGORY_ID: string | number | null;
	addBookmarkMinDataOptimisticMutation: MutationWithMutateAsync;
	fileUploadOptimisticMutation: MutationWithMutateAsync;
};

export function useDashboardClipboardPaste({
	CATEGORY_ID,
	addBookmarkMinDataOptimisticMutation,
	fileUploadOptimisticMutation,
}: UseDashboardClipboardPasteParams) {
	useEffect(() => {
		if (typeof window === "undefined") {
			return undefined;
		}

		const listener = (event: ClipboardEvent) => {
			if (window.location.pathname === `/${TRASH_URL}`) {
				return;
			}

			const target = event.target as HTMLElement;
			const isEditable =
				target.tagName === "INPUT" ||
				target.tagName === "TEXTAREA" ||
				target.closest(".skip-global-paste");

			if (isEditable) {
				return;
			}

			void clipboardUpload(
				event.clipboardData?.getData("text"),
				event.clipboardData?.files,
				CATEGORY_ID,
				addBookmarkMinDataOptimisticMutation as Parameters<
					typeof clipboardUpload
				>[3],
				fileUploadOptimisticMutation as Parameters<typeof clipboardUpload>[4],
			);
		};

		window.addEventListener("paste", listener);
		return () => window.removeEventListener("paste", listener);
	}, [
		CATEGORY_ID,
		addBookmarkMinDataOptimisticMutation,
		fileUploadOptimisticMutation,
	]);
}
