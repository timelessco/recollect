import { useToggleDiscoverableOptimisticMutation } from "@/async/mutationHooks/bookmarks/use-toggle-discoverable-optimistic-mutation";
import { Switch } from "@/components/ui/recollect/switch";
import { DiscoverIcon } from "@/icons/discover-icon";

interface DiscoverSwitchProps {
	bookmarkId: number;
	isDiscoverable: boolean;
}

export const DiscoverSwitch = ({
	bookmarkId,
	isDiscoverable,
}: DiscoverSwitchProps) => (
	<div className="flex items-center justify-between gap-3 px-2 py-[7.5px]">
		<div className="flex items-center gap-2">
			<div className="flex h-4 w-4 items-center justify-center text-gray-800">
				<DiscoverIcon className="h-4 w-4" />
			</div>
			<span className="text-13 leading-[115%] font-450 tracking-[0.13px] text-gray-800">
				Show in discover page
			</span>
		</div>
		<div className="flex shrink-0 items-center">
			<DiscoverSwitchToggle
				bookmarkId={bookmarkId}
				isDiscoverable={isDiscoverable}
			/>
		</div>
	</div>
);

interface DiscoverSwitchToggleProps {
	bookmarkId: number;
	isDiscoverable: boolean;
}

function DiscoverSwitchToggle({
	bookmarkId,
	isDiscoverable,
}: DiscoverSwitchToggleProps) {
	const { toggleDiscoverableOptimisticMutation } =
		useToggleDiscoverableOptimisticMutation();

	const handleToggle = () => {
		toggleDiscoverableOptimisticMutation.mutate({
			bookmark_id: bookmarkId,
			make_discoverable: !isDiscoverable,
		});
	};

	return (
		<Switch
			aria-label="Show in discover page"
			checked={isDiscoverable}
			onCheckedChange={handleToggle}
			disabled={false}
			size="small"
		/>
	);
}
