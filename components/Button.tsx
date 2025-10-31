
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  fullWidth?: boolean;
}

const Button: React.FC<ButtonProps> = ({ children, fullWidth = false, ...props }) => {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 px-5 py-3 text-base font-medium text-center text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-900 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors ${fullWidth ? 'w-full' : ''}`}
    >
      {children}
    </button>
  );
};

export default Button;
