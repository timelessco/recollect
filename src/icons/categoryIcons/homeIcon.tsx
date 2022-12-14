import React from 'react';
import { Icon } from '../../components/atoms/icon';

const HomeIcon = () => {
  return (
    <Icon
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="20" height="20" rx="10" fill="#20C5A0" />
      <path
        d="M14.2857 15C14.7143 15 15 14.7254 15 14.3136V8.13573C15 7.9298 14.9286 7.72387 14.7143 7.58658L10.4286 4.15445C10.1429 3.94852 9.78571 3.94852 9.5 4.15445L5.21429 7.58658C5.07143 7.72387 5 7.9298 5 8.13573V14.3136C5 14.7254 5.28571 15 5.71429 15H8.57143V12.9964C8.57143 12.2075 9.21102 11.5679 10 11.5679C10.789 11.5679 11.4286 12.2075 11.4286 12.9964V15H14.2857Z"
        fill="white"
      />
    </Icon>
  );
};

export default HomeIcon;
