import React, { useState, useEffect } from 'react';
import { License } from '../services/api';
import { MdClose, MdSave, MdError } from 'react-icons/md';
import toast from 'react-hot-toast';

interface LicenseFormProps {
  onSubmit: (data: Partial<License>) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<License>;
}

const LicenseForm: React.FC<LicenseFormProps> = ({ onSubmit, onCancel, initialData }) => {
  const [formData, setFormData] = useState({
    tenantName: initialData?.tenantName || '',
    plan: initialData?.plan || '',
    maxDevices: initialData?.maxDevices || 1,
    maxUsers: initialData?.maxUsers || 1,
    expiryDate: initialData?.expiryDate || '',
    startDate: initialData?.startDate || '',
    features: initialData?.features || { reports: true, profitLoss: true },
    licenseKey: initialData?.licenseKey || '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [jsonError, setJsonError] = useState('');

  // Auto-set start date to today if creating new license
  useEffect(() => {
    if (!initialData && !formData.startDate) {
      const today = new Date().toISOString().split('T')[0];
      setFormData(prev => ({ ...prev, startDate: today }));
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setJsonError('');

    // Validate JSON if features field was edited
    try {
      const featuresObj = typeof formData.features === 'string' 
        ? JSON.parse(formData.features) 
        : formData.features;
      
      // Prepare data - don't send licenseKey if it's empty (let backend generate)
      const submitData: any = {
        tenantName: formData.tenantName.trim(),
        plan: formData.plan.trim() || undefined,
        maxDevices: formData.maxDevices,
        maxUsers: formData.maxUsers,
        expiryDate: formData.expiryDate,
        startDate: formData.startDate || undefined,
        features: featuresObj,
      };

      // Only include licenseKey if it's provided (for manual entry)
      if (formData.licenseKey.trim()) {
        submitData.licenseKey = formData.licenseKey.trim();
      }

      setIsSubmitting(true);
      await onSubmit(submitData);
      toast.success(initialData ? 'License updated successfully!' : 'License created successfully!');
    } catch (error: any) {
      if (error.message?.includes('JSON')) {
        setJsonError('Invalid JSON format in features field');
      } else {
        toast.error(error.response?.data?.error || error.message || 'Failed to save license');
      }
      setIsSubmitting(false);
    }
  };

  const handleFeaturesChange = (value: string) => {
    try {
      const parsed = JSON.parse(value);
      setFormData({ ...formData, features: parsed });
      setJsonError('');
    } catch (err) {
      setFormData({ ...formData, features: value as any });
      setJsonError('Invalid JSON');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800">
            {initialData ? 'Edit License' : 'Create New License'}
          </h2>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-200 rounded-full transition"
            type="button"
          >
            <MdClose className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Tenant Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.tenantName}
              onChange={(e) => setFormData({ ...formData, tenantName: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              placeholder="Enter shop or company name"
              required
            />
          </div>

          {!initialData && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                License Key
                <span className="text-gray-500 text-xs font-normal ml-2">(Leave empty to auto-generate)</span>
              </label>
              <input
                type="text"
                value={formData.licenseKey}
                onChange={(e) => setFormData({ ...formData, licenseKey: e.target.value })}
                placeholder="HK-XXXX-XXXX-XXXX"
                pattern="HK-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition font-mono"
              />
              <p className="mt-1 text-xs text-gray-500">Format: HK-XXXX-XXXX-XXXX</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Plan</label>
            <select
              value={formData.plan}
              onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            >
              <option value="">Select Plan</option>
              <option value="Basic">Basic</option>
              <option value="Pro">Pro</option>
              <option value="Enterprise">Enterprise</option>
              <option value="Trial">Trial</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Max Devices <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={formData.maxDevices}
              onChange={(e) => setFormData({ ...formData, maxDevices: parseInt(e.target.value) || 1 })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Max Users <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={formData.maxUsers}
              onChange={(e) => setFormData({ ...formData, maxUsers: parseInt(e.target.value) || 1 })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Start Date</label>
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Expiry Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.expiryDate}
              onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
              min={formData.startDate || new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Features (JSON)
          </label>
          <textarea
            value={typeof formData.features === 'string' ? formData.features : JSON.stringify(formData.features, null, 2)}
            onChange={(e) => handleFeaturesChange(e.target.value)}
            rows={6}
            className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition font-mono text-sm ${
              jsonError ? 'border-red-300 bg-red-50' : 'border-gray-300'
            }`}
            placeholder='{"reports": true, "profitLoss": true, "inventory": true}'
          />
          {jsonError && (
            <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
              <MdError className="w-4 h-4" />
              {jsonError}
            </p>
          )}
          <p className="mt-1 text-xs text-gray-500">Enter valid JSON format for feature flags</p>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium text-gray-700"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !!jsonError}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <MdSave className="w-4 h-4" />
            {isSubmitting ? 'Saving...' : initialData ? 'Update License' : 'Create License'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default LicenseForm;
