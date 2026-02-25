import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";

import { cn } from "@/utils/tailwind-merge";

function Root({ ...props }: DialogPrimitive.Root.Props) {
	return <DialogPrimitive.Root {...props} />;
}

function Portal(props: DialogPrimitive.Portal.Props) {
	return <DialogPrimitive.Portal {...props} />;
}

function Backdrop(props: DialogPrimitive.Backdrop.Props) {
	const { className, ...rest } = props;
	return (
		/* adding z-102 to have z-index in modal so that nothing overlaps the modal */
		<DialogPrimitive.Backdrop
			className={cn(
				"fixed inset-0 z-102 bg-black/36 backdrop-blur-sm",
				className,
			)}
			{...rest}
		/>
	);
}

function Popup(props: DialogPrimitive.Popup.Props) {
	const { className, ...rest } = props;

	return (
		/* adding z-102 to have z-index in modal so that nothing overlaps the modal */
		<DialogPrimitive.Popup
			className={cn(
				"fixed top-1/2 left-1/2 z-102 -translate-x-1/2 -translate-y-1/2 rounded-lg bg-gray-0 outline-hidden",
				className,
			)}
			{...rest}
		/>
	);
}

function Title(props: DialogPrimitive.Title.Props) {
	const { className, ...rest } = props;
	return (
		<DialogPrimitive.Title
			className={cn("text-lg font-semibold text-gray-900", className)}
			{...rest}
		/>
	);
}

function Description(props: DialogPrimitive.Description.Props) {
	const { className, ...rest } = props;
	return (
		<DialogPrimitive.Description
			className={cn("mt-2 text-sm text-gray-600", className)}
			{...rest}
		/>
	);
}

function Trigger(props: DialogPrimitive.Trigger.Props) {
	return <DialogPrimitive.Trigger {...props} />;
}

function Close(props: DialogPrimitive.Close.Props) {
	return <DialogPrimitive.Close {...props} />;
}

export const Dialog = {
	Backdrop,
	Close,
	Description,
	Popup,
	Portal,
	Root,
	Title,
	Trigger,
};
