import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { licensesAPI, License } from '../services/api';
import LicenseForm from '../components/LicenseForm';
import { MdAdd, MdSearch, MdFilterList, MdVisibility, MdBlock, MdRefresh, MdClose, MdVpnKey } from 'react-icons/md';
import toast from 'react-hot-toast';

const Licenses: React.FC = () => {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    tenantName: '',
    licenseKey: '',
  });
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchLicenses = async () => {
    try {
      setLoading(true);
      const data = await licensesAPI.getAll(filters);
      setLicenses(data.licenses);
      setTotal(data.total);
    } catch (error: any) {
      console.error('Failed to fetch licenses:', error);
      toast.error('Failed to load licenses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLicenses();
  }, []);

  const handleCreate = async (licenseData: Partial<License>) => {
    try {
      await licensesAPI.create(licenseData);
      setShowForm(false);
      toast.success('License created successfully!');
      fetchLicenses();
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Failed to create license';
      toast.error(errorMsg);
      throw error;
    }
  };

  const handleRevoke = async (id: string) => {
    if (!window.confirm('Are you sure you want to revoke this license? This action cannot be undone.')) {
      return;
    }
    try {
      await licensesAPI.revoke(id);
      toast.success('License revoked successfully');
      fetchLicenses();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to revoke license');
    }
  };

  const handleFilter = () => {
    fetchLicenses();
  };

  const handleResetFilters = () => {
    setFilters({ status: '', tenantName: '', licenseKey: '' });
    setSearchTerm('');
    setTimeout(() => fetchLicenses(), 100);
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

  const filteredLicenses = licenses.filter(license => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      license.licenseKey.toLowerCase().includes(term) ||
      license.tenantName.toLowerCase().includes(term) ||
      (license.plan && license.plan.toLowerCase().includes(term))
    );
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">License Management</h1>
            <p className="text-gray-600 mt-1">Create and manage licenses for POS software</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium shadow-md hover:shadow-lg"
          >
            {showForm ? (
              <>
                <MdClose className="w-5 h-5" />
                Cancel
              </>
            ) : (
              <>
                <MdAdd className="w-5 h-5" />
                Create License
              </>
            )}
          </button>
        </div>
      </div>

      <div className="p-8">
        {/* Create Form */}
        {showForm && (
          <div className="mb-8">
            <LicenseForm 
              onSubmit={handleCreate} 
              onCancel={() => setShowForm(false)} 
            />
          </div>
        )}

        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1 relative">
              <MdSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by license key, tenant name, or plan..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              onClick={handleFilter}
              className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition flex items-center gap-2"
            >
              <MdFilterList className="w-4 h-4" />
              Filter
            </button>
            <button
              onClick={handleResetFilters}
              className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
            >
              Reset
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="revoked">Revoked</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tenant Name</label>
              <input
                type="text"
                value={filters.tenantName}
                onChange={(e) => setFilters({ ...filters, tenantName: e.target.value })}
                placeholder="Filter by tenant..."
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">License Key</label>
              <input
                type="text"
                value={filters.licenseKey}
                onChange={(e) => setFilters({ ...filters, licenseKey: e.target.value })}
                placeholder="Filter by license key..."
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Licenses Table */}
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">All Licenses</h3>
                <p className="text-sm text-gray-600">Total: {total} licenses</p>
              </div>
              <button
                onClick={fetchLicenses}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                <MdRefresh className="w-4 h-4" />
                Refresh
              </button>
            </div>

            {filteredLicenses.length === 0 ? (
              <div className="text-center py-12">
                <MdVpnKey className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">No licenses found</p>
                <p className="text-sm text-gray-400 mt-1">
                  {searchTerm || Object.values(filters).some(f => f) 
                    ? 'Try adjusting your filters' 
                    : 'Create your first license to get started'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">License Key</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Tenant</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Plan</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Expiry</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Devices</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredLicenses.map((license) => (
                      <tr key={license.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link 
                            to={`/licenses/${license.id}`} 
                            className="text-blue-600 hover:text-blue-800 hover:underline font-mono font-medium"
                          >
                            {license.licenseKey}
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{license.tenantName}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-gray-600">{license.plan || '-'}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(license.status)}`}>
                            {license.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {new Date(license.expiryDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {license.maxDevices}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-3">
                            <Link
                              to={`/licenses/${license.id}`}
                              className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                            >
                              <MdVisibility className="w-4 h-4" />
                              View
                            </Link>
                            {license.status === 'active' && (
                              <button
                                onClick={() => handleRevoke(license.id)}
                                className="text-red-600 hover:text-red-800 flex items-center gap-1"
                              >
                                <MdBlock className="w-4 h-4" />
                                Revoke
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Licenses;
