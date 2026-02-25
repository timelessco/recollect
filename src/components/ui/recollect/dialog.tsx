import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";

import { cn } from "@/utils/tailwind-merge";

function Root({ modal = "trap-focus", ...props }: DialogPrimitive.Root.Props) {
	return <DialogPrimitive.Root modal={modal} {...props} />;
}

function Portal(props: DialogPrimitive.Portal.Props) {
	return <DialogPrimitive.Portal {...props} />;
}

function Backdrop(props: DialogPrimitive.Backdrop.Props) {
	const { className, ...rest } = props;

	return (
		<DialogPrimitive.Backdrop
			className={cn(
				"fixed inset-0 z-101 bg-black/36 backdrop-blur-sm",
				className,
			)}
			{...rest}
		/>
	);
}

function Popup(props: DialogPrimitive.Popup.Props) {
	const { className, ...rest } = props;

	return (
		<DialogPrimitive.Popup
			className={cn(
				"fixed top-1/2 left-1/2 z-102 -translate-x-1/2 -translate-y-1/2 bg-gray-0",
				"rounded-lg p-4 outline-hidden",
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
			className={cn("text-lg font-semibold", className)}
			{...rest}
		/>
	);
}

function Description(props: DialogPrimitive.Description.Props) {
	const { className, ...rest } = props;

	return (
		<DialogPrimitive.Description
			className={cn("text-sm text-gray-600", className)}
			{...rest}
		/>
	);
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
};
