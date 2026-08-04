import React, { useState } from 'react';
import { useAuth } from './AuthProvider';
import { useNavigate, Link } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import AppIcon from './AppIcon';

export default function PartnerLoginView() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  React.useEffect(() => {
    if (!authLoading && user && user.email) {
      navigate('/partners/dashboard');
    }
  }, [user, authLoading, navigate]);

  const checkPartnerStatus = async (userEmail: string) => {
    const q = query(collection(db, 'restaurants'), where('partnerEmails', 'array-contains', userEmail));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      const provider = new GoogleAuthProvider();
      const credentials = await signInWithPopup(auth, provider);
      const user = credentials.user;
      
      if (!user.email) {
        setError("Could not get email from Google Login.");
        return;
      }
      
      const isPartner = await checkPartnerStatus(user.email);
      if (isPartner) {
        navigate('/partners/dashboard');
      } else {
        await auth.signOut();
        setError(`Your email ${user.email} is not linked to any active restaurants.`);
      }
    } catch (err: any) {
      console.error(err);
      setError("Failed to sign in: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      const credentials = await signInWithEmailAndPassword(auth, email, password);
      const user = credentials.user;
      
      if (!user.email) {
        setError("Could not get email from Login.");
        return;
      }
      
      const isPartner = await checkPartnerStatus(user.email);
      if (isPartner) {
        navigate('/partners/dashboard');
      } else {
        await auth.signOut();
        setError(`Your email ${user.email} is not linked to any active restaurants.`);
      }
    } catch (err: any) {
      console.error(err);
      setError("Invalid Email or Password");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Please enter your email address to reset password.");
      return;
    }
    try {
      setLoading(true);
      setError(null);
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
    } catch (err: any) {
      setError("Invalid email address");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white lg:bg-[#F3F4F9] flex flex-col items-center justify-center font-sans p-0 lg:p-6 relative overflow-hidden">
      <Helmet>
        <title>Partner Login - Bookmytable</title>
      </Helmet>
      
      {/* Decorative background shapes */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none hidden lg:block">
        <div className="absolute top-[10%] left-[10%] w-[400px] h-[400px] bg-white opacity-40 transform rotate-45" />
        <div className="absolute -bottom-20 -right-20 w-[600px] h-[600px] bg-blue-100 rounded-full opacity-50 blur-3xl" />
        <div className="absolute top-[20%] right-[15%] w-0 h-0 border-l-[150px] border-l-transparent border-r-[150px] border-r-transparent border-b-[250px] border-b-blue-600 opacity-10 transform -rotate-45" />
      </div>

      {/* Main Floating Card */}
      <div className="relative z-10 bg-white lg:rounded-[2rem] lg:shadow-xl w-full max-w-[900px] flex flex-col lg:flex-row overflow-hidden lg:border border-gray-100 lg:max-h-[600px] flex-1 lg:flex-initial">
        
        {/* Left Side - Graphic & Info */}
        <div className="hidden lg:flex w-full lg:w-1/2 p-2 lg:p-3 bg-white flex-col">
          <div className="rounded-[1.5rem] overflow-hidden relative aspect-[16/10] lg:h-full lg:aspect-auto h-64 lg:h-auto">
            <img 
              src="https://i.pinimg.com/736x/69/65/c6/6965c665a5ace34c69bdd6224d8ca9f1.jpg?w=800&auto=format&fit=crop&q=80" 
              alt="Chef Cooking" 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center p-6 text-center">
              <h2 className="text-white text-3xl md:text-4xl font-bold leading-tight drop-shadow-lg max-w-sm">
                Get your restaurant discovered by millions of diners!
              </h2>
            </div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="w-full lg:w-1/2 p-5 lg:p-8 flex flex-col justify-center items-center lg:items-start">
          
          <Link to="/" className="flex items-center gap-2 mb-4 w-full max-w-sm hover:opacity-80 transition-opacity">
            <AppIcon size={36} />
            <span className="text-xl font-bold text-[#363636] tracking-tight">
              Bookmytable
            </span>
          </Link>

          <div className="w-full max-w-sm">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Partner dashboard</h1>
            <p className="text-gray-500 mb-5 text-sm">Smart way to Manage your Restaurant</p>
            
            <form onSubmit={handleEmailLogin} className="space-y-3 text-left">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-900">Email</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all placeholder:text-gray-400 focus:bg-white"
                  placeholder="hi@example.com"
                />
              </div>
              
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-900">Password</label>
                <div className="relative">
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all placeholder:text-gray-400 focus:bg-white"
                    placeholder="Enter password"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              
              <div className="flex justify-end pt-1">
                <button 
                  type="button" 
                  onClick={handleForgotPassword}
                  className="text-sm font-medium text-blue-600 hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-medium transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 mt-1"
              >
                {loading ? <Loader2 size={20} className="animate-spin" /> : null}
                <span>Login</span>
              </button>
            </form>

            <div className="mt-4 relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-400 text-xs uppercase font-medium">Or continue with</span>
              </div>
            </div>

            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full mt-4 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 py-2.5 rounded-xl font-medium transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                <path fill="none" d="M0 0h48v48H0z"></path>
              </svg>
              <span>Google</span>
            </button>

            {error && (
              <div className="mt-4 flex items-start gap-2 text-red-600 text-sm font-medium bg-red-50 p-3 rounded-xl text-left border border-red-100">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}
            
            {resetSent && !error && (
              <div className="mt-4 flex items-start gap-2 text-green-600 text-sm font-medium bg-green-50 p-3 rounded-xl text-left border border-green-100">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <p>Password reset email sent! Please check your inbox.</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Footer text outside the card */}
      <div className="relative z-10 mt-6 lg:mt-6 mb-8 lg:mb-0 px-4 text-center flex flex-col items-center">
        <p className="text-[11px] text-gray-400 max-w-lg leading-relaxed">
          You agree to Bookmytable's <Link to="/terms" className="text-blue-600 hover:underline">Terms of Service</Link>, <Link to="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link> & <Link to="/code-of-conduct" className="text-blue-600 hover:underline">Code of Conduct</Link>. 
        </p>
      </div>
    </div>
  );
}

