"use client";

import { useRef, useState } from "react";
import axios from "axios";
import { parse } from "papaparse";

import Button from "../../components/atoms/button";
import {
	getBaseUrl,
	NEXT_API_URL,
	RAINDROP_IMPORT_API,
} from "../../utils/constants";

export const ImportBookmarks = () => {
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [uploading, setUploading] = useState(false);
	const [imported, setImported] = useState(false);
	const [statusMessage, setStatusMessage] = useState("");
	const [bookmarkCount, setBookmarkCount] = useState<number | null>(null);
	const [progress, setProgress] = useState(0);
	const [dragActive, setDragActive] = useState(false);
	const [importLimit, setImportLimit] = useState(50); // Default 50 bookmarks
	const inputRef = useRef<HTMLInputElement>(null);

	const handleFile = (fileToProcess: File) => {
		setSelectedFile(fileToProcess);
		setBookmarkCount(null);
		setStatusMessage("");
		setProgress(0);
		setImported(false);

		parse(fileToProcess, {
			header: true,
			skipEmptyLines: true,
			complete: (results) => {
				const records = results.data as Array<{
					title: string;
					excerpt: string;
					url: string;
					cover: string;
				}>;
				setBookmarkCount(records.length);
				setStatusMessage(
					records.length
						? `Found ${records.length} bookmarks, ready to import.`
						: "No valid bookmarks found in CSV.",
				);
				// Auto-adjust slider max
				setImportLimit(Math.min(50, records.length));
			},
			error: (err) => {
				console.error(err);
				setStatusMessage("Error parsing CSV file.");
			},
		});
	};

	const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const chosenFile = event.target.files?.[0];
		if (chosenFile) {
			handleFile(chosenFile);
		}
	};

	const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
		event.preventDefault();
		setDragActive(false);
		const droppedFile = event.dataTransfer.files?.[0];
		if (droppedFile) {
			handleFile(droppedFile);
		}
	};

	const handleImport = async () => {
		if (!selectedFile) {
			setStatusMessage("Please select a file first.");
			return;
		}

		setUploading(true);
		setStatusMessage("Importing bookmarks...");
		setProgress(0);

		parse(selectedFile, {
			header: true,
			skipEmptyLines: true,
			complete: async (results) => {
				let records = results.data as Array<{
					title: string;
					excerpt: string;
					url: string;
					cover: string;
					folder?: string;
				}>;

				if (!records.length) {
					setStatusMessage("No data found in CSV.");
					setUploading(false);
					return;
				}

				// Apply import limit
				records = records.slice(0, importLimit);

				const bookmarks = records.map((b) => ({
					title: b.title || null,
					description: b.excerpt || null,
					url: b.url || null,
					ogImage: b.cover || null,
					folder: b.folder || null,
				}));

				try {
					const response = await axios.post(
						`${getBaseUrl()}${NEXT_API_URL}${RAINDROP_IMPORT_API}`,
						{ bookmarks },
						{
							headers: { "Content-Type": "application/json" },
							onUploadProgress: (progressEvent) => {
								if (progressEvent.total) {
									const percentage = Math.round(
										(progressEvent.loaded * 100) / progressEvent.total,
									);
									setProgress(percentage);
								}
							},
						},
					);

					if (response.status !== 200) {
						throw new Error("Error importing bookmarks.");
					}

					setProgress(100);
					setImported(true);
					setStatusMessage(
						`Import completed successfully! Imported ${records.length} bookmarks.`,
					);
				} catch (error) {
					console.error(error);
					setStatusMessage("Error importing bookmarks.");
				} finally {
					setUploading(false);
				}
			},
		});
	};

	return (
		<div className="mx-auto mt-10 max-w-md rounded-2xl border bg-white p-6 shadow-sm">
			<h2 className="mb-4 text-lg font-semibold text-gray-900">
				Import Bookmarks
			</h2>

			{/* File Upload Box */}
			<div
				className={`relative mb-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 transition-colors ${
					dragActive ? "border-black bg-gray-100" : "border-gray-300"
				}`}
				onDrop={handleDrop}
				onDragOver={(e) => {
					e.preventDefault();
					setDragActive(true);
				}}
				onDragLeave={() => setDragActive(false)}
				onClick={() => inputRef.current?.click()}
				role="button"
				tabIndex={0}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						inputRef.current?.click();
					}
				}}
			>
				{selectedFile ? (
					<div className="flex flex-col items-center">
						<p className="text-sm font-medium text-gray-800">
							{selectedFile.name}
						</p>
						<p className="mt-1 text-xs text-gray-500">
							{bookmarkCount
								? `Found ${bookmarkCount} bookmarks`
								: "File selected"}
						</p>
					</div>
				) : (
					<p className="text-sm text-gray-600">
						Drag and drop your CSV here or{" "}
						<span className="font-semibold text-black underline">
							click to browse
						</span>
					</p>
				)}
				<input
					ref={inputRef}
					type="file"
					accept=".csv"
					className="hidden"
					onChange={handleFileChange}
				/>
			</div>

			{/* Slider for limit */}
			{bookmarkCount && bookmarkCount > 0 && (
				<div className="mb-4">
					<label className="mb-1 block text-sm font-medium text-gray-700">
						Number of bookmarks to import:{" "}
						<span className="font-semibold text-black">{importLimit}</span>
					</label>
					<input
						type="range"
						min={1}
						max={bookmarkCount}
						value={importLimit}
						onChange={(e) => setImportLimit(Number(e.target.value))}
						className="w-full cursor-pointer accent-black"
					/>
					<p className="mt-1 text-xs text-gray-500">
						You can import up to {bookmarkCount} bookmarks.
					</p>
				</div>
			)}

			{/* Import Button */}
			<div className="relative w-full overflow-hidden rounded-md">
				<Button
					className={`relative flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-md px-4 py-2 font-medium text-white transition-all duration-300 ${
						imported
							? "cursor-not-allowed bg-green-700"
							: uploading
								? "cursor-wait bg-black"
								: "bg-black hover:bg-black"
					}`}
					isDisabled={uploading || imported || !bookmarkCount}
					onClick={handleImport}
				>
					{uploading && (
						<div
							className="absolute top-0 left-0 h-full bg-gray-400 transition-all duration-300 ease-linear"
							style={{
								width: `${progress}%`,
								opacity: 0.5,
								pointerEvents: "none",
							}}
						/>
					)}
					<span className="relative z-10 text-center">
						{imported
							? "Imported Successfully!"
							: uploading
								? "Importing..."
								: "Import CSV"}
					</span>
				</Button>
			</div>

			{/* Status message */}
			{statusMessage && (
				<p className="mt-3 text-center text-sm text-gray-600">
					{statusMessage}
				</p>
			)}
		</div>
	);
};
