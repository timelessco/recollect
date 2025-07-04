// import { useEffect, useRef } from "react";
// import find from "lodash/find";

// import Modal from "../../../components/modal";
// import {
// 	useMiscellaneousStore,
// 	useModalStore,
// } from "../../../store/componentStore";
// import { type SingleListData } from "../../../types/apiTypes";
// import { aspectRatio } from "../../../utils/helpers";

// const VideoModal = ({ listData }: { listData: SingleListData[] }) => {
// 	const showVideoModal = useModalStore((state) => state.showVideoModal);
// 	const ref = useRef<HTMLVideoElement>(null);

// 	const toggleShowVideoModal = useModalStore(
// 		(state) => state.toggleShowVideoModal,
// 	);
// 	const selectedVideoId = useMiscellaneousStore(
// 		(state) => state.selectedVideoId,
// 	);
// 	const setSelectedVideoId = useMiscellaneousStore(
// 		(state) => state.setSelectedVideoId,
// 	);

// 	useEffect(() => {
// 		if (!showVideoModal) {
// 			setSelectedVideoId(null);
// 			// if this is not there then video keeps playing even on modal close
// 			ref?.current?.pause();
// 		}
// 	}, [setSelectedVideoId, showVideoModal]);

// 	const selectedVideoData = find(
// 		listData,
// 		(item) => selectedVideoId === item?.id,
// 	);

// 	const ratio = aspectRatio(
// 		selectedVideoData?.meta_data?.width ?? 0,
// 		selectedVideoData?.meta_data?.height ?? 0,
// 	);

// 	return (
// 		<Modal
// 			open={showVideoModal}
// 			setOpen={() => toggleShowVideoModal()}
// 			// only the aspect ratio we have it as styled as in tailwind we cant have custom ratio
// 			style={{ aspectRatio: ratio?.width / ratio?.height }}
// 			wrapperClassName="h-[80%] w-[80%] rounded-2xl outline-none max-w-max"
// 		>
// 			{/* eslint-disable-next-line jsx-a11y/media-has-caption */}
// 			<video
// 				autoPlay
// 				className="h-full w-full rounded-2xl bg-black object-contain"
// 				controls
// 				preload="auto"
// 				ref={ref}
// 				src={selectedVideoData?.url}
// 			/>
// 		</Modal>
// 	);
// };

// export default VideoModal;
