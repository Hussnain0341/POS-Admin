import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { posUpdatesAPI, POSVersion } from '../services/api';
import { 
  MdAdd as MdUpdatesIcon, MdAdd, MdAccessTime, MdCheckCircle, 
  MdWarning, MdArrowBack, MdRefresh,
  MdLock, MdClose
} from 'react-icons/md';
import toast from 'react-hot-toast';

const Updates: React.FC = () => {
  const [liveVersion, setLiveVersion] = useState<POSVersion | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLiveVersion();
  }, []);

  const fetchLiveVersion = async () => {
    try {
      const response = await posUpdatesAPI.getAllVersions({ status: 'live', limit: 1 });
      if (response.versions && response.versions.length > 0) {
        setLiveVersion(response.versions[0]);
      } else {
        setLiveVersion(null);
      }
    } catch (error) {
      console.error('Failed to fetch live version:', error);
      toast.error('Failed to load live version');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLiveVersion = async () => {
    if (!liveVersion) return;

    const confirmMessage = `🚨 CRITICAL WARNING: You are about to delete the LIVE version!\n\n` +
      `Version: ${liveVersion.version}\n` +
      `File: ${liveVersion.filename}\n\n` +
      `⚠️ This will:\n` +
      `• Remove the currently active version\n` +
      `• POS clients will no longer be able to download updates\n` +
      `• Permanently delete the version from the database\n` +
      `• Delete the installer file from the server\n` +
      `• Delete all associated update logs\n` +
      `• This action CANNOT be undone\n\n` +
      `You should publish another version first if needed.\n\n` +
      `Are you absolutely sure you want to delete the LIVE version?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    // Enhanced confirmation for live versions
    if (!window.confirm('🚨 FINAL WARNING: You are about to delete the LIVE version!\n\nThis will remove the active version that POS clients are using.\n\nAre you absolutely certain?')) {
      return;
    }

    // Double confirmation
    if (!window.confirm('⚠️ FINAL WARNING: This will permanently delete the LIVE version. Type "DELETE" in the next prompt to confirm.')) {
      return;
    }

    const userInput = window.prompt('Type "DELETE" (all caps) to confirm deletion:');
    if (userInput !== 'DELETE') {
      toast.error('Deletion cancelled. You must type "DELETE" to confirm.');
      return;
    }

    try {
      await posUpdatesAPI.deleteVersion(liveVersion.version);
      toast.success('Live version deleted successfully! Make sure to publish another version if needed.');
      fetchLiveVersion();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to delete live version';
      toast.error(errorMessage);
    }
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
      month: 'long',
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
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <MdUpdatesIcon className="w-8 h-8 text-blue-600" />
              Updates & Maintenance
            </h1>
            <p className="text-gray-600 mt-1">Manage POS desktop application updates</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={fetchLiveVersion}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
            >
              <MdRefresh className="w-5 h-5" />
              Refresh
            </button>
            <Link
              to="/updates/upload"
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium shadow-md"
            >
              <MdAdd className="w-5 h-5" />
              Upload New Version
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        {/* Live Version Card */}
        <div className="bg-white rounded-xl shadow-sm border-2 border-green-200 p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-50 rounded-lg">
                <MdCheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Live Version</h2>
                <p className="text-sm text-gray-600">Currently deployed version</p>
              </div>
            </div>
            <div className="px-4 py-2 bg-green-100 text-green-800 rounded-lg font-semibold flex items-center gap-2">
              <MdCheckCircle className="w-5 h-5" />
              LIVE
            </div>
          </div>

          {liveVersion ? (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Version Number</label>
                    <p className="text-xl font-bold text-gray-900 mt-1">{liveVersion.version}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Release Date</label>
                    <p className="text-gray-900 mt-1">
                      {liveVersion.published_at ? formatDate(liveVersion.published_at) : formatDate(liveVersion.uploaded_at)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Platform</label>
                    <p className="text-gray-900 mt-1 capitalize">{liveVersion.platform}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">File Size</label>
                    <p className="text-gray-900 mt-1">{formatFileSize(liveVersion.filesize)}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                      Mandatory Update
                      {liveVersion.mandatory ? (
                        <MdLock className="w-4 h-4 text-red-600" />
                      ) : (
                        <MdCheckCircle className="w-4 h-4 text-gray-400" />
                      )}
                    </label>
                    <p className="text-gray-900 mt-1">
                      {liveVersion.mandatory ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 rounded-lg font-medium">
                          <MdLock className="w-4 h-4" />
                          YES
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-800 rounded-lg font-medium">
                          <MdCheckCircle className="w-4 h-4" />
                          NO
                        </span>
                      )}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                      SHA256 Checksum
                      <MdCheckCircle className="w-4 h-4 text-blue-600" />
                    </label>
                    <p className="text-xs font-mono text-gray-700 mt-1 break-all bg-gray-50 p-2 rounded">
                      {liveVersion.checksum_sha256}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Download URL</label>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="text"
                        value={liveVersion.download_url}
                        readOnly
                        className="flex-1 text-sm font-mono text-gray-700 bg-gray-50 border border-gray-200 rounded px-3 py-2"
                      />
                      <a
                        href={liveVersion.download_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                      >
                        <MdAdd className="w-5 h-5" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                <Link
                  to={`/updates/${liveVersion.id}`}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                >
                  View Details
                </Link>
                <button
                  onClick={handleDeleteLiveVersion}
                  className="px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 transition font-medium border-2 border-red-900 flex items-center gap-2"
                >
                  <MdClose className="w-5 h-5" />
                  Delete Live Version
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <MdWarning className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">No live version available</p>
              <p className="text-sm text-gray-500 mt-2">Upload and publish a version to make it live</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Link
            to="/updates/upload"
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition text-center group"
          >
            <div className="p-3 bg-blue-50 rounded-lg inline-flex mb-3 group-hover:bg-blue-100 transition">
              <MdAdd className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Upload New Version</h3>
            <p className="text-sm text-gray-600">Upload a new POS installer</p>
          </Link>

          <Link
            to="/updates/history"
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition text-center group"
          >
            <div className="p-3 bg-purple-50 rounded-lg inline-flex mb-3 group-hover:bg-purple-100 transition">
              <MdAccessTime className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Version History</h3>
            <p className="text-sm text-gray-600">View all versions</p>
          </Link>

          <Link
            to="/updates/logs"
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition text-center group"
          >
            <div className="p-3 bg-orange-50 rounded-lg inline-flex mb-3 group-hover:bg-orange-100 transition">
              <MdCheckCircle className="w-8 h-8 text-orange-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Update Logs</h3>
            <p className="text-sm text-gray-600">View audit logs</p>
          </Link>

          {liveVersion && (
            <Link
              to="/updates/history"
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition text-center group block"
            >
              <div className="p-3 bg-red-50 rounded-lg inline-flex mb-3 group-hover:bg-red-100 transition">
                <MdArrowBack className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Rollback Version</h3>
              <p className="text-sm text-gray-600">Rollback to previous version</p>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default Updates;

