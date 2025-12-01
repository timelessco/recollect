export const highlightSearch = (
	text: string,
	search: string,
): Array<string | React.ReactNode> => {
	if (!text || !search) {
		return [text ?? ""];
	}

	const escaped = search.replaceAll(/[$()*+.?[\\\]^{|}]/gu, "\\$&");
	const regex = new RegExp(`(${escaped})`, "iu");

	// Return JSX with <mark> tags
	const parts = text.split(regex);

	return parts.map((part, index) =>
		// Captured groups appear at odd indices after split
		index % 2 === 1 ? (
			// eslint-disable-next-line react/no-array-index-key
			<span key={`${part}-${index}`} className="bg-yellow-300">
				{part}
			</span>
		) : (
			part
		),
	);
};
