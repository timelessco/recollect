import { ComponentPropsWithoutRef } from 'react';
import clsx from 'clsx';

export type IconProps = ComponentPropsWithoutRef<'svg'> & {
  label?: string;
};

export const Icon: React.FC<IconProps> = ({ label, ...props }) => {
  const _viewBox = props.viewBox ?? fallbackIcon.viewBox;
  const _path = (props.children ?? fallbackIcon.path) as string;
  const className = clsx(
    // 'w-[1em] h-[1em] inline-block leading-[1em] shrink-0 text-current align-middle',
    props.className
  );

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
  viewBox: '0 0 24 24',
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
