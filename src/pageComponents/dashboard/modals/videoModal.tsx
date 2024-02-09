import { useEffect } from "react";
import find from "lodash/find";

import Modal from "../../../components/modal";
import {
	useMiscellaneousStore,
	useModalStore,
} from "../../../store/componentStore";
import { type SingleListData } from "../../../types/apiTypes";

const VideoModal = ({ listData }: { listData: SingleListData[] }) => {
	const showVideoModal = useModalStore((state) => state.showVideoModal);
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
			wrapperClassName="w-[65.4%] h-[82%] rounded-2xl outline-none"
		>
			{/* eslint-disable-next-line jsx-a11y/media-has-caption */}
			<video
				className="h-full w-full rounded-2xl"
				controls
				src={selectedVideoData?.url}
			/>
		</Modal>
	);
};

export default VideoModal;
