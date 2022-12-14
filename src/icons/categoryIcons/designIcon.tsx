import React from 'react';
import { Icon } from '../../components/atoms/icon';

const designIcon = () => {
  return (
    <Icon
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="20" height="20" rx="10" fill="#A130FA" />
      <g clipPath="url(#clip0_5213_14532)">
        <path
          d="M10 5C7.8125 5 5.625 5.5625 5.625 6.875V13.125C5.625 14.4375 7.8125 15 10 15C12.1875 15 14.375 14.4375 14.375 13.125V6.875C14.375 5.5625 12.1875 5 10 5ZM10 6.25C11.75 6.25 12.75 6.625 13.0625 6.875C12.9375 7 12.5 7.1875 11.75 7.375C11.4375 7.4375 11.25 7.6875 11.25 8V10.625C11.25 11 11 11.25 10.625 11.25C10.25 11.25 10 11 10 10.625V8.125C10 7.8125 9.75 7.5 9.4375 7.5C8 7.4375 7.1875 7.0625 6.9375 6.875C7.25 6.625 8.25 6.25 10 6.25Z"
          fill="white"
        />
      </g>
      <defs>
        <clipPath id="clip0_5213_14532">
          <rect
            width="10"
            height="10"
            fill="white"
            transform="translate(5 5)"
          />
        </clipPath>
      </defs>
    </Icon>
  );
};

export default designIcon;
