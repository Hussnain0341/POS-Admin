import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { posUpdatesAPI, POSVersion } from '../services/api';
import { 
  MdArrowBack, MdCheckCircle, MdWarning, MdCancel, MdAdd, 
  MdArrowBack as MdRollback, MdLock, MdClose
} from 'react-icons/md';
import toast from 'react-hot-toast';

const VersionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [version, setVersion] = useState<POSVersion | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchVersion();
    }
  }, [id]);

  const fetchVersion = async () => {
    try {
      const data = await posUpdatesAPI.getVersionById(id!);
      setVersion(data);
    } catch (error) {
      console.error('Failed to fetch version:', error);
      toast.error('Failed to load version details');
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!version) return;
    
    if (!window.confirm(`Are you sure you want to publish version ${version.version}? This will make it live.`)) {
      return;
    }

    try {
      await posUpdatesAPI.publishVersion(version.version);
      toast.success('Version published successfully!');
      fetchVersion();
      navigate('/updates');
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to publish version';
      toast.error(errorMessage);
    }
  };

  const handleRollback = async () => {
    if (!version) return;
    
    if (!window.confirm(`Are you sure you want to rollback to version ${version.version}?`)) {
      return;
    }

    try {
      await posUpdatesAPI.rollbackVersion(version.version);
      toast.success('Rollback successful!');
      fetchVersion();
      navigate('/updates');
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to rollback';
      toast.error(errorMessage);
    }
  };

  const handleArchive = async () => {
    if (!version) return;
    
    if (!window.confirm(`Are you sure you want to archive version ${version.version}?`)) {
      return;
    }

    try {
      await posUpdatesAPI.archiveVersion(version.version);
      toast.success('Version archived successfully!');
      fetchVersion();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to archive version';
      toast.error(errorMessage);
    }
  };

  const handleDelete = async () => {
    if (!version) return;

    const confirmMessage = `⚠️ WARNING: This will permanently delete the version!\n\n` +
      `Version: ${version.version}\n` +
      `File: ${version.filename}\n` +
      `Status: ${version.status}\n\n` +
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
      await posUpdatesAPI.deleteVersion(version.version);
      toast.success('Version deleted successfully!');
      navigate('/updates/history');
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to delete version';
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
      <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold ${badge.color}`}>
        <Icon className="w-5 h-5" />
        {badge.label}
      </span>
    );
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

  if (!version) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600 font-medium">Version not found</p>
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
              onClick={() => navigate('/updates/history')}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <MdArrowBack className="w-6 h-6 text-gray-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Version {version.version}</h1>
              <p className="text-gray-600 mt-1">Version details and management</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {getStatusBadge(version.status)}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-8 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Basic Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Version Number</label>
                  <p className="text-lg font-bold text-gray-900 mt-1">{version.version}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Platform</label>
                  <p className="text-lg font-bold text-gray-900 mt-1 capitalize">{version.platform}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">File Name</label>
                  <p className="text-gray-900 mt-1 font-mono text-sm">{version.filename}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">File Size</label>
                  <p className="text-gray-900 mt-1">{formatFileSize(version.filesize)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Uploaded At</label>
                  <p className="text-gray-900 mt-1">{formatDate(version.uploaded_at)}</p>
                </div>
                {version.published_at && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Published At</label>
                    <p className="text-gray-900 mt-1">{formatDate(version.published_at)}</p>
                  </div>
                )}
                {version.uploaded_by_username && (
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-gray-600">Uploaded By</label>
                    <p className="text-gray-900 mt-1">{version.uploaded_by_username}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Security Information */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <MdCheckCircle className="w-6 h-6 text-blue-600" />
                Security Information
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    SHA256 Checksum
                  </label>
                  <p className="text-xs font-mono text-gray-700 mt-1 break-all bg-gray-50 p-3 rounded border border-gray-200">
                    {version.checksum_sha256}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    Mandatory Update
                    {version.mandatory ? (
                      <MdLock className="w-4 h-4 text-red-600" />
                    ) : (
                      <MdCheckCircle className="w-4 h-4 text-gray-400" />
                    )}
                  </label>
                  <p className="text-gray-900 mt-1">
                    {version.mandatory ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 rounded-lg font-medium">
                        <MdLock className="w-4 h-4" />
                        Yes - All POS clients must update
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-800 rounded-lg font-medium">
                        <MdCheckCircle className="w-4 h-4" />
                        No - Optional update
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Release Notes */}
            {version.release_notes && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Release Notes</h2>
                <div className="prose max-w-none">
                  <p className="text-gray-700 whitespace-pre-wrap">{version.release_notes}</p>
                </div>
              </div>
            )}

            {/* Download URL */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Download URL</h2>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={version.download_url}
                  readOnly
                  className="flex-1 text-sm font-mono text-gray-700 bg-gray-50 border border-gray-200 rounded px-3 py-2"
                />
                <a
                  href={version.download_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                >
                  <MdAdd className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>

          {/* Actions Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Actions</h2>
              <div className="space-y-3">
                {version.status === 'draft' && (
                  <button
                    onClick={handlePublish}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
                  >
                    <MdCheckCircle className="w-5 h-5" />
                    Publish Now
                  </button>
                )}
                {version.status !== 'live' && version.status !== 'archived' && (
                  <button
                    onClick={handleRollback}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition font-medium"
                  >
                    <MdRollback className="w-5 h-5" />
                    Rollback to This Version
                  </button>
                )}
                {version.status !== 'live' && version.status !== 'archived' && (
                  <button
                    onClick={handleArchive}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-medium"
                  >
                    <MdCancel className="w-5 h-5" />
                    Archive
                  </button>
                )}
                {version.status !== 'live' && (
                  <button
                    onClick={handleDelete}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
                  >
                    <MdClose className="w-5 h-5" />
                    Delete Permanently
                  </button>
                )}
                <Link
                  to="/updates/logs"
                  className="block w-full text-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                >
                  View Update Logs
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VersionDetail;

