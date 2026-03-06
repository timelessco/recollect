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
			limit={3}
			{...props}
		/>
	);
}

function Viewport(props: ToastPrimitive.Viewport.Props) {
	const { className, ...rest } = props;
	return (
		<ToastPrimitive.Viewport
			className={cn(
				"fixed right-4 bottom-4 z-9999 w-[320px] list-none outline-0",
				"data-[expanded]:pt-[300px]",
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
			data-toast-root=""
			className={cn(
				[
					"absolute right-0 bottom-0 w-full rounded-2xl bg-gray-950",
					"transition-[transform,opacity] duration-400 ease-[cubic-bezier(0.16,1,0.3,1)]",
					"[transform-origin:bottom_center]",
					"[z-index:calc(1000-var(--toast-index))]",
					"[transform:scale(calc(1-0.05*var(--toast-index)))_translateX(var(--toast-swipe-movement-x,0px))_translateY(calc(var(--toast-swipe-movement-y,0px)+var(--toast-index)*-8px))]",
					"data-[expanded]:[transform:scale(1)_translateY(calc((var(--toast-offset-y)+var(--toast-index)*8px)*-1))_translateX(var(--toast-swipe-movement-x,0px))]",
					"data-[starting-style]:translate-y-[calc(100%+16px)] data-[starting-style]:opacity-0",
					"data-[ending-style]:opacity-0",
					"data-[ending-style]:data-[swipe-direction=down]:[transform:translateY(calc(var(--toast-swipe-movement-y,0px)+150%))]",
					"data-[ending-style]:data-[swipe-direction=right]:[transform:translateX(calc(var(--toast-swipe-movement-x,0px)+150%))_translateY(calc(var(--toast-index)*-8px+var(--toast-swipe-movement-y,0px)))]",
					"data-[ending-style]:data-[swipe-direction=up]:[transform:translateY(calc(var(--toast-swipe-movement-y,0px)-150%))]",
					"data-[ending-style]:data-[swipe-direction=left]:[transform:translateX(calc(var(--toast-swipe-movement-x,0px)-150%))_translateY(calc(var(--toast-index)*-8px+var(--toast-swipe-movement-y,0px)))]",
				],
				className,
			)}
			style={{ boxShadow: TOAST_SHADOW }}
			{...rest}
		/>
	);
}

function Content(props: ToastPrimitive.Content.Props) {
	const { className, ...rest } = props;
	return (
		<ToastPrimitive.Content
			className={cn(
				"[max-height:var(--toast-height)] overflow-hidden px-4 py-3 transition-opacity duration-250",
				"data-[behind]:opacity-0",
				"data-[expanded]:opacity-100",
				className,
			)}
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
			<Content>
				<div className="flex">
					{toast.data?.icon}
					<div className="ml-2">
						<Title />
						{toast.description && <Description />}
					</div>
				</div>
			</Content>
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
			<ToastPrimitive.Portal>
				<Viewport>
					<List />
				</Viewport>
			</ToastPrimitive.Portal>
		</Provider>
	);
}

export const Toast = {
	Close,
	Content,
	Description,
	List,
	Provider,
	Root,
	Title,
	Viewport,
};
