import ClipLoader from "react-spinners/ClipLoader";

type SpinnerProps = {
	size?: number;
};

const Spinner = (props: SpinnerProps) => {
	const { size = 10 } = props;

	return <ClipLoader color="bg-white" loading size={size} />;
};

export default Spinner;
