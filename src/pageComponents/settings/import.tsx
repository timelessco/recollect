/* eslint-disable @typescript-eslint/no-misused-promises */

"use client";

import { useState } from "react";
import axios from "axios";
import { parse } from "papaparse";

import Button from "../../components/atoms/button";

export const ImportBookmarks = () => {
	const [file, setFile] = useState<File | null>(null);
	const [uploading, setUploading] = useState(false);
	const [message, setMessage] = useState("");

	const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const targetFile = event.target.files?.[0];
		if (targetFile) setFile(targetFile);
	};

	const handleImport = async () => {
		if (!file) {
			setMessage("Please select a file first.");
			return;
		}

		setUploading(true);
		setMessage("");

		parse(file, {
			header: true,
			skipEmptyLines: true,
			complete: async (results) => {
				const records = results.data as Array<{
					cover: string;
					excerpt: string;
					title: string;
					url: string;
				}>;
				if (!records.length) {
					setMessage("No data found in CSV.");
					setUploading(false);
					return;
				}

				const rows = records.map((bookmark) => ({
					title: bookmark.title || null,
					description: bookmark.excerpt || null,
					url: bookmark.url || null,
					ogImage: bookmark.cover || null,
				}));

				try {
					const chunkSize = 100;
					for (let index = 0; index < rows.length; index += chunkSize) {
						const chunk = rows.slice(index, index + chunkSize);
						const response = await axios.post("/api/v1/import-raindrop", {
							bookmarks: chunk,
						});

						if (response.status !== 200) {
							throw new Error("Error importing bookmarks.");
						}
					}

					setMessage("Import completed successfully!");
				} catch (error) {
					console.error(error);
					setMessage("Error importing bookmarks.");
				} finally {
					setUploading(false);
				}
			},
			error: (error) => {
				console.error(error);
				setUploading(false);
				setMessage("Error parsing CSV file.");
			},
		});
	};

	return (
		<div className="mx-auto mt-10 max-w-md rounded-xl border bg-white p-6 shadow-sm">
			<h2 className="mb-4 text-lg font-semibold">Import Bookmarks</h2>
			<input
				accept=".csv"
				className="mb-4 block w-full rounded-md border p-2"
				onChange={handleFileChange}
				type="file"
			/>
			<Button
				className={`w-full rounded-md px-4 py-2 text-white ${
					uploading ? "bg-gray-400" : "bg-black hover:bg-gray-800"
				}`}
				isDisabled={uploading}
				onClick={handleImport}
			>
				{uploading ? "Importing..." : "Import CSV"}
			</Button>
			{message && (
				<p
					className={`mt-4 text-sm ${
						message.includes("Error") ? "text-red-600" : "text-green-600"
					}`}
				>
					{message}
				</p>
			)}
		</div>
	);
};
