import { Icon, type IconProps } from "@/components/atoms/icon";

export const TrashIconGray = (props: IconProps) => (
	<Icon {...props} fill="none" viewBox="0 0 18 18">
		<path
			fill="currentColor"
			d="M14 12.4V4H4v8.4c0 1.26 0 1.89.234 2.371a2.2 2.2 0 0 0 .936.984C5.628 16 6.228 16 7.429 16h3.142c1.2 0 1.8 0 2.259-.245a2.2 2.2 0 0 0 .936-.984c.234-.48.234-1.11.234-2.371Z"
			opacity=".12"
		/>
		<path
			stroke="currentColor"
			strokeLinecap="round"
			strokeLinejoin="round"
			d="M12 4.2c0-.84 0-1.26-.164-1.581a1.5 1.5 0 0 0-.655-.656C10.86 1.8 10.44 1.8 9.6 1.8H8.4c-.84 0-1.26 0-1.581.163a1.5 1.5 0 0 0-.656.656C6 2.939 6 3.359 6 4.199m1.5 4.126v3.75m3-3.75v3.75M3.15 4.2h11.7m-.6 0v8.4c0 1.26 0 1.89-.245 2.371a2.25 2.25 0 0 1-.984.983c-.48.246-1.111.246-2.371.246h-3.3c-1.26 0-1.89 0-2.372-.245a2.25 2.25 0 0 1-.983-.984C3.75 14.49 3.75 13.86 3.75 12.6V4.2"
		/>
	</Icon>
);

export default TrashIconGray;
