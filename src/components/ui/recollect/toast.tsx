"use client";

import { Toast as ToastPrimitive } from "@base-ui/react/toast";

import { cn } from "@/utils/tailwind-merge";

export const toastManager = ToastPrimitive.createToastManager();

const TOAST_SHADOW = [
	"0 64px 18px 0 rgb(0 0 0 / 0%)",
	"0 41px 16px 0 rgb(0 0 0 / 2%)",
	"0 23px 14px 0 rgb(0 0 0 / 6%)",
	"0 10px 10px 0 rgb(0 0 0 / 11%)",
	"0 3px 6px 0 rgb(0 0 0 / 13%)",
].join(", ");

function Provider(props: ToastPrimitive.Provider.Props) {
	return (
		<ToastPrimitive.Provider
			toastManager={toastManager}
			timeout={5000}
			{...props}
		/>
	);
}

function Viewport(props: ToastPrimitive.Viewport.Props) {
	const { className, ...rest } = props;
	return (
		<ToastPrimitive.Viewport
			className={cn(
				"fixed right-4 bottom-4 z-9999 flex w-fit flex-col items-end gap-4",
				className,
			)}
			{...rest}
		/>
	);
}

function Root(props: ToastPrimitive.Root.Props) {
	const { className, ...rest } = props;
	return (
		<ToastPrimitive.Root
			className={cn(
				"toast-root min-h-0 w-[320px] rounded-2xl bg-gray-950 px-4 py-3",
				className,
			)}
			style={{ boxShadow: TOAST_SHADOW }}
			{...rest}
		/>
	);
}

function Title(props: ToastPrimitive.Title.Props) {
	const { className, ...rest } = props;
	return (
		<ToastPrimitive.Title
			className={cn(
				"text-sm leading-[18px] font-450 tracking-[0.14px] text-gray-0 not-italic",
				className,
			)}
			{...rest}
		/>
	);
}

function Description(props: ToastPrimitive.Description.Props) {
	const { className, ...rest } = props;
	return (
		<ToastPrimitive.Description
			className={cn(
				"mt-[4px] text-13 leading-[14px] font-450 tracking-[0.13px] text-gray-500 not-italic",
				className,
			)}
			{...rest}
		/>
	);
}

function Close(props: ToastPrimitive.Close.Props) {
	return <ToastPrimitive.Close {...props} />;
}

function List() {
	const { toasts } = ToastPrimitive.useToastManager();
	return toasts.map((toast) => (
		<Root key={toast.id} toast={toast}>
			<div className="flex">
				{toast.data?.icon}
				<div className="ml-2">
					<Title />
					{toast.description && <Description />}
				</div>
			</div>
		</Root>
	));
}

/**
 * Pre-composed toast setup for use in layout files (Server Components).
 * Renders Provider + Viewport + List as a single client component boundary.
 */
export function ToastSetup() {
	return (
		<Provider>
			<Viewport>
				<List />
			</Viewport>
		</Provider>
	);
}

export const Toast = {
	Close,
	Description,
	List,
	Provider,
	Root,
	Title,
	Viewport,
};
