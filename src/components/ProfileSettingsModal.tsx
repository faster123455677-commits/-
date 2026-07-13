import React, { useState } from 'react';
import { X, User, Smile, Check, Loader2 } from 'lucide-react';
import { UserProfile, AppConfig } from '../types';

interface ProfileSettingsFormProps {
  userProfile: UserProfile;
  currentConfig: AppConfig;
  onClose?: () => void;
  onSave: (username: string, avatar: string) => Promise<void>;
}

const AVATAR_POOL = [
  '🤖', '🦊', '🐱', '🐶', '🦁', '🐻', '🐼', '🐨', 
  '🐸', '🐙', '🦖', '🦄', '🐝', '👻', '🥷', '👽', 
  '👾', '🚀', '🎭', '🍿', '🎨', '🎸', '⚡️', '🌟', 
  '🌈', '🍕', '🍩', '🥑', '🥥', '🔮', '🍀', '💎'
];

export function ProfileSettingsForm({
  userProfile,
  currentConfig,
  onClose,
  onSave
}: ProfileSettingsFormProps) {
  const [username, setUsername] = useState(userProfile.username);
  const [selectedAvatar, setSelectedAvatar] = useState(userProfile.avatar || '🤖');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const getAccentBg = () => {
    switch (currentConfig.themeAccent) {
      case 'emerald': return 'bg-emerald-600 hover:bg-emerald-500 text-white';
      case 'indigo': return 'bg-indigo-600 hover:bg-indigo-500 text-white';
      case 'rose': return 'bg-rose-600 hover:bg-rose-500 text-white';
      case 'amber': return 'bg-amber-600 hover:bg-amber-500 text-slate-900';
      case 'sky': return 'bg-sky-600 hover:bg-sky-500 text-slate-900';
      default: return 'bg-violet-600 hover:bg-violet-500 text-white';
    }
  };

  const getAccentRing = () => {
    switch (currentConfig.themeAccent) {
      case 'emerald': return 'focus:border-emerald-500';
      case 'indigo': return 'focus:border-indigo-500';
      case 'rose': return 'focus:border-rose-500';
      case 'amber': return 'focus:border-amber-500';
      case 'sky': return 'focus:border-sky-500';
      default: return 'focus:border-violet-500';
    }
  };

  const getAccentBorder = () => {
    switch (currentConfig.themeAccent) {
      case 'emerald': return 'border-emerald-500';
      case 'indigo': return 'border-indigo-500';
      case 'rose': return 'border-rose-500';
      case 'amber': return 'border-amber-500';
      case 'sky': return 'border-sky-500';
      default: return 'border-violet-500';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    const trimmedUsername = username.trim().replace(/\s+/g, '');
    if (!trimmedUsername) {
      setError('Никнейм не может быть пустым');
      return;
    }

    if (trimmedUsername.length < 2) {
      setError('Никнейм должен быть не короче 2 символов');
      return;
    }

    if (trimmedUsername.length > 18) {
      setError('Никнейм должен быть не длиннее 18 символов');
      return;
    }

    try {
      setLoading(true);
      await onSave(trimmedUsername, selectedAvatar);
      setSuccess(true);
      if (onClose) {
        setTimeout(() => {
          onClose();
        }, 1000);
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Не удалось обновить настройки профиля');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 overflow-y-auto pr-1 flex-1">
      {/* Avatar Preview & Selection */}
      <div className="space-y-3">
        <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider">
          Ваш Аватар
        </label>
        
        {/* Visual Avatar preview */}
        <div className="flex items-center gap-4 p-3 bg-slate-950/50 border border-slate-800/40 rounded-xl">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-800 border-2 border-slate-700/50 flex items-center justify-center text-4xl shadow-inner relative group">
            <span>{selectedAvatar}</span>
            <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Smile className="w-5 h-5 text-slate-300" />
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-200">Превью профиля</span>
            <p className="text-[10px] text-slate-400 leading-relaxed font-mono">
              {username ? `@${username.trim().replace(/\s+/g, '')}` : '@Никнейм'}
            </p>
          </div>
        </div>

        {/* Grid of emojis */}
        <div className="space-y-1.5">
          <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wide block">
            Выберите эмодзи из списка
          </span>
          <div className="grid grid-cols-6 gap-2 max-h-40 overflow-y-auto p-1 bg-slate-950/40 border border-slate-800/80 rounded-xl">
            {AVATAR_POOL.map((avatar) => {
              const isSelected = selectedAvatar === avatar;
              return (
                <button
                  key={avatar}
                  type="button"
                  onClick={() => setSelectedAvatar(avatar)}
                  className={`text-2xl p-2 rounded-xl transition-all cursor-pointer flex items-center justify-center relative border ${
                    isSelected 
                      ? `${getAccentBorder()} bg-slate-900 border-2 shadow-md shadow-violet-500/10` 
                      : 'border-transparent hover:bg-slate-900/60 hover:scale-105'
                  }`}
                  id={`emoji-option-${avatar}`}
                >
                  {avatar}
                  {isSelected && (
                    <span className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-violet-600 border border-slate-900 rounded-full flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-white" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Username Input */}
      <div className="space-y-2">
        <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider">
          Анонимный никнейм
        </label>
        <div className="relative">
          <span className="absolute left-3 top-2.5 text-slate-500 font-mono text-xs">@</span>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value.replace(/\s+/g, ''))}
            className={`w-full pl-7 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-medium focus:outline-none focus:border-2 ${getAccentRing()} transition-all`}
            placeholder="КриптоТугрик"
            maxLength={18}
            required
            id="profile-username-input"
          />
        </div>
        <p className="text-[9px] text-slate-500 font-mono leading-normal">
          Никнейм должен быть длиной от 2 до 18 символов, без пробелов.
        </p>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium rounded-xl animate-fade-in text-center" id="profile-modal-error">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium rounded-xl animate-fade-in text-center flex items-center justify-center gap-2" id="profile-modal-success">
          <Check className="w-4 h-4" />
          Профиль успешно обновлен!
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-3 border-t border-slate-800/40">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 bg-slate-950 border border-slate-800 text-slate-400 text-xs font-semibold rounded-xl hover:text-slate-200 hover:border-slate-700 transition-all cursor-pointer disabled:opacity-50"
            id="cancel-profile-modal-btn"
          >
            Отмена
          </button>
        )}
        <button
          type="submit"
          disabled={loading || success}
          className={`flex-1 py-2.5 rounded-xl text-xs font-semibold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${getAccentBg()}`}
          id="submit-profile-modal-btn"
        >
          {loading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Сохранение...
            </>
          ) : (
            'Сохранить'
          )}
        </button>
      </div>
    </form>
  );
}

interface ProfileSettingsModalProps {
  userProfile: UserProfile;
  currentConfig: AppConfig;
  onClose: () => void;
  onSave: (username: string, avatar: string) => Promise<void>;
}

export default function ProfileSettingsModal({
  userProfile,
  currentConfig,
  onClose,
  onSave
}: ProfileSettingsModalProps) {
  const getAccentText = () => {
    switch (currentConfig.themeAccent) {
      case 'emerald': return 'text-emerald-400';
      case 'indigo': return 'text-indigo-400';
      case 'rose': return 'text-rose-400';
      case 'amber': return 'text-amber-400';
      case 'sky': return 'text-sky-400';
      default: return 'text-violet-400';
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in"
      id="profile-settings-modal-overlay"
      onClick={(e) => {
        if ((e.target as HTMLElement).id === 'profile-settings-modal-overlay') {
          onClose();
        }
      }}
    >
      <div 
        className="w-full max-w-md bg-slate-900 border border-slate-800/80 rounded-2xl p-6 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] animate-scale-in"
        id="profile-settings-modal-card"
      >
        {/* Glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-violet-500/50 to-transparent blur-sm"></div>

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/60 mb-5">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
              <User className={`w-4 h-4 ${getAccentText()}`} />
            </div>
            <div>
              <h3 className="font-display font-bold text-sm text-slate-100">Настройки профиля</h3>
              <p className="text-[10px] text-slate-400 font-mono">Обновите ваши анонимные данные</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            id="close-profile-modal-btn"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Form */}
        <ProfileSettingsForm 
          userProfile={userProfile}
          currentConfig={currentConfig}
          onSave={onSave}
          onClose={onClose}
        />
      </div>
    </div>
  );
}
