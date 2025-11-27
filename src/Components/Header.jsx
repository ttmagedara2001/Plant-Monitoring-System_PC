import React from 'react';
import logo from '../assets/images/logo_title.png';
import imageIcon from '../assets/images/logo_plant.png';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../Context/AuthContext';
import { Sprout, LogOut, ChevronDown } from 'lucide-react';

const Header = ({ deviceId, deviceList }) => {
  const { userId, logout } = useAuth();
  const navigate = useNavigate();

  const handleDeviceSelect = (e) => {
    const newDevice = e.target.value;
    navigate(`/dashboard/${newDevice}`);
  };

  return (
    <header className="bg-white border-2 rounded-lg px-6 py-3 flex flex-col sm:flex-row justify-between items-center shadow-sm mb-6">
      
      {/* Logo */}
      <div className="flex items-center gap-2 mb-4 sm:mb-0">
        <Sprout className="h-8 w-8 text-green-600" />
        <span className="text-3xl font-bold tracking-wide font-mono">
          Agri<span className="text-yellow-400">Cop</span>
        </span>
      </div>

      {/* Device Selector Dropdown */}
      <div className="flex items-center gap-2 mb-4 sm:mb-0">
        <span className="text-sm font-semibold text-gray-700">Select Device:</span>
        <select 
          value={deviceId} 
          onChange={handleDeviceSelect}
          className="bg-gray-100 border border-gray-300 text-gray-700 py-1 px-3 rounded focus:ring-2 focus:ring-green-500 outline-none font-medium"
        >
          {deviceList.map(dev => 
            <option key={dev} value={dev}>{dev}</option>
          )}
        </select>
      </div>

      {/* User Info & Logout */}
      <div className="text-right text-xs">
        <div className="text-green-600 font-bold">Authentication: Successful</div>
        <div className="text-gray-600 font-mono">User: {userId}</div>
        <button onClick={logout} className="text-red-500 hover:underline mt-1 flex items-center justify-end gap-1 w-full">
          Logout <LogOut className="w-3 h-3" />
        </button>
      </div>
    </header>
  );
};

export default Header;