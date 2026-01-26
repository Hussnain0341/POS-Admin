import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { posUpdatesAPI } from '../services/api';
import { MdAdd, MdArrowBack, MdCheckCircle, MdWarning, MdLock } from 'react-icons/md';
import toast from 'react-hot-toast';

const UploadVersion: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    version: '',
    platform: 'windows',
    mandatory: false,
    releaseNotes: '',
    confirmed: false
  });
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file extension
      if (!selectedFile.name.toLowerCase().endsWith('.exe')) {
        toast.error('Only .exe installer files are allowed');
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      toast.error('Please select an installer file');
      return;
    }

    if (!formData.confirmed) {
      toast.error('Please confirm that this version is tested and safe');
      return;
    }

    setLoading(true);
    setUploadProgress(0);

    try {
      const uploadFormData = new FormData();
      uploadFormData.append('installer', file);
      uploadFormData.append('version', formData.version);
      uploadFormData.append('platform', formData.platform);
      uploadFormData.append('mandatory', formData.mandatory.toString());
      if (formData.releaseNotes) {
        uploadFormData.append('releaseNotes', formData.releaseNotes);
      }

      // Simulate progress (actual upload will be handled by axios)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const response = await posUpdatesAPI.uploadVersion(uploadFormData);
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      toast.success('Version uploaded successfully!');
      
      // Ask if user wants to publish now
      if (window.confirm('Version uploaded successfully! Do you want to publish it now?')) {
        navigate(`/updates/${response.version.id}`);
      } else {
        navigate('/updates/history');
      }
    } catch (error: any) {
      setUploadProgress(0);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to upload version';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

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
                <MdAdd className="w-8 h-8 text-blue-600" />
                Upload New Version
              </h1>
              <p className="text-gray-600 mt-1">Upload a new POS desktop installer</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-8 max-w-4xl mx-auto">
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          {/* Version Number */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Version Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.version}
              onChange={(e) => setFormData({ ...formData, version: e.target.value })}
              placeholder="e.g., 1.2.3"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">Version must be unique (e.g., 1.2.3, 2.0.0)</p>
          </div>

          {/* Platform */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Platform
            </label>
            <select
              value={formData.platform}
              onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="windows">Windows</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">Currently only Windows is supported</p>
          </div>

          {/* File Upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Installer File (.exe) <span className="text-red-500">*</span>
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition">
              <input
                type="file"
                accept=".exe"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
                required
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center"
              >
                <MdAdd className="w-12 h-12 text-gray-400 mb-3" />
                <span className="text-sm font-medium text-gray-700">
                  {file ? file.name : 'Click to select installer file'}
                </span>
                <span className="text-xs text-gray-500 mt-1">
                  Only .exe files are allowed (Max 500MB)
                </span>
              </label>
            </div>
            {file && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg flex items-center gap-2">
                <MdCheckCircle className="w-5 h-5 text-blue-600" />
                <span className="text-sm text-gray-700">
                  Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </span>
              </div>
            )}
          </div>

          {/* Upload Progress */}
          {uploadProgress > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Upload Progress</span>
                <span className="text-sm text-gray-600">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Mandatory Update */}
          <div className="mb-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.mandatory}
                onChange={(e) => setFormData({ ...formData, mandatory: e.target.checked })}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div className="flex items-center gap-2">
                {formData.mandatory ? (
                  <MdLock className="w-5 h-5 text-red-600" />
                ) : (
                  <MdCheckCircle className="w-5 h-5 text-gray-400" />
                )}
                <span className="text-sm font-medium text-gray-700">
                  Mandatory Update
                </span>
              </div>
            </label>
            <p className="text-xs text-gray-500 mt-1 ml-8">
              If checked, all POS clients will be forced to update to this version
            </p>
          </div>

          {/* Release Notes */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Release Notes (Optional)
            </label>
            <textarea
              value={formData.releaseNotes}
              onChange={(e) => setFormData({ ...formData, releaseNotes: e.target.value })}
              rows={4}
              placeholder="Describe what's new in this version..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Confirmation Checkbox */}
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.confirmed}
                onChange={(e) => setFormData({ ...formData, confirmed: e.target.checked })}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-0.5"
                required
              />
              <div>
                <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <MdWarning className="w-5 h-5 text-yellow-600" />
                  I confirm this version is tested and safe
                </span>
                <p className="text-xs text-gray-600 mt-1">
                  By checking this, you confirm that the installer has been tested and is safe to deploy
                </p>
              </div>
            </label>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <MdAdd className="w-5 h-5" />
                  Upload Version
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => navigate('/updates')}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UploadVersion;

