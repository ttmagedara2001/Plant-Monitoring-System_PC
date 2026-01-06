import React, { useState, useEffect } from 'react';

const DefaultIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V9m6 8V5m-3 12V13" />
  </svg>
);

const PageHeader = ({
  title = 'Title',
  subtitle = '',
  deviceId = '',
  showDate = true,
  showDevice = true,
  icon = null,
}) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    if (!showDate) return;
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, [showDate]);

  return (
    <div className="mt-2 sm:mt-3 mb-2 sm:mb-3 mx-auto justify-center z-50">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
        {/* Left: Icon and Title */}
        <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
          <div className="bg-indigo-50 text-indigo-600 rounded-lg p-1.5 sm:p-2 md:p-3">
            {icon || <DefaultIcon />}
          </div>
          <div>
            <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-800">{title}</h1>
            {subtitle && <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">{subtitle}</p>}
          </div>
        </div>

        {/* Right: Device ID and Clock */}
        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4 md:gap-6 lg:gap-20">
          {showDevice && (
            <div className="flex items-center gap-1">
              <span className="text-[10px] sm:text-xs text-gray-500 hidden sm:inline">Device ID:</span>
              <div className="bg-purple-200 text-gray-800 text-[10px] sm:text-xs md:text-sm px-2 sm:px-3 md:px-5 py-0.5 sm:py-1 rounded-full truncate max-w-[100px] sm:max-w-[140px] md:max-w-none">{deviceId || '—'}</div>
            </div>
          )}
          
          {showDate && (
            <div className="flex flex-col items-end">
              <div className="text-base sm:text-lg md:text-xl lg:text-2xl font-semibold text-gray-800">{now.toLocaleString([], { hour: '2-digit', minute: '2-digit' })}</div>
              <div className="text-[10px] sm:text-xs md:text-sm lg:text-base font-medium text-gray-600">
              {now.toLocaleString([], {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PageHeader;
