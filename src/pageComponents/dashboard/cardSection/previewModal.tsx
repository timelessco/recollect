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
	<Drawer.Root onOpenChange={onOpenChange} open={isOpen}>
		<Drawer.Portal>
			<Drawer.Overlay className="fixed inset-0 z-[20] bg-black/40" />
			<Drawer.Content className="fixed inset-x-0 bottom-0 z-[60] mx-auto h-2/3 w-3/4 rounded-t-[10px] bg-black/50 outline-none backdrop-blur-sm">
				<div className="flex-1 rounded-t-[10px] bg-white p-4">
					<div className="mx-auto mb-8 h-1.5 w-12 shrink-0 rounded-full bg-gray-300" />
					{children}
				</div>
			</Drawer.Content>
		</Drawer.Portal>
	</Drawer.Root>
);

export default PreviewModal;
