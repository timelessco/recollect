import { Drawer } from "vaul";

type PreviewModalProps = {
	children: React.ReactNode;
	contentType?: "file" | "image" | "url";
	isOpen?: boolean;
	onOpenChange?: (open: boolean) => void;
};

const PreviewModal = ({
	children,
	contentType = "url",
	isOpen,
	onOpenChange,
}: PreviewModalProps) => {
	// For URLs, we want to constrain the width, for images/files use natural size
	const contentWidthClass =
		contentType === "url"
			? "w-3/4 max-w-[1200px] h-[98%]"
			: "w-auto max-w-auto";

	return (
		<Drawer.Root onOpenChange={onOpenChange} open={isOpen}>
			<Drawer.Portal>
				<Drawer.Overlay className="fixed inset-0 z-[20] bg-white/90 backdrop-blur-[32px]" />
				<Drawer.Content
					className={`fixed inset-x-0 bottom-0 z-[60] mx-auto  ${contentWidthClass} rounded-t-3xl bg-black/50 outline-none backdrop-blur-sm`}
				>
					<div className="relative flex h-full flex-col rounded-t-3xl bg-white">
						{children}
					</div>
				</Drawer.Content>
			</Drawer.Portal>
		</Drawer.Root>
	);
};

export default PreviewModal;
