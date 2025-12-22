import React, { useState, useEffect } from 'react';

const DefaultIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
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
    <div className="mb-6 mx-auto justify-center z-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-50 text-indigo-600 rounded-lg p-3">
            {icon || <DefaultIcon />}
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">{title}</h1>
            {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {showDate && (
            <div className="text-xl font-semibold text-gray-800">
              {now.toLocaleString([], {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          )}

          {showDevice && (
            <div className="flex items-center gap-3 ml-4">
              <span className="text-sm text-gray-500">Device ID</span>
              <div className="bg-gray-100 text-gray-800 text-sm px-3 py-1 rounded-full">{deviceId || '—'}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PageHeader;
