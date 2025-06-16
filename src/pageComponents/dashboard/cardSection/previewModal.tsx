import { type ReactNode } from "react";
import { Dialog, useDialogState } from "ariakit/dialog";

type PreviewModalProps = {
	children: ReactNode;
	isOpen: boolean;
	onClose: () => void;
	title?: string;
};

const PreviewModal = ({
	children,
	isOpen,
	onClose,
	title = "",
}: PreviewModalProps) => {
	const dialog = useDialogState({
		open: isOpen,
		setOpen: (open) => {
			if (!open) onClose();
		},
	});

	if (!isOpen) return null;

	return (
		<Dialog
			backdropProps={{
				className:
					"fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity animate-fade-in",
				onClick: onClose,
			}}
			className="fixed inset-0 z-50 flex items-end justify-center"
			hideOnInteractOutside={false}
			state={dialog}
		>
			<div
				aria-describedby="bottom-sheet-description"
				aria-labelledby="bottom-sheet-title"
				aria-modal="true"
				// eslint-disable-next-line tailwindcss/no-custom-classname
				className="animate-slide-up relative h-4/5 w-full max-w-6xl bg-white shadow-xl outline-none focus:outline-none focus-visible:ring-2"
				role="dialog"
				tabIndex={-1}
			>
				{/* Header */}
				<div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white p-4">
					<h2
						className="m-0 text-lg font-medium text-gray-900"
						id="bottom-sheet-title"
					>
						{title}
					</h2>
					<p className="sr-only" id="bottom-sheet-description">
						{`${title} dialog. Use Escape key to close.`}
					</p>
					<button
						className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500"
						onClick={onClose}
						type="button"
					>
						<svg
							fill="none"
							height="20"
							stroke="currentColor"
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth="2"
							viewBox="0 0 24 24"
							width="20"
							xmlns="http://www.w3.org/2000/svg"
						>
							<line x1="18" x2="6" y1="6" y2="18" />
							<line x1="6" x2="18" y1="6" y2="18" />
						</svg>
					</button>
				</div>
				{/* Content */}
				<div className="h-[calc(100%-56px)] overflow-y-auto p-4">
					{children}
				</div>
			</div>
			<style>{`
				@keyframes slideUp {
					from {
						transform: translateY(100%);
					}
					to {
						transform: translateY(0);
					}
				}

				.animate-slide-up {
					animation: slideUp 0.3s ease-out forwards;
				}

				@keyframes fadeIn {
					from {
						opacity: 0;
					}
					to {
						opacity: 1;
					}
				}

				.animate-fade-in {
					animation: fadeIn 0.2s ease-out forwards;
				}

				.backdrop-blur-sm {
					animation: fadeIn 0.2s ease-out forwards;
				}
			`}</style>
		</Dialog>
	);
};

export default PreviewModal;
