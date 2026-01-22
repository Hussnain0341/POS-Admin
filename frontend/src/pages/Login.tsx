import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { MdVpnKey, MdLock, MdLogin, MdCheckCircle, MdArrowBack } from 'react-icons/md';
import toast from 'react-hot-toast';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'password' | '2fa'>('password');
  const [tempToken, setTempToken] = useState('');
  const [code, setCode] = useState('');
  const [codeLoading, setCodeLoading] = useState(false);
  const [twoFAEmail, setTwoFAEmail] = useState('hussnain0341@gmail.com');
  const navigate = useNavigate();

  const handlePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    // CRITICAL: Prevent default form submission immediately
    e.preventDefault();
    e.stopPropagation();
    
    // Prevent double submission
    if (loading) {
      console.log('Already processing, ignoring duplicate submit');
      return;
    }
    
    console.log('=== LOGIN FORM SUBMITTED ===');
    console.log('Username:', username);
    console.log('Password length:', password.length);
    console.log('Loading state before:', loading);
    
    if (!username.trim() || !password.trim()) {
      toast.error('Please enter both username and password', { id: 'login-toast' });
      return;
    }
    
    setLoading(true);
    console.log('Loading state set to true');
    
    // Show immediate feedback
    toast.loading('Processing login...', { id: 'login-toast' });
    
    try {
      console.log('Calling authAPI.login...');
      const data = await authAPI.login({ username, password });
      console.log('Login response received:', data);
      
      toast.dismiss('login-toast');
      
      // 2FA is enabled - expect require2FA response
      if (data.require2FA && data.tempToken) {
        console.log('2FA required, switching to 2FA step');
        setTempToken(data.tempToken);
        if (data.email) setTwoFAEmail(data.email);
        setStep('2fa');
        toast.success(data.message || 'Verification code sent to your email.', { id: 'login-toast' });
      } else if (data.token) {
        // Direct token (if 2FA is disabled in backend)
        console.log('Token received, navigating to dashboard');
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        toast.success('Login successful!', { id: 'login-toast' });
        setTimeout(() => {
          navigate('/dashboard');
        }, 500);
      } else {
        console.error('Unexpected response:', data);
        toast.error('Unexpected response from server. Please try again.', { id: 'login-toast' });
      }
    } catch (err: any) {
      console.error('=== LOGIN ERROR ===');
      console.error('Error object:', err);
      console.error('Error message:', err.message);
      console.error('Error response:', err.response);
      console.error('Error request:', err.request);
      
      toast.dismiss('login-toast');
      
      let errorMessage = 'Login failed. Please check your credentials and try again.';
      
      if (err.response) {
        // Server responded with error
        console.error('Server error status:', err.response.status);
        console.error('Server error data:', err.response.data);
        errorMessage = err.response.data?.error || `Server error: ${err.response.status}`;
        
        // Handle rate limiting
        if (err.response.status === 429) {
          errorMessage = 'Too many login attempts. Please wait a few minutes and try again, or restart the backend server.';
        }
        
        // Handle service unavailable (usually SMTP not configured)
        if (err.response.status === 503) {
          const detail = err.response.data?.detail;
          if (detail) {
            errorMessage = `Email service error: ${detail}. Please configure SMTP in backend/.env or check database setup.`;
          } else {
            errorMessage = 'Service unavailable. Check if SMTP is configured in backend/.env or if database tables are set up correctly.';
          }
        }
      } else if (err.request) {
        // Request was made but no response
        console.error('No response from server - backend might be down');
        errorMessage = 'Cannot connect to server. Make sure the backend is running on http://localhost:3001';
      } else {
        // Something else happened
        console.error('Other error:', err.message);
        errorMessage = err.message || errorMessage;
      }
      
      toast.error(errorMessage, { duration: 5000, id: 'login-toast' });
    } finally {
      console.log('Setting loading to false');
      setLoading(false);
    }
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCodeLoading(true);
    try {
      const data = await authAPI.verify2FA(tempToken, code);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      toast.success('Login successful!');
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Invalid or expired code. Please try again.');
    } finally {
      setCodeLoading(false);
    }
  };

  const goBack = () => {
    setStep('password');
    setTempToken('');
    setCode('');
  };

  // Step 2: 2FA code entry
  if (step === '2fa') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl mb-4 shadow-lg">
              <MdCheckCircle className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Two-Factor Verification</h1>
            <p className="text-gray-600 text-sm">
              We sent a 6-digit code to <span className="font-semibold text-indigo-600">{twoFAEmail}</span>. Enter it below.
            </p>
          </div>

          <form onSubmit={handle2FASubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Verification Code</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                className="w-full text-center text-2xl tracking-[0.4em] font-mono py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="000000"
                required
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={codeLoading || code.length !== 6}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-3 rounded-lg hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-semibold shadow-lg"
            >
              {codeLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Verifying...
                </>
              ) : (
                <>
                  <MdLogin className="w-5 h-5" />
                  Verify & Sign In
                </>
              )}
            </button>

            <button
              type="button"
              onClick={goBack}
              className="w-full flex items-center justify-center gap-2 text-gray-500 hover:text-gray-700 py-2"
            >
              <MdArrowBack className="w-5 h-5" />
              Back to login
            </button>
          </form>

          <p className="mt-6 pt-6 border-t border-gray-200 text-xs text-center text-gray-500">
            Code expires in 10 minutes. If you didn’t receive it, go back and log in again to resend.
          </p>
        </div>
      </div>
    );
  }

  // Step 1: Username & password
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl mb-4 shadow-lg">
            <MdVpnKey className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">HisaabKitab</h1>
          <p className="text-gray-600">License Admin System</p>
        </div>

        <form 
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            return false;
          }} 
          className="space-y-6" 
          noValidate
        >
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Username</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MdLock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                placeholder="Enter your username"
                required
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MdLock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                placeholder="Enter your password"
                required
              />
            </div>
          </div>

          <button
            type="button"
            onClick={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              e.nativeEvent.stopImmediatePropagation();
              
              console.log('=== BUTTON CLICKED ===');
              
              if (loading) {
                console.log('Already loading, ignoring');
                return false;
              }
              
              if (!username.trim() || !password.trim()) {
                toast.error('Please enter both username and password');
                return false;
              }
              
              console.log('Calling handlePasswordSubmit');
              await handlePasswordSubmit(e as any);
              return false;
            }}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-semibold shadow-lg hover:shadow-xl"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Logging in...
              </>
            ) : (
              <>
                <MdLogin className="w-5 h-5" />
                Login
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
