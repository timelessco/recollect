import clsx from "clsx";

type TabsProps = {
	onTabClick: (value: number | string) => void;
	tabs: Array<{ current: boolean; name: string; value: number | string }>;
};

const Tabs = (props: TabsProps) => {
	const { tabs = [], onTabClick } = props;

	return (
		<div>
			<div className="sm:hidden">
				<label className="sr-only" htmlFor="tabs">
					Select a tab
					<select
						className="block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm"
						defaultValue={tabs.find((tab) => tab.current)?.name}
						id="tabs"
						name="tabs"
					>
						{tabs.map((tab) => (
							<option key={tab.name}>{tab.name}</option>
						))}
					</select>
				</label>
			</div>
			<div className="hidden sm:block">
				<div className="border-b border-gray-200">
					<nav aria-label="Tabs" className="-mb-px flex space-x-8">
						{tabs.map((tab) => (
							<div
								aria-current={tab.current ? "page" : undefined}
								className={clsx(
									tab.current
										? "border-gray-500 text-gray-600"
										: "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700",
									" cursor-pointer whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium",
								)}
								id={`${tab?.name}-tab`}
								key={tab.name}
								onClick={() => onTabClick(tab.value)}
								onKeyDown={() => {}}
								role="button"
								tabIndex={0}
							>
								{tab.name}
							</div>
						))}
					</nav>
				</div>
			</div>
		</div>
	);
};

export default Tabs;
