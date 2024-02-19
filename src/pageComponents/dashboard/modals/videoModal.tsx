import { useEffect, useRef } from "react";
import find from "lodash/find";

// import ModalVideo from "react-modal-video";

// import "node_modules/react-modal-video/scss/modal-video.scss";

import Modal from "../../../components/modal";
import {
	useMiscellaneousStore,
	useModalStore,
} from "../../../store/componentStore";
import { type SingleListData } from "../../../types/apiTypes";

const VideoModal = ({ listData }: { listData: SingleListData[] }) => {
	const showVideoModal = useModalStore((state) => state.showVideoModal);
	const ref = useRef<HTMLVideoElement>(null);

	const toggleShowVideoModal = useModalStore(
		(state) => state.toggleShowVideoModal,
	);
	const selectedVideoId = useMiscellaneousStore(
		(state) => state.selectedVideoId,
	);
	const setSelectedVideoId = useMiscellaneousStore(
		(state) => state.setSelectedVideoId,
	);

	useEffect(() => {
		if (!showVideoModal) {
			setSelectedVideoId(null);
			// if this is not there then video keeps playing even on modal close
			ref?.current?.pause();
		}
	}, [setSelectedVideoId, showVideoModal]);

	const selectedVideoData = find(
		listData,
		(item) => selectedVideoId === item?.id,
	);

	return (
		<Modal
			open={showVideoModal}
			setOpen={() => toggleShowVideoModal()}
			// wrapperClassName="h-auto w-auto max-w-[80%] rounded-2xl outline-none"
			wrapperClassName="h-[80%] w-[80%] rounded-2xl outline-none"
			// wrapperClassName="relative h-[100vh] w-[100vw] rounded-2xl outline-none"
		>
			{/* eslint-disable-next-line jsx-a11y/media-has-caption */}
			<video
				autoPlay
				className="h-full w-full rounded-2xl bg-black object-contain"
				controls
				preload="auto"
				ref={ref}
				src={selectedVideoData?.url}
			/>
		</Modal>
	);

	// TODO: check and remove this and its dependencies, remove sass as well
	// 	return (
	// 		<ModalVideo
	// 			autoplay
	// 			channel="custom"
	// 			isOpen={showVideoModal}
	// 			onClose={() =>  {
	// 				console.log("close");
	// 				toggleShowVideoModal()
	// 			}}
	// 			url={selectedVideoData?.url}
	// 		/>
	// 	);
};

export default VideoModal;
