"use client";

import { Toast as ToastPrimitive } from "@base-ui/react/toast";

import { cn } from "@/utils/tailwind-merge";

interface ToastData {
  icon?: React.ReactNode;
}

export const toastManager = ToastPrimitive.createToastManager<ToastData>();

const TOAST_SHADOW = [
  "0 64px 18px 0 rgb(0 0 0 / 0%)",
  "0 41px 16px 0 rgb(0 0 0 / 2%)",
  "0 23px 14px 0 rgb(0 0 0 / 6%)",
  "0 10px 10px 0 rgb(0 0 0 / 11%)",
  "0 3px 6px 0 rgb(0 0 0 / 13%)",
].join(", ");

function Provider(props: ToastPrimitive.Provider.Props) {
  return (
    <ToastPrimitive.Provider limit={3} timeout={5000} toastManager={toastManager} {...props} />
  );
}

function Viewport(props: ToastPrimitive.Viewport.Props) {
  const { className, ...rest } = props;
  return (
    <ToastPrimitive.Viewport
      className={cn("fixed right-4 bottom-4 z-9999 w-[320px] list-none outline-0", className)}
      {...rest}
    />
  );
}

function Root(props: ToastPrimitive.Root.Props) {
  const { className, ...rest } = props;
  return (
    <ToastPrimitive.Root
      className={cn(
        [
          "absolute right-0 bottom-0 box-border w-full rounded-2xl bg-gray-950 select-none",
          "cursor-default",
          "origin-[bottom_center]",
          "z-[calc(1000-var(--toast-index))]",
          // Height: use frontmost height when collapsed, own height when expanded
          "h-(--toast-frontmost-height,var(--toast-height))",
          "transition-[transform,opacity,height] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
          // Stacking transform: scale down + peek offset
          "[--scale:max(0,calc(1-var(--toast-index)*0.1))]",
          "[--shrink:calc(1-var(--scale))]",
          "[--height:var(--toast-frontmost-height,var(--toast-height))]",
          "transform-[translateX(var(--toast-swipe-movement-x,0px))_translateY(calc(var(--toast-swipe-movement-y,0px)-var(--toast-index)*0.75rem-var(--shrink)*var(--height)))_scale(var(--scale))_scale(var(--toast-pulse-scale,1))]",
          // Expanded: fan out
          "data-expanded:h-(--toast-height)",
          "data-expanded:transform-[translateX(var(--toast-swipe-movement-x,0px))_translateY(calc((var(--toast-offset-y)+var(--toast-index)*0.75rem)*-1+var(--toast-swipe-movement-y,0px)))_scale(var(--toast-pulse-scale,1))]",
          // Enter
          "data-starting-style:transform-[translateY(150%)]",
          // Exit (default)
          "data-ending-style:transform-[translateY(150%)] data-ending-style:opacity-0",
          // Exit (swipe directions)
          "data-ending-style:data-[swipe-direction=up]:transform-[translateY(calc(var(--toast-swipe-movement-y,0px)-150%))]",
          "data-ending-style:data-[swipe-direction=down]:transform-[translateY(calc(var(--toast-swipe-movement-y,0px)+150%))]",
          "data-ending-style:data-[swipe-direction=left]:transform-[translateX(calc(var(--toast-swipe-movement-x,0px)-150%))_translateY(calc((var(--toast-offset-y)+var(--toast-index)*0.75rem)*-1+var(--toast-swipe-movement-y,0px)))]",
          "data-ending-style:data-[swipe-direction=right]:transform-[translateX(calc(var(--toast-swipe-movement-x,0px)+150%))_translateY(calc((var(--toast-offset-y)+var(--toast-index)*0.75rem)*-1+var(--toast-swipe-movement-y,0px)))]",
          // Beyond limit
          "data-limited:opacity-0",
          // Gap hitbox for hover expansion
          "after:absolute after:top-full after:left-0 after:h-[calc(0.75rem+1px)] after:w-full after:content-['']",
        ],
        className,
      )}
      data-toast-root=""
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
        "overflow-hidden px-4 py-3 transition-opacity duration-250",
        "data-behind:opacity-0",
        "data-expanded:opacity-100",
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
  const { toasts } = ToastPrimitive.useToastManager<ToastData>();
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
