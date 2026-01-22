// Type declaration to fix React 19 compatibility with react-icons
// This makes react-icons components compatible with React 19's stricter JSX typing

declare module 'react-icons/md' {
  import { FC, SVGProps } from 'react';
  
  // Define icon component type that returns JSX.Element (required by React 19)
  type IconComponent = FC<SVGProps<SVGSVGElement>>;
  
  export const MdDashboard: IconComponent;
  export const MdVpnKey: IconComponent;
  export const MdLogout: IconComponent;
  export const MdPerson: IconComponent;
  export const MdClose: IconComponent;
  export const MdSave: IconComponent;
  export const MdError: IconComponent;
  export const MdCheckCircle: IconComponent;
  export const MdCancel: IconComponent;
  export const MdWarning: IconComponent;
  export const MdPhoneAndroid: IconComponent;
  export const MdArrowForward: IconComponent;
  export const MdTrendingUp: IconComponent;
  export const MdAdd: IconComponent;
  export const MdSearch: IconComponent;
  export const MdFilterList: IconComponent;
  export const MdVisibility: IconComponent;
  export const MdBlock: IconComponent;
  export const MdRefresh: IconComponent;
  export const MdArrowBack: IconComponent;
  export const MdEdit: IconComponent;
  export const MdBusiness: IconComponent;
  export const MdCalendarToday: IconComponent;
  export const MdPeople: IconComponent;
  export const MdAccessTime: IconComponent;
  export const MdLock: IconComponent;
  export const MdLogin: IconComponent;
}

