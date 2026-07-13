import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, updateDoc, collection, getDocs, deleteDoc, writeBatch } from 'firebase/firestore';
import { AppConfig, UserProfile, Announcement } from '../types';
import { 
  Sliders, 
  Megaphone, 
  UserX, 
  Settings, 
  Check, 
  VolumeX, 
  Volume2, 
  Users, 
  Activity,
  Trash2,
  Lock,
  Compass,
  Palette,
  AlertTriangle
} from 'lucide-react';

interface CreatorConsoleProps {
  currentConfig: AppConfig;
  userProfile: UserProfile;
}

export default function CreatorConsole({ currentConfig, userProfile }: CreatorConsoleProps) {
  const [activeTab, setActiveTab] = useState<'toggles' | 'announcements' | 'users'>('toggles');
  
  // States for form edits
  const [customText, setCustomText] = useState(currentConfig.creatorCustomText || '');
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setCustomText(currentConfig.creatorCustomText || '');
  }, [currentConfig]);

  // Fetch all users for moderation
  const fetchAllUsers = async () => {
    setLoading(true);
    try {
      const q = collection(db, 'users');
      const snap = await getDocs(q);
      const list: UserProfile[] = [];
      const seenUids = new Set<string>();
      snap.forEach((doc) => {
        const u = doc.data() as UserProfile;
        if (u.uid && !seenUids.has(u.uid)) {
          seenUids.add(u.uid);
          list.push(u);
        }
      });
      setAllUsers(list);
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'users') {
      fetchAllUsers();
    }
  }, [activeTab]);

  // Update Feature Toggles in firestore
  const handleToggle = async (key: 'voiceCalls' | 'groupCreation' | 'anonymousMode' | 'themeSelection') => {
    try {
      const configRef = doc(db, 'settings', 'app_config');
      const updatedToggles = {
        ...currentConfig.featureToggles,
        [key]: !currentConfig.featureToggles[key]
      };
      await updateDoc(configRef, {
        featureToggles: updatedToggles
      });
    } catch (err) {
      console.error("Error saving feature toggles:", err);
    }
  };

  // Update App Theme
  const handleThemeChange = async (color: string) => {
    try {
      const configRef = doc(db, 'settings', 'app_config');
      await updateDoc(configRef, {
        themeAccent: color
      });
    } catch (err) {
      console.error("Error saving theme color:", err);
    }
  };

  // Save creator's welcome message
  const handleSaveWelcomeText = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const configRef = doc(db, 'settings', 'app_config');
      await updateDoc(configRef, {
        creatorCustomText: customText
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Error updating welcome text:", err);
    }
  };

  // Add a system announcement
  const handleAddAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annContent.trim()) return;

    try {
      const configRef = doc(db, 'settings', 'app_config');
      const newAnn: Announcement = {
        id: 'ann_' + Date.now(),
        title: annTitle,
        content: annContent,
        createdAt: Date.now()
      };
      
      await updateDoc(configRef, {
        announcements: [newAnn, ...currentConfig.announcements]
      });
      
      setAnnTitle('');
      setAnnContent('');
      alert('Объявление успешно опубликовано для всех пользователей!');
    } catch (err) {
      console.error("Error creating announcement:", err);
    }
  };

  // Delete announcement
  const handleDeleteAnnouncement = async (annId: string) => {
    try {
      const configRef = doc(db, 'settings', 'app_config');
      const filtered = currentConfig.announcements.filter(a => a.id !== annId);
      await updateDoc(configRef, {
        announcements: filtered
      });
    } catch (err) {
      console.error("Error deleting announcement:", err);
    }
  };

  // Delete/Ban a user profile from messenger
  const handleModerateUser = async (targetUid: string) => {
    if (targetUid === userProfile.uid) {
      alert("Вы не можете заблокировать самого себя!");
      return;
    }
    if (!window.confirm("Вы уверены, что хотите удалить профиль этого пользователя из мессенджера?")) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'users', targetUid));
      setAllUsers(prev => prev.filter(u => u.uid !== targetUid));
      alert("Пользователь успешно удален.");
    } catch (err) {
      console.error("Error deleting user:", err);
      alert("Ошибка при модерации пользователя.");
    }
  };

  // Color theme class map
  const themeColors = [
    { name: 'violet', label: 'Фиолетовый Неон', bg: 'bg-violet-600', border: 'border-violet-500' },
    { name: 'emerald', label: 'Изумрудный Сад', bg: 'bg-emerald-600', border: 'border-emerald-500' },
    { name: 'indigo', label: 'Космический Синий', bg: 'bg-indigo-600', border: 'border-indigo-500' },
    { name: 'rose', label: 'Неоновый Розовый', bg: 'bg-rose-600', border: 'border-rose-500' },
    { name: 'amber', label: 'Янтарный Рассвет', bg: 'bg-amber-600', border: 'border-amber-500' },
    { name: 'sky', label: 'Небесный Голубой', bg: 'bg-sky-600', border: 'border-sky-500' }
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-900 text-slate-100 p-6 overflow-y-auto">
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-slate-800 pb-6 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 bg-indigo-500/10 text-indigo-400 text-xs font-semibold rounded-full border border-indigo-500/20 font-mono tracking-widest uppercase">
              Creator God Mode
            </span>
            <Lock className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <h2 className="text-3xl font-display font-bold tracking-tight">Панель Создателя «Тугрик»</h2>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Редактирование функций, публикация объявлений и модерирование в реальном времени.
          </p>
        </div>
        
        {/* Warning Badge */}
        <div className="mt-4 md:mt-0 flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-400">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>Изменения мгновенно вступят в силу у всех пользователей</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 mb-6 gap-2">
        <button
          onClick={() => setActiveTab('toggles')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
            activeTab === 'toggles' 
              ? 'border-indigo-500 text-indigo-400' 
              : 'border-transparent text-slate-400 hover:text-slate-300'
          }`}
        >
          <Sliders className="w-4 h-4" />
          Включение функций и Тема
        </button>
        <button
          onClick={() => setActiveTab('announcements')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
            activeTab === 'announcements' 
              ? 'border-indigo-500 text-indigo-400' 
              : 'border-transparent text-slate-400 hover:text-slate-300'
          }`}
        >
          <Megaphone className="w-4 h-4" />
          Объявления и Приветствие ({currentConfig.announcements?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
            activeTab === 'users' 
              ? 'border-indigo-500 text-indigo-400' 
              : 'border-transparent text-slate-400 hover:text-slate-300'
          }`}
        >
          <UserX className="w-4 h-4" />
          Управление Пользователями
        </button>
      </div>

      {/* TABS CONTENT */}
      {activeTab === 'toggles' && (
        <div className="space-y-6 max-w-4xl animate-fade-in">
          
          {/* Section 1: Feature Toggles */}
          <div className="bg-slate-800/60 border border-slate-800/80 rounded-2xl p-6">
            <h3 className="text-lg font-medium mb-1 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-indigo-400" />
              Тумблеры Возможностей
            </h3>
            <p className="text-xs text-slate-400 mb-6 font-mono">
              Отключите функции, чтобы мгновенно скрыть их из интерфейса обычных пользователей.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Voice Calls Toggle */}
              <div className="flex items-center justify-between p-4 bg-slate-900/50 border border-slate-800 rounded-xl">
                <div>
                  <div className="font-semibold text-sm">Аудио и Видеозвонки</div>
                  <p className="text-[11px] text-slate-400 mt-1">Возможность совершать анонимные звонки между пользователями.</p>
                </div>
                <button
                  onClick={() => handleToggle('voiceCalls')}
                  className={`w-12 h-6 rounded-full p-1 transition-colors cursor-pointer ${
                    currentConfig.featureToggles?.voiceCalls ? 'bg-emerald-500' : 'bg-slate-700'
                  }`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    currentConfig.featureToggles?.voiceCalls ? 'translate-x-6' : 'translate-x-0'
                  }`}></div>
                </button>
              </div>

              {/* Group Chats Toggle */}
              <div className="flex items-center justify-between p-4 bg-slate-900/50 border border-slate-800 rounded-xl">
                <div>
                  <div className="font-semibold text-sm">Создание Групп</div>
                  <p className="text-[11px] text-slate-400 mt-1">Разрешить создавать групповые чаты и общаться коллективно.</p>
                </div>
                <button
                  onClick={() => handleToggle('groupCreation')}
                  className={`w-12 h-6 rounded-full p-1 transition-colors cursor-pointer ${
                    currentConfig.featureToggles?.groupCreation ? 'bg-emerald-500' : 'bg-slate-700'
                  }`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    currentConfig.featureToggles?.groupCreation ? 'translate-x-6' : 'translate-x-0'
                  }`}></div>
                </button>
              </div>

              {/* Anonymous Mode Toggle */}
              <div className="flex items-center justify-between p-4 bg-slate-900/50 border border-slate-800 rounded-xl">
                <div>
                  <div className="font-semibold text-sm">Максимальная Анонимность</div>
                  <p className="text-[11px] text-slate-400 mt-1">При включении скрывает реальные почты пользователей во всех списках.</p>
                </div>
                <button
                  onClick={() => handleToggle('anonymousMode')}
                  className={`w-12 h-6 rounded-full p-1 transition-colors cursor-pointer ${
                    currentConfig.featureToggles?.anonymousMode ? 'bg-emerald-500' : 'bg-slate-700'
                  }`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    currentConfig.featureToggles?.anonymousMode ? 'translate-x-6' : 'translate-x-0'
                  }`}></div>
                </button>
              </div>

              {/* Theme Settings Toggle */}
              <div className="flex items-center justify-between p-4 bg-slate-900/50 border border-slate-800 rounded-xl">
                <div>
                  <div className="font-semibold text-sm">Выбор индивидуальной темы</div>
                  <p className="text-[11px] text-slate-400 mt-1">Разрешить пользователям менять цвет подсветки на своей стороне.</p>
                </div>
                <button
                  onClick={() => handleToggle('themeSelection')}
                  className={`w-12 h-6 rounded-full p-1 transition-colors cursor-pointer ${
                    currentConfig.featureToggles?.themeSelection ? 'bg-emerald-500' : 'bg-slate-700'
                  }`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    currentConfig.featureToggles?.themeSelection ? 'translate-x-6' : 'translate-x-0'
                  }`}></div>
                </button>
              </div>

            </div>
          </div>

          {/* Section 2: Global Theme Accent for all users */}
          <div className="bg-slate-800/60 border border-slate-800/80 rounded-2xl p-6">
            <h3 className="text-lg font-medium mb-1 flex items-center gap-2">
              <Palette className="w-5 h-5 text-indigo-400" />
              Глобальная Тема Оформления
            </h3>
            <p className="text-xs text-slate-400 mb-6 font-mono">
              Выберите основной акцентный цвет мессенджера Тугрик, который применится для ВСЕХ пользователей сразу!
            </p>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {themeColors.map((color) => {
                const isSelected = currentConfig.themeAccent === color.name;
                return (
                  <button
                    key={color.name}
                    onClick={() => handleThemeChange(color.name)}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left cursor-pointer ${
                      isSelected 
                        ? 'border-indigo-500 bg-indigo-500/10 text-white' 
                        : 'border-slate-800 bg-slate-900/40 hover:bg-slate-900/80 text-slate-300'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded-full ${color.bg} border ${color.border} flex-shrink-0`} />
                    <span className="text-xs font-semibold">{color.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 ml-auto text-indigo-400" />}
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {activeTab === 'announcements' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
          
          {/* Creator Welcome Text */}
          <div className="bg-slate-800/60 border border-slate-800/80 rounded-2xl p-6 h-fit">
            <h3 className="text-lg font-medium mb-1 flex items-center gap-2">
              <Compass className="w-5 h-5 text-indigo-400" />
              Закрепленное Приветствие Создателя
            </h3>
            <p className="text-xs text-slate-400 mb-4 font-mono">
              Этот текст увидят все пользователи в верхней части панели.
            </p>

            <form onSubmit={handleSaveWelcomeText} className="space-y-4">
              <textarea
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="Напишите приветствие, дисклеймер или инструкции..."
                className="w-full h-32 p-3 bg-slate-900 border border-slate-700 rounded-xl text-sm focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                maxLength={500}
                required
              />
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500">
                  Осталось {500 - customText.length} символов
                </span>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  {saveSuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5" /> Сохранено!
                    </>
                  ) : (
                    'Сохранить приветствие'
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* New System Announcement */}
          <div className="bg-slate-800/60 border border-slate-800/80 rounded-2xl p-6 h-fit">
            <h3 className="text-lg font-medium mb-1 flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-indigo-400" />
              Опубликовать Новое Объявление
            </h3>
            <p className="text-xs text-slate-400 mb-4 font-mono">
              Разошлите важное уведомление всем пользователям в ленту новостей.
            </p>

            <form onSubmit={handleAddAnnouncement} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Заголовок</label>
                <input
                  type="text"
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  placeholder="Добавлен анонимный чат!"
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Содержание</label>
                <textarea
                  value={annContent}
                  onChange={(e) => setAnnContent(e.target.value)}
                  placeholder="Дорогие Тугрики, мы обновили алгоритм анонимизации..."
                  className="w-full h-24 p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Megaphone className="w-4 h-4" /> Разместить объявление
              </button>
            </form>
          </div>

          {/* List of active announcements */}
          <div className="lg:col-span-2 bg-slate-800/40 border border-slate-800/60 rounded-2xl p-6 mt-6">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-4">
              Архив Объявлений ({currentConfig.announcements?.length || 0})
            </h3>

            {(!currentConfig.announcements || currentConfig.announcements.length === 0) ? (
              <div className="text-center py-6 text-slate-500 text-xs font-mono">
                Нет активных объявлений.
              </div>
            ) : (
              <div className="space-y-3">
                {currentConfig.announcements.map((ann) => (
                  <div key={ann.id} className="flex items-start justify-between p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
                    <div className="space-y-1 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-slate-200">{ann.title}</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(ann.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">{ann.content}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteAnnouncement(ann.id)}
                      className="p-1.5 bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/20 text-rose-400 rounded-lg transition-colors cursor-pointer"
                      title="Удалить объявление"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {activeTab === 'users' && (
        <div className="bg-slate-800/60 border border-slate-800/80 rounded-2xl p-6 animate-fade-in">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-medium flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-400" />
                Модерирование Профилей
              </h3>
              <p className="text-xs text-slate-400 font-mono mt-1">
                Список всех зарегистрированных участников мессенджера Tugrik.
              </p>
            </div>
            <button
              onClick={fetchAllUsers}
              className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs hover:bg-slate-950 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Activity className="w-3.5 h-3.5 animate-pulse" />
              Обновить список
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <span className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></span>
            </div>
          ) : allUsers.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs font-mono">
              Пользователи не найдены.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-mono">
                    <th className="py-3 px-4">Аватар / Никнейм</th>
                    <th className="py-3 px-4">E-mail (Скрыт для других)</th>
                    <th className="py-3 px-4">Роль</th>
                    <th className="py-3 px-4">Статус</th>
                    <th className="py-3 px-4 text-right">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {allUsers.map((user) => (
                    <tr key={user.uid} className="hover:bg-slate-900/30 transition-colors">
                      <td className="py-3 px-4 flex items-center gap-3">
                        <span className="text-2xl">{user.avatar || '🤖'}</span>
                        <div>
                          <span className="font-semibold text-slate-200">{user.username}</span>
                          <p className="text-[10px] text-slate-500 font-mono">{user.uid}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-300 font-mono">
                        {user.email || '—'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          user.role === 'admin' 
                            ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' 
                            : 'bg-slate-700/40 text-slate-400 border border-slate-700/30'
                        }`}>
                          {user.role === 'admin' ? 'Создатель' : 'Юзер'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${
                            user.status === 'online' ? 'bg-emerald-500' : 'bg-slate-500'
                          }`} />
                          <span className="capitalize">{user.status}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleModerateUser(user.uid)}
                          disabled={user.role === 'admin'}
                          className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/25 rounded-lg text-[11px] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Заблокировать / Удалить
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
