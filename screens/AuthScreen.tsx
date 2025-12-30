
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendEmailVerification,
  updateProfile,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  sendPasswordResetEmail,
  signOut
} from 'firebase/auth';
import { ref, set, get } from 'firebase/database';
import { auth, db } from '../firebase';
import { LOGO_URL, APP_NAME } from '../constants';
import { ToastType } from '../components/Toast';
import { BlockedUser } from '../types';

interface AuthScreenProps {
  onNotify: (msg: string, type: ToastType) => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onNotify }) => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [stayLoggedIn, setStayLoggedIn] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: ''
  });

  const [passwordValidation, setPasswordValidation] = useState({
    length: false,
    letter: false,
    number: false,
    special: false
  });

  useEffect(() => {
    const pass = formData.password;
    setPasswordValidation({
      length: pass.length >= 8,
      letter: /[a-zA-Z]/.test(pass),
      number: /[0-9]/.test(pass),
      special: /[!@#$%^&*()_+{}\[\]:;<>,.?~\\/-]/.test(pass)
    });
  }, [formData.password]);

  const isPasswordSecure = passwordValidation.length && passwordValidation.letter && passwordValidation.number && passwordValidation.special;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const emailLower = formData.email.toLowerCase().trim();
    const usernameTrimmed = formData.username.trim();
    const password = formData.password;
    const isReservedDomain = emailLower.endsWith('@oghub.com');

    try {
      await setPersistence(
        auth, 
        stayLoggedIn ? browserLocalPersistence : browserSessionPersistence
      );

      if (isLogin) {
        // --- LOGIN FLOW ---
        const userCredential = await signInWithEmailAndPassword(auth, emailLower, password);
        const user = userCredential.user;
        const name = user.displayName || 'Gamer';
        onNotify(`Access Granted. Welcome back, ${name}!`, 'success');
      } else {
        // --- SIGNUP FLOW ---
        if (isReservedDomain) {
          throw new Error("Registration is restricted for @oghub.com.");
        }

        if (!isPasswordSecure) {
          throw new Error("Security Protocol: Password does not meet complexity requirements.");
        }

        if (password !== formData.confirmPassword) {
          throw new Error("Mismatch: Passwords do not match.");
        }
        
        if (usernameTrimmed.length < 1) {
          throw new Error("Identification Required: Please enter a username.");
        }

        const userCredential = await createUserWithEmailAndPassword(auth, emailLower, password);
        const user = userCredential.user;

        await updateProfile(user, { displayName: usernameTrimmed });
        
        await set(ref(db, `users/${user.uid}`), {
          uid: user.uid,
          username: usernameTrimmed,
          email: emailLower,
          createdAt: Date.now(),
          totalPlayTime: 0,
          totalGamesPlayed: 0
        });

        await sendEmailVerification(user);
        onNotify("Identity Created. Check your inbox for verification beacon.", 'success');
      }
    } catch (err: any) {
      console.error("Auth Exception:", err.code, err.message);
      let errorMessage = "Deployment Error: Connection failed.";
      
      if (err.code === 'auth/invalid-credential') {
        errorMessage = "Identity Denied: Incorrect email or password.";
      } else if (err.code === 'auth/email-already-in-use') {
        errorMessage = "Identity Collision: This email is already registered.";
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = "Protocol Error: Invalid email format.";
      } else if (err.code === 'auth/user-disabled') {
        errorMessage = "Account Restricted: Access revoked by administration.";
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = "Security Lockout: Too many attempts. Try again later.";
      } else {
        errorMessage = err.message || errorMessage;
      }
      
      onNotify(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const email = formData.email.toLowerCase().trim();
    if (!email) {
      onNotify("Input Required: Please enter your email address first.", "info");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      onNotify("Recovery Beacon: Reset link sent to your email!", "success");
    } catch (err: any) {
      onNotify(err.message, "error");
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 animate-fadeIn relative">
      <div className="w-full max-w-md bg-slate-900 rounded-[2.5rem] border border-slate-800 p-8 shadow-2xl relative">
        <button 
          onClick={() => navigate('/')}
          className="absolute top-6 left-6 w-10 h-10 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-indigo-400 transition-all active:scale-90"
          type="button"
        >
          <i className="fa-solid fa-arrow-left"></i>
        </button>

        <div className="flex flex-col items-center mb-8 mt-4">
          <img src={LOGO_URL} alt={APP_NAME} className="w-16 h-16 mb-4" />
          <h2 className="text-2xl font-black text-slate-50 uppercase tracking-tighter">
            {isLogin ? 'Mission Login' : 'Deploy Identity'}
          </h2>
          <p className="text-indigo-500 text-[10px] font-black uppercase tracking-[0.2em]">
            {isLogin ? 'Authorization Required' : 'Join the Universe'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest">Gamer Tag</label>
              <input
                type="text"
                required
                placeholder="GameMaster"
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-4 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all text-sm text-slate-50 placeholder:text-slate-700"
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest">Email Address</label>
            <input
              type="email"
              required
              placeholder="name@provider.com"
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-4 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all text-sm text-slate-50 placeholder:text-slate-700"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest">Access Key</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-4 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all text-sm text-slate-50 placeholder:text-slate-700"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
            />
            {!isLogin && (
              <div className="grid grid-cols-2 gap-2 mt-2 px-2">
                <div className={`text-[9px] font-black flex items-center space-x-1 ${passwordValidation.length ? 'text-emerald-500' : 'text-slate-700'}`}>
                  <i className={`fa-solid ${passwordValidation.length ? 'fa-check-circle' : 'fa-circle-dot'}`}></i>
                  <span>8+ Chars</span>
                </div>
                <div className={`text-[9px] font-black flex items-center space-x-1 ${passwordValidation.letter ? 'text-emerald-500' : 'text-slate-700'}`}>
                  <i className={`fa-solid ${passwordValidation.letter ? 'fa-check-circle' : 'fa-circle-dot'}`}></i>
                  <span>Letters</span>
                </div>
                <div className={`text-[9px] font-black flex items-center space-x-1 ${passwordValidation.number ? 'text-emerald-500' : 'text-slate-700'}`}>
                  <i className={`fa-solid ${passwordValidation.number ? 'fa-check-circle' : 'fa-circle-dot'}`}></i>
                  <span>Numbers</span>
                </div>
                <div className={`text-[9px] font-black flex items-center space-x-1 ${passwordValidation.special ? 'text-emerald-500' : 'text-slate-700'}`}>
                  <i className={`fa-solid ${passwordValidation.special ? 'fa-check-circle' : 'fa-circle-dot'}`}></i>
                  <span>Special Char</span>
                </div>
              </div>
            )}
          </div>

          {!isLogin && (
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest">Confirm Access Key</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-4 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all text-sm text-slate-50 placeholder:text-slate-700"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
              />
            </div>
          )}

          <div className="flex items-center justify-between px-2 py-1">
            <label className="flex items-center cursor-pointer group">
              <div className="relative">
                <input 
                  type="checkbox" 
                  className="sr-only" 
                  checked={stayLoggedIn}
                  onChange={(e) => setStayLoggedIn(e.target.checked)}
                />
                <div className={`w-10 h-5 rounded-full shadow-inner transition-colors ${stayLoggedIn ? 'bg-indigo-600' : 'bg-slate-700'}`}></div>
                <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full shadow transition-transform ${stayLoggedIn ? 'translate-x-5' : 'translate-x-0'}`}></div>
              </div>
              <span className="ml-3 text-[10px] font-black text-slate-500 group-hover:text-slate-300 transition-colors uppercase tracking-widest">Maintain Link</span>
            </label>
            
            {isLogin && (
              <button 
                type="button"
                onClick={handleForgotPassword}
                className="text-[10px] font-black text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-widest"
              >
                Lost Key?
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || (!isLogin && !isPasswordSecure)}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-indigo-600/30 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed mt-2 border-b-4 border-indigo-800"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <i className="fa-solid fa-circle-notch animate-spin mr-2"></i>
                Synchronizing...
              </span>
            ) : (isLogin ? 'Initialize Profile' : 'Confirm Deployment')}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-800 flex flex-col items-center">
          <p className="text-slate-600 text-[9px] mb-3 font-black uppercase tracking-widest">
            {isLogin ? "No hub identity detected?" : "Already registered in system?"}
          </p>
          <button
            onClick={toggleMode}
            className="text-indigo-400 font-black text-sm hover:text-indigo-300 transition-colors uppercase tracking-widest"
            type="button"
          >
            {isLogin ? 'Create Profile' : 'Login Existing'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
