// eslint-disable-next-line import/no-extraneous-dependencies
import clsx from "clsx";
import type { ComponentPropsWithoutRef } from "react";

export type IconProps = ComponentPropsWithoutRef<"svg"> & {
  label?: string;
};

export const Icon: React.FC<IconProps> = ({ label, ...props }) => {
  const _viewBox = props.viewBox ?? fallbackIcon.viewBox;
  const _path = (props.children ?? fallbackIcon.path) as string;

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
  const className = clsx(props.className);

  // eslint-disable-next-line no-param-reassign, @typescript-eslint/no-unsafe-assignment
  props = { ...props, viewBox: _viewBox, children: _path, className };

  // For accessibility - https://allyjs.io/tutorials/focusing-in-svg.html#making-svg-elements-focusable
  return (
    <>
      <span className="sr-only">{label}</span>
      <svg aria-hidden="true" focusable="false" {...props} />
    </>
  );
};

export const fallbackIcon = {
  viewBox: "0 0 24 24",
  path: (
    <g stroke="currentColor" strokeWidth="1.5">
      <path
        fill="none"
        strokeLinecap="round"
        d="M9,9a3,3,0,1,1,4,2.829,1.5,1.5,0,0,0-1,1.415V14.25"
      />
      <path
        fill="currentColor"
        strokeLinecap="round"
        d="M12,17.25a.375.375,0,1,0,.375.375A.375.375,0,0,0,12,17.25h0"
      />
      <circle fill="none" strokeMiterlimit="10" cx="12" cy="12" r="11.25" />
    </g>
  ),
};
