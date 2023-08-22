import { Player, type PlayerProps } from "video-react";

type ExtendedPlayerProps = PlayerProps & {
	className: string;
};

const CustomPlayer: React.FC<ExtendedPlayerProps> = (props) => (
	// You can now use the 'classname' prop here
	<Player {...props} />
);
export default CustomPlayer;
