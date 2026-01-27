"use client";

import { useRef, useState } from "react";

import Button from "../../components/atoms/button";
import { Spinner } from "../../components/spinner";
import { InfoIcon } from "../../icons/info-icon";
import { RaindropIcon } from "../../icons/raindrop-icon";
import { useMiscellaneousStore } from "../../store/componentStore";

import { useImportBookmarksMutation } from "@/async/mutationHooks/bookmarks/use-import-bookmarks-mutation";
import { saveButtonClassName } from "@/utils/commonClassNames";
import { handleClientError } from "@/utils/error-utils/client";

export const ImportBookmarks = () => {
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [bookmarkCount, setBookmarkCount] = useState<number | null>(null);
	const [dragActive, setDragActive] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	const setCurrentSettingsPage = useMiscellaneousStore(
		(state) => state.setCurrentSettingsPage,
	);

	const { importBookmarksMutation } = useImportBookmarksMutation();
	const uploading = importBookmarksMutation.isPending
		? true
		: importBookmarksMutation.isSuccess
			? "completed"
			: false;

	const parseCSV = async (file: File) => {
		const Papa = await import("papaparse");

		return await new Promise<Papa.ParseResult<Record<string, string>>>(
			(resolve, reject) => {
				Papa.parse(file, {
					header: true,
					skipEmptyLines: true,
					complete: (results) => {
						if (results.errors.length === 0) {
							resolve(results as Papa.ParseResult<Record<string, string>>);
						} else {
							reject(
								new Error(
									`CSV parsing errors: ${results.errors.map((error) => error.message).join(", ")}`,
								),
							);
						}
					},
					error: (error) => reject(error),
				});
			},
		);
	};

	const handleFile = async (fileToProcess: File) => {
		setSelectedFile(fileToProcess);
		setBookmarkCount(null);
		importBookmarksMutation.reset();

		try {
			const results = await parseCSV(fileToProcess);
			const records = results.data as Array<{
				title: string;
				excerpt: string;
				url: string;
				cover: string;
			}>;
			setBookmarkCount(records.length);
		} catch {
			setBookmarkCount(0);
		}
	};

	const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const chosenFile = event.target.files?.[0];
		if (chosenFile) {
			void handleFile(chosenFile);
		}
	};

	const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
		event.preventDefault();
		setDragActive(false);
		const droppedFile = event.dataTransfer.files?.[0];
		if (
			droppedFile &&
			(droppedFile.type === "text/csv" || droppedFile.name.endsWith(".csv"))
		) {
			void handleFile(droppedFile);
		}
	};

	const handleImport = async () => {
		if (!selectedFile) {
			return;
		}

		try {
			const results = await parseCSV(selectedFile);
			const records = results.data as Array<{
				title: string;
				excerpt: string;
				url: string;
				cover: string;
				folder?: string;
			}>;

			if (!records.length) {
				return;
			}

			const bookmarks = records.map((bookmark) => ({
				title: bookmark.title || null,
				description: bookmark.excerpt || null,
				url: bookmark.url,
				ogImage: bookmark.cover || null,
				category_name: bookmark.folder || null,
			}));

			await importBookmarksMutation.mutateAsync({ bookmarks });
		} catch (error) {
			if (
				error instanceof Error &&
				error.message.includes("CSV parsing errors")
			) {
				handleClientError(error, "Error parsing CSV file");
			}
		}
	};

	const isFileUploaded = selectedFile && bookmarkCount !== null;

	return (
		<>
			<h2 className="mb-6 text-lg leading-[115%] font-semibold tracking-normal text-gray-900">
				Import
			</h2>
			<p className="mb-2 align-middle text-sm leading-[115%] tracking-[0.02em] text-gray-800">
				Import from Raindrop
			</p>

			<div
				className={`relative flex flex-col items-center justify-center rounded-lg bg-gray-100 py-[75px] transition-colors ${
					!isFileUploaded ? `${dragActive ? "bg-gray-200" : ""}` : ""
				}`}
				onDrop={!isFileUploaded ? handleDrop : undefined}
				onDragOver={
					!isFileUploaded
						? (event) => {
								event.preventDefault();
								setDragActive(true);
							}
						: undefined
				}
				onDragLeave={!isFileUploaded ? () => setDragActive(false) : undefined}
			>
				<RaindropIcon className="mb-1.5 w-8" />
				<p className="mb-1.5 align-middle text-sm leading-[115%] font-normal tracking-normal text-gray-800">
					{isFileUploaded
						? uploading === "completed"
							? "Successfully imported bookmarks"
							: `Found ${bookmarkCount} Bookmarks`
						: "Drop the CSV file here or"}
				</p>
				<Button
					className={`relative py-[4.5px] ${saveButtonClassName} rounded-[5px] ${uploading === "completed" ? "bg-gray-600 hover:bg-gray-600" : ""}`}
					isDisabled={
						isFileUploaded
							? uploading === "completed" ||
								uploading === true ||
								bookmarkCount === 0
							: false
					}
					onClick={
						isFileUploaded
							? handleImport
							: () => {
									inputRef.current?.click();
								}
					}
				>
					<span className="inline-flex min-h-[15px] items-center justify-center">
						{isFileUploaded ? (
							uploading === true ? (
								<Spinner className="mx-12.5 h-3 w-3" />
							) : uploading === "completed" ? (
								"Imported"
							) : (
								"Import Bookmarks"
							)
						) : (
							"Choose File"
						)}
					</span>
				</Button>
				<input
					ref={inputRef}
					type="file"
					accept=".csv"
					className="hidden"
					onChange={handleFileChange}
				/>
			</div>

			<div
				className={`mt-2 flex text-13 leading-[150%] tracking-normal text-gray-600 ${
					!isFileUploaded ? "flex-wrap" : ""
				}`}
			>
				<span className={`mr-2 shrink-0 ${!isFileUploaded ? "py-0.5" : ""}`}>
					<InfoIcon className="h-4.5 w-4.5 text-gray-600" />
				</span>
				<span
					className={`${!isFileUploaded ? "flex items-center justify-center" : ""}`}
				>
					{!isFileUploaded ? (
						<>
							<span>Export a CSV from</span>
							<a
								className="ml-1 underline"
								href="https://app.raindrop.io/settings/backups"
								rel="noopener noreferrer"
								target="_blank"
							>
								Raindrop
							</a>
						</>
					) : (
						<>
							<span>Please add your own AI</span>
							<button
								className="ml-1 underline"
								onClick={() => setCurrentSettingsPage("ai-features")}
								type="button"
							>
								API key
							</button>
							<span className="ml-1">
								as the free account only adds AI optimisation for the first 1000
								bookmarks
							</span>
						</>
					)}
				</span>
			</div>
		</>
	);
};
