import React from 'react';
import { Icon } from '../../components/atoms/icon';

const CodeIcon = () => {
  return (
    <Icon
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="18" height="18" rx="9" fill="#00111D" />
      <path
        d="M8.775 8.475L5.025 4.725C4.725 4.425 4.275 4.425 3.975 4.725C3.675 5.025 3.675 5.475 3.975 5.775L7.2 9L3.975 12.225C3.675 12.525 3.675 12.975 3.975 13.275C4.125 13.425 4.275 13.5 4.5 13.5C4.725 13.5 4.875 13.425 5.025 13.275L8.775 9.525C9.075 9.225 9.075 8.775 8.775 8.475Z"
        fill="white"
      />
      <path d="M14.25 12H9V13.5H14.25V12Z" fill="white" />
    </Icon>
  );
};

export default CodeIcon;
