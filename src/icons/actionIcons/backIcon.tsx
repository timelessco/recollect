import { type PointerEvent } from "react";

const BackIcon = ({
	onPointerDown,
}: {
	onPointerDown?: (event: PointerEvent) => void;
}) => (
	<svg
		fill="none"
		height="16"
		onPointerDown={onPointerDown}
		viewBox="0 0 16 16"
		width="16"
		xmlns="http://www.w3.org/2000/svg"
	>
		<path
			d="M2.6665 4.66667H9.33317C10.394 4.66667 11.4115 5.08809 12.1616 5.83824C12.9117 6.58839 13.3332 7.6058 13.3332 8.66667C13.3332 9.72753 12.9117 10.7449 12.1616 11.4951C11.4115 12.2452 10.394 12.6667 9.33317 12.6667H5.33317M2.6665 4.66667L5.33317 2M2.6665 4.66667L5.33317 7.33333"
			stroke="black"
			strokeLinecap="round"
			strokeLinejoin="round"
			strokeOpacity="0.91"
		/>
	</svg>
);

export default BackIcon;
