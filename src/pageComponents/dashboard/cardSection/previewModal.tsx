import { Drawer } from "vaul";

type PreviewModalProps = {
	children: React.ReactNode;
	isOpen?: boolean;
	onOpenChange?: (open: boolean) => void;
};

const PreviewModal = ({
	children,
	isOpen,
	onOpenChange,
}: PreviewModalProps) => (
	// const handleClose = () => {
	// 	onOpenChange?.(false);
	// };

	<Drawer.Root onOpenChange={onOpenChange} open={isOpen}>
		<Drawer.Portal>
			<Drawer.Overlay className="fixed inset-0 z-[20] bg-gray-50/80" />
			<Drawer.Content className="fixed inset-x-0 bottom-0 z-[60] mx-auto h-[98%]  w-3/4 rounded-t-3xl bg-black/50 outline-none backdrop-blur-sm">
				<div className="relative flex h-full flex-col rounded-t-3xl bg-white">
					{/* <button
							aria-label="Close modal"
							className="absolute right-4 top-4 z-10 rounded-full p-2 text-gray-500 transition-colors  hover:text-gray-700"
							onClick={handleClose}
							type="button"
						>
							<svg
								fill="none"
								height="28"
								viewBox="0 0 48 48"
								width="28"
								xmlns="http://www.w3.org/2000/svg"
							>
								<rect
									fill="currentColor"
									height="48"
									opacity="0.1"
									rx="24"
									width="48"
								/>
								<path
									d="M29.7407 31.1825C30.01 31.4518 30.4466 31.4518 30.716 31.1825C30.9853 30.9131 30.9853 30.4765 30.716 30.2071L24.3989 23.8901L30.4946 17.7945C30.7639 17.5252 30.7639 17.0885 30.4946 16.8192C30.2252 16.5499 29.7886 16.5499 29.5192 16.8192L23.4236 22.9148L17.5492 17.0403C17.2798 16.771 16.8432 16.771 16.5738 17.0403C16.3045 17.3097 16.3045 17.7463 16.5738 18.0156L22.4483 23.8901L16.3524 29.986C16.0831 30.2553 16.0831 30.692 16.3524 30.9613C16.6218 31.2306 17.0584 31.2306 17.3277 30.9613L23.4236 24.8654L29.7407 31.1825Z"
									fill="currentColor"
								/>
							</svg>
						</button> */}
					{children}
				</div>
			</Drawer.Content>
		</Drawer.Portal>
	</Drawer.Root>
);
export default PreviewModal;
