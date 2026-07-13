import React, { useState } from 'react';
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInAnonymously
} from '../firebase';
import { Shield, Sparkles, User, Mail, Lock, LogIn, UserPlus } from 'lucide-react';
import { motion } from 'motion/react';

interface LoginProps {
  onLoginSuccess: (user: any, customUsername?: string) => void;
  onDemoLogin: (username: string) => void;
}

const TUGRIK_ADJECTIVES = [
  'Шустрый', 'Скрытный', 'Тихий', 'Космический', 'Веселый', 
  'Гордый', 'Быстрый', 'Умный', 'Мудрый', 'Золотой', 
  'Крипто', 'Таинственный', 'Звездный', 'Анонимный'
];

const TUGRIK_NOUNS = [
  'Тугрик', 'Хомяк', 'Енот', 'Бобер', 'Лис', 
  'Кот', 'Пес', 'Агент', 'Шпион', 'Ниндзя', 
  'Пират', 'Дроид', 'Фантом', 'Феникс'
];

export default function Login({ onLoginSuccess, onDemoLogin }: LoginProps) {
  const [isRegistering, setIsRegistering] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [customUsername, setCustomUsername] = useState(() => {
    const adj = TUGRIK_ADJECTIVES[Math.floor(Math.random() * TUGRIK_ADJECTIVES.length)];
    const noun = TUGRIK_NOUNS[Math.floor(Math.random() * TUGRIK_NOUNS.length)];
    const randomNum = Math.floor(100 + Math.random() * 900);
    return `${adj}${noun}_${randomNum}`;
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGenerateName = () => {
    const adj = TUGRIK_ADJECTIVES[Math.floor(Math.random() * TUGRIK_ADJECTIVES.length)];
    const noun = TUGRIK_NOUNS[Math.floor(Math.random() * TUGRIK_NOUNS.length)];
    const randomNum = Math.floor(100 + Math.random() * 900);
    setCustomUsername(`${adj}${noun}_${randomNum}`);
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Заполните почту и пароль');
      return;
    }
    if (password.length < 6) {
      setError('Пароль должен быть не менее 6 символов');
      return;
    }

    setError('');
    setLoading(true);

    try {
      if (isRegistering) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        onLoginSuccess(userCredential.user, customUsername);
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        onLoginSuccess(userCredential.user);
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Неверная почта или пароль. Если вы хотите создать новый аккаунт, переключитесь на "Зарегистрироваться анонимно" внизу.');
      } else if (err.code === 'auth/email-already-in-use') {
        setIsRegistering(false);
        setError('Эта почта уже зарегистрирована! Мы автоматически переключили форму в режим Входа — введите пароль и нажмите «Войти».');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('Регистрация по почте и паролю временно отключена в вашей панели Firebase. Пожалуйста, перейдите в консоль Firebase -> Authentication -> Sign-in method и включите провайдер "Email/Password". Либо воспользуйтесь быстрым входом через Google или Демо-режимом ниже!');
      } else if (err.code === 'auth/invalid-email') {
        setError('Некорректный формат почты.');
      } else {
        setError(err.message || 'Ошибка авторизации. Рекомендуем использовать быстрый Демо-вход ниже.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      onLoginSuccess(result.user, customUsername);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/popup-blocked') {
        setError('Всплывающее окно заблокировано браузером. Пожалуйста, разрешите всплывающие окна или войдите по почте.');
      } else {
        setError('Ошибка при входе через Google. Используйте вход по почте в IFrame.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAnonymousSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await signInAnonymously(auth);
      onLoginSuccess(result.user, customUsername);
    } catch (err: any) {
      console.error(err);
      setError('Ошибка при анонимной регистрации. Воспользуйтесь быстрым Демо-входом ниже.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 font-sans p-6">
      <div className="w-full max-w-md bg-slate-900/90 border border-emerald-500/20 rounded-3xl p-8 shadow-[0_0_50px_-12px_rgba(16,185,129,0.15)] relative overflow-hidden">
        
        {/* Background glow effects */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-36 h-36 bg-violet-600/10 rounded-full blur-3xl animate-pulse"></div>

        {/* Header Branding */}
        <div className="text-center mb-8 relative z-10">
          <div className="inline-flex items-center justify-center p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl mb-4 text-emerald-400">
            <Sparkles className="w-8 h-8 animate-pulse text-emerald-400" />
          </div>
          <h1 className="text-4xl font-display font-bold tracking-tight bg-gradient-to-r from-violet-400 via-emerald-400 to-violet-500 bg-clip-text text-transparent">
            Тугрик
          </h1>
          <p className="text-xs font-mono text-slate-400 mt-2 uppercase tracking-widest">
            Анонимный Мессенджер нового поколения
          </p>
        </div>

        {/* Username Setup (Only for new registrations / initial setup) */}
        <div className="mb-6 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
          <label className="block text-xs font-mono text-slate-400 mb-2 uppercase tracking-wide">
            Анонимный никнейм {isRegistering ? '(будет сохранен)' : '(при первой регистрации)'}
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={customUsername}
                onChange={(e) => setCustomUsername(e.target.value.replace(/\s+/g, ''))}
                placeholder="Выберите никнейм"
                className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                maxLength={20}
              />
            </div>
            <button
              onClick={handleGenerateName}
              type="button"
              className="px-3 py-2 bg-emerald-600/15 text-emerald-400 hover:bg-emerald-600/25 border border-emerald-500/20 text-xs font-medium rounded-xl transition-colors cursor-pointer"
            >
              Кубик 🎲
            </button>
          </div>
          <p className="text-[10px] text-slate-500 mt-1.5">
            Ваш реальный E-mail и личные данные будут зашифрованы и скрыты.
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 font-medium">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleEmailAuth} className="space-y-4 relative z-10">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Почта</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="username@example.com"
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Пароль</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-gradient-to-r from-violet-600 to-emerald-600 hover:from-violet-500 hover:to-emerald-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-emerald-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : isRegistering ? (
              <>
                <UserPlus className="w-4 h-4" /> Создать анонимный аккаунт
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" /> Войти в Тугрик
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800/80"></div>
          </div>
          <span className="relative px-3 bg-slate-900 text-[10px] uppercase font-mono tracking-widest text-slate-500">
            Или
          </span>
        </div>

        {/* Real Anonymous SignIn via Firebase */}
        <button
          onClick={handleAnonymousSignIn}
          disabled={loading}
          type="button"
          className="w-full py-2.5 bg-gradient-to-r from-emerald-600/20 via-slate-950 to-emerald-500/20 hover:from-emerald-600/35 hover:to-emerald-500/35 text-emerald-400 hover:text-white border border-emerald-500/30 font-semibold text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer mb-3 shadow-[0_0_15px_rgba(16,185,129,0.1)] animate-pulse"
        >
          <Sparkles className="w-4 h-4 text-emerald-400" />
          Вход без пароля в 1 клик (Рекомендуется) 🚀
        </button>

        {/* Google Authentication */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          type="button"
          className="w-full py-2.5 bg-slate-950 hover:bg-slate-900 text-slate-200 border border-slate-800 font-medium text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer mb-1"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.144-5.136 4.307-3.23.2-6.046-2.093-6.425-5.322-.38-3.228 1.83-6.143 5.059-6.523.518-.061 1.042-.036 1.554.073l3.11-3.11c-2.483-1.637-5.59-2.07-8.414-1.171-4.048 1.29-6.732 5.151-6.58 9.395.152 4.244 3.109 7.848 7.15 8.717 3.93.844 7.973-1.044 9.535-4.664.673-1.56 1.01-3.243.99-4.943h-10.3c-.001.002-.001.003-.001.005z"
            />
          </svg>
          Войти через Google
        </button>
        <p className="text-[9px] font-mono text-slate-500 text-center mb-4 px-2 leading-relaxed">
          ⚠️ Примечание: Google-вход в окне IFrame может блокироваться вашим браузером. Если кнопка не срабатывает, используйте <strong>Вход без пароля</strong> выше.
        </p>

        {/* Guest Demo Login */}
        <button
          onClick={() => onDemoLogin(customUsername)}
          type="button"
          className="w-full py-2.5 bg-gradient-to-r from-violet-600/10 via-slate-900 to-emerald-600/10 hover:from-violet-600/20 hover:to-emerald-600/20 text-emerald-300 hover:text-white border border-emerald-500/20 font-medium text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer mb-6"
        >
          <Sparkles className="w-4 h-4 text-emerald-400" />
          Быстрый Демо-вход (Локально) ⚡️
        </button>

        {/* Register vs Login Switcher */}
        <div className="text-center relative z-10">
          <button
            onClick={() => setIsRegistering(!isRegistering)}
            className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors underline bg-transparent border-0 cursor-pointer"
          >
            {isRegistering 
              ? 'Уже есть аккаунт? Войти' 
              : 'Нет аккаунта? Зарегистрироваться анонимно'}
          </button>
        </div>

        {/* Creator Info Alert */}
        <div className="mt-6 pt-4 border-t border-slate-800 text-center flex flex-col items-center justify-center gap-1">
          <div className="flex items-center gap-1.5 text-slate-500 text-[10px]">
            <Shield className="w-3.5 h-3.5 text-emerald-500/80" />
            <span>Вход для Создателя:</span>
            <code className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-mono">
              faster123455677@gmail.com
            </code>
          </div>
          <p className="text-[9px] text-slate-500 leading-relaxed text-center max-w-xs">
            При входе под этим e-mail активируется <strong>Панель Создателя</strong> с возможностью включать/отключать функции, добавлять разделы и объявления.
          </p>
        </div>

      </div>
    </div>
  );
}
