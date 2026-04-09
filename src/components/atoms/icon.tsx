import type { ComponentPropsWithoutRef, FC } from "react";

import { cn } from "@/utils/tailwind-merge";

export type IconProps = ComponentPropsWithoutRef<"svg"> & {
  label?: string;
};

export const Icon: FC<IconProps> = ({ label, ...props }) => {
  const _viewBox = props.viewBox ?? fallbackIcon.viewBox;
  const _path = props.children ?? fallbackIcon.path;

  const className = cn(props.className);

  // oxlint-disable-next-line no-param-reassign
  props = { ...props, children: _path, className, viewBox: _viewBox };

  // For accessibility - https://allyjs.io/tutorials/focusing-in-svg.html#making-svg-elements-focusable
  return (
    <>
      <span className="sr-only">{label}</span>
      <svg aria-hidden="true" focusable="false" {...props} />
    </>
  );
};

export const fallbackIcon = {
  path: (
    <g stroke="currentColor" strokeWidth="1.5">
      <path
        d="M9,9a3,3,0,1,1,4,2.829,1.5,1.5,0,0,0-1,1.415V14.25"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M12,17.25a.375.375,0,1,0,.375.375A.375.375,0,0,0,12,17.25h0"
        fill="currentColor"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" fill="none" r="11.25" strokeMiterlimit="10" />
    </g>
  ),
  viewBox: "0 0 24 24",
};
