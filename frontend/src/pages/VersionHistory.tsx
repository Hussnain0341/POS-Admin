import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { posUpdatesAPI, POSVersion } from '../services/api';
import { 
  MdAccessTime, MdArrowBack, MdCheckCircle, MdCancel, MdWarning, 
  MdRefresh, MdVisibility, MdArrowBack as MdRollback, MdClose
} from 'react-icons/md';
import toast from 'react-hot-toast';

const VersionHistory: React.FC = () => {
  const navigate = useNavigate();
  const [versions, setVersions] = useState<POSVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchVersions();
  }, [filter]);

  const fetchVersions = async () => {
    try {
      setLoading(true);
      const response = await posUpdatesAPI.getAllVersions({
        status: filter !== 'all' ? filter : undefined,
        limit: 100
      });
      setVersions(response.versions || []);
    } catch (error) {
      console.error('Failed to fetch versions:', error);
      toast.error('Failed to load version history');
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async (version: string) => {
    if (!window.confirm(`Are you sure you want to publish version ${version}? This will make it live.`)) {
      return;
    }

    try {
      await posUpdatesAPI.publishVersion(version);
      toast.success('Version published successfully!');
      fetchVersions();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to publish version';
      toast.error(errorMessage);
    }
  };

  const handleArchive = async (version: string) => {
    if (!window.confirm(`Are you sure you want to archive version ${version}?`)) {
      return;
    }

    try {
      await posUpdatesAPI.archiveVersion(version);
      toast.success('Version archived successfully!');
      fetchVersions();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to archive version';
      toast.error(errorMessage);
    }
  };

  const handleDelete = async (version: string, filename: string) => {
    const confirmMessage = `⚠️ WARNING: This will permanently delete the version!\n\n` +
      `Version: ${version}\n` +
      `File: ${filename}\n\n` +
      `This action will:\n` +
      `• Permanently delete the version from the database\n` +
      `• Delete the installer file from the server\n` +
      `• Delete all associated update logs\n` +
      `• This action CANNOT be undone\n\n` +
      `Are you absolutely sure you want to delete this version?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    // Double confirmation
    if (!window.confirm('⚠️ FINAL WARNING: This will permanently delete the version. Type "DELETE" in the next prompt to confirm.')) {
      return;
    }

    const userInput = window.prompt('Type "DELETE" (all caps) to confirm deletion:');
    if (userInput !== 'DELETE') {
      toast.error('Deletion cancelled. You must type "DELETE" to confirm.');
      return;
    }

    try {
      await posUpdatesAPI.deleteVersion(version);
      toast.success('Version deleted successfully!');
      fetchVersions();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to delete version';
      toast.error(errorMessage);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      live: { icon: MdCheckCircle, color: 'bg-green-100 text-green-800', label: 'LIVE' },
      draft: { icon: MdWarning, color: 'bg-yellow-100 text-yellow-800', label: 'DRAFT' },
      archived: { icon: MdCancel, color: 'bg-gray-100 text-gray-800', label: 'ARCHIVED' },
      rollback: { icon: MdRollback, color: 'bg-red-100 text-red-800', label: 'ROLLBACK' }
    };

    const badge = badges[status as keyof typeof badges] || badges.draft;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg font-medium text-sm ${badge.color}`}>
        <Icon className="w-4 h-4" />
        {badge.label}
      </span>
    );
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
              onClick={() => navigate('/updates')}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <MdArrowBack className="w-6 h-6 text-gray-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <MdAccessTime className="w-8 h-8 text-blue-600" />
                Version History
              </h1>
              <p className="text-gray-600 mt-1">All uploaded POS versions</p>
            </div>
          </div>
          <button
            onClick={fetchVersions}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
          >
            <MdRefresh className="w-5 h-5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="px-8 py-4 bg-white border-b border-gray-200">
        <div className="flex gap-2">
          {['all', 'live', 'draft', 'archived', 'rollback'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        {versions.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <MdAccessTime className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">No versions found</p>
            <p className="text-sm text-gray-500 mt-2">
              {filter !== 'all' ? `No ${filter} versions available` : 'Upload your first version to get started'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Version
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Platform
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    File Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mandatory
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Uploaded
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {versions.map((version) => (
                  <tr key={version.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{version.version}</div>
                      {version.uploaded_by_username && (
                        <div className="text-xs text-gray-500">by {version.uploaded_by_username}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(version.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900 capitalize">{version.platform}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{formatFileSize(version.filesize)}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {version.mandatory ? (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                          Yes
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          No
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatDate(version.uploaded_at)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/updates/${version.id}`}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="View Details"
                        >
                          <MdVisibility className="w-5 h-5" />
                        </Link>
                        {version.status === 'draft' && (
                          <button
                            onClick={() => handlePublish(version.version)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                            title="Publish"
                          >
                            <MdCheckCircle className="w-5 h-5" />
                          </button>
                        )}
                        {version.status !== 'live' && version.status !== 'archived' && (
                          <button
                            onClick={() => handleArchive(version.version)}
                            className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition"
                            title="Archive"
                          >
                            <MdCancel className="w-5 h-5" />
                          </button>
                        )}
                        {version.status !== 'live' && (
                          <button
                            onClick={() => handleDelete(version.version, version.filename)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Delete Permanently"
                          >
                            <MdClose className="w-5 h-5" />
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
    </div>
  );
};

export default VersionHistory;

