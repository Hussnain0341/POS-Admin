import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { posUpdatesAPI, UpdateLog } from '../services/api';
import { MdCheckCircle, MdArrowBack, MdRefresh, MdCancel } from 'react-icons/md';
import toast from 'react-hot-toast';

const UpdateLogs: React.FC = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<UpdateLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await posUpdatesAPI.getLogs(undefined, 1, 100);
      setLogs(response.logs || []);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
      toast.error('Failed to load update logs');
    } finally {
      setLoading(false);
    }
  };

  const getActionBadge = (action: string) => {
    const badges = {
      UPLOAD: { color: 'bg-blue-100 text-blue-800', label: 'UPLOAD' },
      PUBLISH: { color: 'bg-green-100 text-green-800', label: 'PUBLISH' },
      ROLLBACK: { color: 'bg-orange-100 text-orange-800', label: 'ROLLBACK' },
      ARCHIVE: { color: 'bg-gray-100 text-gray-800', label: 'ARCHIVE' },
      SET_LIVE: { color: 'bg-purple-100 text-purple-800', label: 'SET LIVE' }
    };

    const badge = badges[action as keyof typeof badges] || badges.UPLOAD;

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-lg font-medium text-sm ${badge.color}`}>
        {badge.label}
      </span>
    );
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
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
                <MdCheckCircle className="w-8 h-8 text-blue-600" />
                Update Logs
              </h1>
              <p className="text-gray-600 mt-1">Audit trail of all update management actions</p>
            </div>
          </div>
          <button
            onClick={fetchLogs}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
          >
            <MdRefresh className="w-5 h-5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        {logs.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <MdCheckCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">No logs found</p>
            <p className="text-sm text-gray-500 mt-2">Update logs will appear here as actions are performed</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Admin User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Version
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Message
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatDate(log.created_at)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {log.admin_username || 'System'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getActionBadge(log.action)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {log.version ? (
                        <Link
                          to={`/updates/history`}
                          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                        >
                          {log.version}
                        </Link>
                      ) : (
                        <span className="text-sm text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {log.status === 'SUCCESS' ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium bg-green-100 text-green-800">
                          <MdCheckCircle className="w-4 h-4" />
                          SUCCESS
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium bg-red-100 text-red-800">
                          <MdCancel className="w-4 h-4" />
                          FAILED
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{log.message || '-'}</div>
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

export default UpdateLogs;

