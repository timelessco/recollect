export const highlightSearch = (text: string, search: string) => {
	if (!search) {
		return text;
	}

	const escaped = search.replaceAll(/[$()*+.?[\\\]^{|}]/gu, "\\$&");
	const regex = new RegExp(`(${escaped})`, "giu");

	// Return JSX with <mark> tags
	return text.split(regex).map((part, index) =>
		regex.test(part) ? (
			// eslint-disable-next-line react/no-array-index-key
			<span key={`${part}-${index}`} className="bg-yellow-300">
				{part}
			</span>
		) : (
			part
		),
	);
};
