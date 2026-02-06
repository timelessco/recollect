import { useToggleDiscoverableOptimisticMutation } from "@/async/mutationHooks/bookmarks/use-toggle-discoverable-optimistic-mutation";
import Switch from "@/components/switch";
import { DiscoverIcon } from "@/icons/discover-icon";

type DiscoverableCheckboxProps = {
	bookmarkId: number;
	isDiscoverable: boolean;
};

export const DiscoverCheckbox = ({
	bookmarkId,
	isDiscoverable,
}: DiscoverableCheckboxProps) => {
	const { toggleDiscoverableOptimisticMutation } =
		useToggleDiscoverableOptimisticMutation();

	const handleToggle = () => {
		toggleDiscoverableOptimisticMutation.mutate({
			bookmark_id: bookmarkId,
			make_discoverable: !isDiscoverable,
		});
	};

	return (
		<div className="flex items-center justify-between gap-3 px-2 py-[7.5px]">
			<div className="flex items-center gap-2">
				<div className="flex h-4 w-4 items-center justify-center text-gray-800">
					<DiscoverIcon className="h-4 w-4" />
				</div>
				<span className="text-13 leading-4 font-450 text-gray-800">
					Show in discover page
				</span>
			</div>
			<div className="flex shrink-0 items-center">
				<Switch
					enabled={isDiscoverable}
					setEnabled={handleToggle}
					disabled={false}
					size="small"
				/>
			</div>
		</div>
	);
};
