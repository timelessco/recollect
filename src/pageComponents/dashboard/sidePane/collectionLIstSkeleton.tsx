export const CollectionsListSkeleton = () => (
	<>
		{Array.from({ length: 5 }, (_, index) => (
			<div
				key={`collection-list-item-${index}`}
				className="group flex items-center justify-between rounded-lg px-2 py-[6px]"
			>
				<div className="flex items-center">
					<div className="h-[18px] w-[18px] animate-pulse rounded-full bg-gray-100" />
					<div className="ml-2 h-4 w-30 animate-pulse rounded bg-gray-100" />
				</div>
			</div>
		))}
	</>
);
