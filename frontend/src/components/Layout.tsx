import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { MdDashboard, MdVpnKey, MdLogout, MdPerson, MdAdd } from 'react-icons/md';

const Layout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-gradient-to-b from-gray-900 to-gray-800 text-white shadow-xl">
        <div className="flex flex-col h-full">
          {/* Logo/Header */}
          <div className="p-6 border-b border-gray-700">
            <h1 className="text-2xl font-bold text-white mb-1">HisaabKitab</h1>
            <p className="text-sm text-gray-400">License Admin System</p>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            <Link
              to="/dashboard"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                isActive('/dashboard') 
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <MdDashboard className="w-5 h-5" />
              <span className="font-medium">Dashboard</span>
            </Link>
            <Link
              to="/licenses"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                isActive('/licenses') || location.pathname.startsWith('/licenses/')
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <MdVpnKey className="w-5 h-5" />
              <span className="font-medium">Licenses</span>
            </Link>
            <Link
              to="/updates"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                isActive('/updates') || location.pathname.startsWith('/updates/')
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <MdAdd className="w-5 h-5" />
              <span className="font-medium">Updates & Maintenance</span>
            </Link>
          </nav>

          {/* User Section */}
          <div className="p-4 border-t border-gray-700">
            <div className="flex items-center gap-3 mb-4 p-3 bg-gray-800 rounded-lg">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                <MdPerson className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user.username || 'Admin'}</p>
                <p className="text-xs text-gray-400 truncate capitalize">{user.role || 'Administrator'}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 rounded-lg transition text-sm font-medium"
            >
              <MdLogout className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64">
        <Outlet />
      </div>
    </div>
  );
};

export default Layout;
