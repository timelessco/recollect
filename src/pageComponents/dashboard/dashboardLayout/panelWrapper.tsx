import { useWindowSize } from "@react-hookz/web";
import {
	Panel,
	PanelGroup,
	PanelResizeHandle,
	type ImperativePanelHandle,
} from "react-resizable-panels";

export const MAX_SIZE_PIXEL = 350;
export const MIN_SIZE_PIXEL = 244;

type PanelWrapperProps = {
	showSidePane: boolean;
	setShowSidePane: (value: boolean) => void;
	sidePaneContent: React.ReactNode;
	children: React.ReactNode;
	sidePanelRef: React.Ref<ImperativePanelHandle | null>;
};

export const PanelWrapper = (props: PanelWrapperProps) => {
	const {
		showSidePane,
		setShowSidePane,
		sidePaneContent,
		children,
		sidePanelRef,
	} = props;
	const { width: windowWidth } = useWindowSize();
	const maxSizePercentage = (MAX_SIZE_PIXEL / windowWidth) * 100;
	const minSizePercentage = (MIN_SIZE_PIXEL / windowWidth) * 100;

	return (
		<PanelGroup direction="horizontal" autoSaveId="conditional">
			<Panel
				ref={sidePanelRef}
				id="left"
				defaultSize={20}
				collapsedSize={0}
				minSize={minSizePercentage}
				maxSize={maxSizePercentage}
				collapsible
				order={1}
				onCollapse={() => setShowSidePane(false)}
				onExpand={() => setShowSidePane(true)}
				className="transition-[flex-grow] duration-100 ease-out"
			>
				{sidePaneContent}
			</Panel>

			<PanelResizeHandle
				className={`group w-5 cursor-grab! justify-center data-[resize-handle-state='drag']:cursor-grabbing! ${showSidePane ? "flex" : "hidden"}`}
			>
				<div className="h-full w-px cursor-grab! bg-gray-alpha-50 transition-all group-hover:w-2 group-hover:bg-gray-100" />
			</PanelResizeHandle>

			<Panel id="right" order={2}>
				{children}
			</Panel>
		</PanelGroup>
	);
};
