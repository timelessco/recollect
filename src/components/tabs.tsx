function classNames(...classes: Array<string>) {
  return classes.filter(Boolean).join(" ");
}

interface TabsProps {
  tabs: Array<{ name: string; current: boolean; value: string | number }>;
  onTabClick: (value: number | string) => void;
}

const Tabs = (props: TabsProps) => {
  const { tabs = [], onTabClick } = props;

  return (
    <div>
      <div className="sm:hidden">
        <label htmlFor="tabs" className="sr-only">
          Select a tab
          <select
            id="tabs"
            name="tabs"
            className="block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm"
            defaultValue={tabs.find(tab => tab.current)?.name}
          >
            {tabs.map(tab => (
              <option key={tab.name}>{tab.name}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="hidden sm:block">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {tabs.map(tab => (
              <div
                id={`${tab?.name}-tab`}
                key={tab.name}
                onClick={() => onTabClick(tab.value)}
                onKeyDown={() => {}}
                role="button"
                tabIndex={0}
                className={classNames(
                  tab.current
                    ? "border-gray-500 text-gray-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300",
                  " cursor-pointer whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm",
                )}
                aria-current={tab.current ? "page" : undefined}
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
