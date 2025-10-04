import React from 'react';

const Loader: React.FC<{ message: string }> = ({ message }) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 bg-gruvbox-light-bg-soft dark:bg-gruvbox-dark-bg-soft rounded-lg">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gruvbox-aqua mb-4"></div>
      <p className="text-lg font-semibold text-gruvbox-light-fg dark:text-gruvbox-dark-fg">{message}</p>
      <p className="text-sm text-gruvbox-gray-light dark:text-gruvbox-gray-dark mt-1">Please wait a moment...</p>
    </div>
  );
};

export default Loader;
