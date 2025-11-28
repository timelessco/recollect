/* eslint-disable react/no-array-index-key */
import useIsMobileView from "../../../hooks/useIsMobileView";
import { viewValues } from "../../../utils/constants";
import { getColumnCount } from "../../../utils/helpers";

const precomputedHeights = generateRandomHeights(26);

export const BookmarksSkeletonLoader = ({
	count = 26,
	type,
	colCount,
}: {
	count?: number;
	type?: string | number[] | string[] | undefined;
	colCount?: number;
}) => {
	const { isDesktop } = useIsMobileView();

	const skeletonHeights = precomputedHeights.slice(0, count);
	const columnCount = getColumnCount(isDesktop, colCount);

	// List View Skeleton
	if (type === viewValues.list) {
		return (
			<div className="flex flex-col gap-4 px-2 py-2">
				{Array.from({ length: count }).map((_, index) => (
					<div
						key={`skeleton-list-${index}`}
						className="flex items-center gap-3"
					>
						<div className="h-12 w-20 shrink-0 animate-pulse rounded bg-gray-100" />
						<div className="flex-1 space-y-2">
							<div className="h-4 w-1/3 animate-pulse rounded bg-gray-100" />
							<div className="h-3 w-1/5 animate-pulse rounded bg-gray-100" />
						</div>
					</div>
				))}
			</div>
		);
	}

	// Timeline View Skeleton - Vertical column with fixed width and varying heights
	if (type === viewValues.timeline) {
		return (
			<div className="flex justify-center py-4">
				<div className="w-[600px] space-y-6">
					{Array.from({ length: Math.min(count, 10) }).map((_, index) => (
						<div
							key={`skeleton-timeline-${index}`}
							className="h-[500px] animate-pulse rounded-lg bg-gray-100"
						/>
					))}
				</div>
			</div>
		);
	}

	const columns: number[][] = Array.from({ length: columnCount }, () => []);
	const columnHeights: number[] = Array.from({ length: columnCount }, () => 0);

	// Generate unique IDs for columns and items
	const columnKeys = Array.from(
		{ length: columns.length },
		(_, index) => `col-${index}`,
	);

	// Card View Skeleton
	if (type === viewValues.card) {
		const itemsPerColumn = Math.ceil(count / columnCount);
		const fixedHeight = 200;

		return (
			<div className="flex gap-6">
				{Array.from({ length: columnCount }).map((_, colIndex) => (
					<div
						key={columnKeys[colIndex]}
						className="flex flex-1 flex-col gap-6"
					>
						{Array.from({ length: itemsPerColumn }).map((_, index) => (
							<div
								key={`skeleton-card-${colIndex}-${index}`}
								className="animate-pulse rounded-lg bg-gray-100"
								style={{
									height: `${fixedHeight}px`,
								}}
							/>
						))}
					</div>
				))}
			</div>
		);
	}

	// Default Moodboard View
	// Distribute items into columns
	for (const height of skeletonHeights) {
		const shortestColumnIndex = columnHeights.indexOf(
			Math.min(...columnHeights),
		);
		columns[shortestColumnIndex].push(height);
		columnHeights[shortestColumnIndex] += height + 16;
	}

	return (
		<div className="flex gap-6">
			{columns.map((colh, colIndex) => (
				<div key={columnKeys[colIndex]} className="flex flex-1 flex-col gap-6">
					{colh.map((height, index) => (
						<div
							key={`skeleton-moodboard-${colIndex}-${index}`}
							className="animate-pulse rounded-lg bg-gray-100"
							style={{
								height: `${height - 16}px`,
							}}
						/>
					))}
				</div>
			))}
		</div>
	);
};

function generateRandomHeights(count: number): number[] {
	return Array.from(
		{ length: count },
		() => Math.floor(Math.random() * (850 - 250 + 1)) + 250,
	);
}
