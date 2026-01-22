import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboardAPI, DashboardStats } from '../services/api';
import { MdDashboard, MdVpnKey, MdCheckCircle, MdCancel, MdWarning, MdPhoneAndroid, MdArrowForward, MdTrendingUp } from 'react-icons/md';
import toast from 'react-hot-toast';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await dashboardAPI.getStats();
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
        toast.error('Failed to load dashboard statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600 font-medium">Failed to load dashboard</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Licenses',
      value: stats.licenses.total_licenses,
      icon: MdVpnKey,
      color: 'blue',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
      borderColor: 'border-blue-200',
    },
    {
      title: 'Active Licenses',
      value: stats.licenses.active_licenses,
      icon: MdCheckCircle,
      color: 'green',
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
      borderColor: 'border-green-200',
    },
    {
      title: 'Expired Licenses',
      value: stats.licenses.expired_licenses,
      icon: MdWarning,
      color: 'orange',
      bgColor: 'bg-orange-50',
      iconColor: 'text-orange-600',
      borderColor: 'border-orange-200',
    },
    {
      title: 'Revoked Licenses',
      value: stats.licenses.revoked_licenses,
      icon: MdCancel,
      color: 'red',
      bgColor: 'bg-red-50',
      iconColor: 'text-red-600',
      borderColor: 'border-red-200',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <MdDashboard className="w-8 h-8 text-blue-600" />
              Dashboard
            </h1>
            <p className="text-gray-600 mt-1">License management overview</p>
          </div>
          <Link
            to="/licenses"
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium shadow-md hover:shadow-lg"
          >
            <MdVpnKey className="w-5 h-5" />
            Manage Licenses
            <MdArrowForward className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <div
                key={index}
                className={`bg-white rounded-xl shadow-sm border-2 ${card.borderColor} p-6 hover:shadow-md transition`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 ${card.bgColor} rounded-lg`}>
                    <Icon className={`w-6 h-6 ${card.iconColor}`} />
                  </div>
                  <MdTrendingUp className="w-5 h-5 text-gray-400" />
                </div>
                <h3 className="text-sm font-medium text-gray-600 mb-1">{card.title}</h3>
                <p className={`text-3xl font-bold ${card.iconColor}`}>{card.value}</p>
              </div>
            );
          })}
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active Devices Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Active Devices</h3>
              <div className="p-3 bg-purple-50 rounded-lg">
                <MdPhoneAndroid className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <p className="text-4xl font-bold text-purple-600 mb-2">{stats.activations.total_devices}</p>
            <p className="text-sm text-gray-600">Total devices currently activated</p>
          </div>

          {/* Quick Actions */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-sm border border-blue-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Link
                to="/licenses"
                className="block w-full px-4 py-3 bg-white rounded-lg hover:bg-blue-50 transition text-center font-medium text-gray-700 border border-gray-200"
              >
                View All Licenses
              </Link>
              <Link
                to="/licenses"
                className="block w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-center font-medium shadow-md"
              >
                Create New License
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
