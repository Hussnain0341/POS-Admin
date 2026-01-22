import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { licensesAPI, License, Activation } from '../services/api';
import LicenseForm from '../components/LicenseForm';
import { MdArrowBack, MdEdit, MdBlock, MdCheckCircle, MdCancel, MdWarning, MdAccessTime, MdPhoneAndroid, MdVpnKey, MdBusiness, MdCalendarToday, MdPeople } from 'react-icons/md';
import toast from 'react-hot-toast';

const LicenseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [license, setLicense] = useState<License | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (id) {
      fetchLicense();
    }
  }, [id]);

  const fetchLicense = async () => {
    try {
      setLoading(true);
      const data = await licensesAPI.getById(id!);
      setLicense(data);
    } catch (error) {
      console.error('Failed to fetch license:', error);
      toast.error('Failed to load license details');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (data: Partial<License>) => {
    try {
      await licensesAPI.update(id!, data);
      setEditing(false);
      toast.success('License updated successfully!');
      fetchLicense();
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Failed to update license';
      toast.error(errorMsg);
      throw error;
    }
  };

  const handleRevoke = async () => {
    if (!window.confirm('Are you sure you want to revoke this license? This action cannot be undone.')) {
      return;
    }
    try {
      await licensesAPI.revoke(id!);
      toast.success('License revoked successfully');
      fetchLicense();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to revoke license');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'expired':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'revoked':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'suspended':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <MdCheckCircle className="w-5 h-5" />;
      case 'expired':
        return <MdWarning className="w-5 h-5" />;
      case 'revoked':
        return <MdCancel className="w-5 h-5" />;
      default:
        return <MdAccessTime className="w-5 h-5" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!license) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600 font-medium mb-4">License not found</p>
          <button
            onClick={() => navigate('/licenses')}
            className="text-blue-600 hover:underline"
          >
            Back to Licenses
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/licenses')}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <MdArrowBack className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">License Details</h1>
              <p className="text-gray-600 mt-1">View and manage license information</p>
            </div>
          </div>
          {!editing && (
            <div className="flex gap-3">
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium shadow-md"
              >
                <MdEdit className="w-4 h-4" />
                Edit License
              </button>
              {license.status === 'active' && (
                <button
                  onClick={handleRevoke}
                  className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium shadow-md"
                >
                  <MdBlock className="w-4 h-4" />
                  Revoke
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="p-8">
        {editing ? (
          <LicenseForm
            initialData={license}
            onSubmit={handleUpdate}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <div className="space-y-6">
            {/* License Info Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <MdVpnKey className="w-6 h-6 text-blue-600" />
                  License Information
                </h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">License Key</label>
                    <p className="text-lg font-mono font-semibold text-gray-900">{license.licenseKey}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tenant Name</label>
                    <p className="text-lg font-medium text-gray-900 flex items-center gap-2">
                      <MdBusiness className="w-4 h-4 text-gray-400" />
                      {license.tenantName}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Plan</label>
                    <p className="text-lg text-gray-900">{license.plan || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</label>
                    <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold border ${getStatusColor(license.status)}`}>
                      {getStatusIcon(license.status)}
                      {license.status}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Max Devices</label>
                    <p className="text-lg text-gray-900 flex items-center gap-2">
                      <MdPhoneAndroid className="w-4 h-4 text-gray-400" />
                      {license.maxDevices}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Max Users</label>
                    <p className="text-lg text-gray-900 flex items-center gap-2">
                      <MdPeople className="w-4 h-4 text-gray-400" />
                      {license.maxUsers}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Start Date</label>
                    <p className="text-lg text-gray-900 flex items-center gap-2">
                      <MdCalendarToday className="w-4 h-4 text-gray-400" />
                      {license.startDate ? new Date(license.startDate).toLocaleDateString() : '-'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Expiry Date</label>
                    <p className="text-lg text-gray-900 flex items-center gap-2">
                      <MdCalendarToday className="w-4 h-4 text-gray-400" />
                      {new Date(license.expiryDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Features */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Features</label>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <pre className="text-sm text-gray-700 font-mono whitespace-pre-wrap">
                      {JSON.stringify(license.features, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            </div>

            {/* Activations Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-purple-50 to-pink-50 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <MdPhoneAndroid className="w-6 h-6 text-purple-600" />
                  Device Activations
                  {license.activations && license.activations.length > 0 && (
                    <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                      {license.activations.length}
                    </span>
                  )}
                </h2>
              </div>
              <div className="p-6">
                {license.activations && license.activations.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Device ID</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Activated At</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Last Check</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {license.activations.map((activation: Activation) => (
                          <tr key={activation.id} className="hover:bg-gray-50 transition">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <code className="text-sm font-mono text-gray-700 bg-gray-100 px-2 py-1 rounded">
                                {activation.deviceId.substring(0, 16)}...
                              </code>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {new Date(activation.activatedAt).toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {new Date(activation.lastCheck).toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${
                                activation.status === 'active' 
                                  ? 'bg-green-100 text-green-800 border-green-200' 
                                  : 'bg-red-100 text-red-800 border-red-200'
                              }`}>
                                {activation.status === 'active' ? (
                                  <MdCheckCircle className="w-3 h-3" />
                                ) : (
                                  <MdCancel className="w-3 h-3" />
                                )}
                                {activation.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <MdPhoneAndroid className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 font-medium">No activations yet</p>
                    <p className="text-sm text-gray-400 mt-1">This license hasn't been activated on any device</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LicenseDetail;
