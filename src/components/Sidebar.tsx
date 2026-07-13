import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, getDocs, addDoc, doc, updateDoc } from 'firebase/firestore';
import { Chat, UserProfile, AppConfig } from '../types';
import { 
  MessageSquare, 
  Users, 
  Phone, 
  Settings, 
  ShieldAlert, 
  Plus, 
  Search, 
  Volume2, 
  UserPlus, 
  Hash, 
  UserCheck,
  Check,
  RefreshCw,
  Megaphone,
  LogOut,
  Monitor,
  LayoutGrid
} from 'lucide-react';

interface SidebarProps {
  currentUserId: string;
  userProfile: UserProfile;
  currentConfig: AppConfig;
  activeChatId: string | null;
  onSelectChat: (chat: Chat, eventCoords?: { x: number; y: number }) => void;
  onNavigateToConsole: () => void;
  currentView: string;
  onSetView: (view: 'chat' | 'console' | 'settings' | 'calls', eventCoords?: { x: number; y: number }) => void;
  onOpenProfileModal: (eventCoords?: { x: number; y: number }) => void;
  onSignOut: () => void;
  isWindowedMode?: boolean;
  onToggleMode?: () => void;
}

const AVATAR_POOL = ['🤖', '🦊', '🐱', '🐶', '🦁', '🐻', '🐼', '🐨', '🐸', '🐙', '🦖', '🦄', '🐝', '👻', '🥷', '👽', '👾', '🚀'];

export default function Sidebar({
  currentUserId,
  userProfile,
  currentConfig,
  activeChatId,
  onSelectChat,
  onNavigateToConsole,
  currentView,
  onSetView,
  onOpenProfileModal,
  onSignOut,
  isWindowedMode = false,
  onToggleMode
}: SidebarProps) {
  const [activeTab, setActiveTab] = useState<'chats' | 'groups' | 'calls' | 'settings'>('chats');
  const [chats, setChats] = useState<Chat[]>([]);
  const [availableUsers, setAvailableUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [targetUsername, setTargetUsername] = useState('');
  const [searchError, setSearchError] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // 1. Subscribe to active chats (direct & groups)
  useEffect(() => {
    if (!currentUserId) return;

    if (currentUserId.startsWith('demo_')) {
      // Offline / Demo fallback chat list
      const mockChat: Chat = {
        id: 'demo_chat_1',
        type: 'direct',
        members: [currentUserId, 'demo_user1'],
        createdAt: Date.now() - 3600000,
        lastMessageText: 'Привет! Это демо-режим. Сообщения сохраняются локально.',
        lastMessageAt: Date.now() - 3600000
      };
      setChats([mockChat]);
      return;
    }

    const q = query(
      collection(db, 'chats'),
      where('members', 'array-contains', currentUserId)
    );

    const unsub = onSnapshot(q, (snap) => {
      const chatList: Chat[] = [];
      snap.forEach((doc) => {
        chatList.push({ id: doc.id, ...doc.data() } as Chat);
      });
      // Sort by lastMessageAt descending
      chatList.sort((a, b) => (b.lastMessageAt || b.createdAt) - (a.lastMessageAt || a.createdAt));
      setChats(chatList);
    }, (error) => {
      console.warn("Could not subscribe to chats in real-time (offline/demo fallback):", error);
    });

    return unsub;
  }, [currentUserId]);

  // 2. Fetch all registered users to start chats
  const fetchAvailableUsers = async () => {
    if (!currentUserId) return;

    if (currentUserId.startsWith('demo_')) {
      const mockUsers: UserProfile[] = [
        { uid: 'demo_user1', username: 'МудрыйБобер_858', email: 'bober@demo.com', avatar: '🐶', status: 'online', role: 'user', createdAt: Date.now() },
        { uid: 'demo_user2', username: 'БыстрыйХомяк_492', email: 'hamster@demo.com', avatar: '🐹', status: 'online', role: 'user', createdAt: Date.now() },
        { uid: 'demo_user3', username: 'КосмическийКот_101', email: 'cat@demo.com', avatar: '🐱', status: 'offline', role: 'user', createdAt: Date.now() }
      ];
      setAvailableUsers(mockUsers);
      return;
    }

    try {
      const q = collection(db, 'users');
      const snap = await getDocs(q);
      const users: UserProfile[] = [];
      const seenUids = new Set<string>();
      snap.forEach((doc) => {
        const u = doc.data() as UserProfile;
        if (u.uid && u.uid !== currentUserId && !seenUids.has(u.uid)) {
          seenUids.add(u.uid);
          users.push(u);
        }
      });
      setAvailableUsers(users);
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  };

  useEffect(() => {
    if (showNewChat) {
      fetchAvailableUsers();
    }
  }, [showNewChat]);

  // 3. Create or Open a direct chat
  const handleStartDirectChat = async (targetUser: UserProfile) => {
    // Check if a direct chat with this user already exists
    const existing = chats.find(
      (c) => c.type === 'direct' && c.members.includes(targetUser.uid)
    );

    if (existing) {
      onSelectChat(existing);
      onSetView('chat');
      setShowNewChat(false);
      return;
    }

    if (currentUserId.startsWith('demo_')) {
      const newChat: Chat = {
        id: `demo_chat_${Date.now()}`,
        type: 'direct',
        members: [currentUserId, targetUser.uid],
        createdAt: Date.now(),
        lastMessageText: 'Чат создан анонимно',
        lastMessageAt: Date.now()
      };
      setChats([newChat, ...chats]);
      onSelectChat(newChat);
      onSetView('chat');
      setShowNewChat(false);
      return;
    }

    // Otherwise, create a new direct chat document
    try {
      const chatRef = await addDoc(collection(db, 'chats'), {
        type: 'direct',
        members: [currentUserId, targetUser.uid],
        createdAt: Date.now(),
        lastMessageText: 'Чат создан анонимно',
        lastMessageAt: Date.now()
      });

      const newChat: Chat = {
        id: chatRef.id,
        type: 'direct',
        members: [currentUserId, targetUser.uid],
        createdAt: Date.now(),
        lastMessageText: 'Чат создан анонимно',
        lastMessageAt: Date.now()
      };

      onSelectChat(newChat);
      onSetView('chat');
      setShowNewChat(false);
    } catch (err) {
      console.error("Error creating chat:", err);
    }
  };

  // 3.5. Search and start chat by username
  const handleSearchAndStartChat = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const queryName = targetUsername.trim();
    if (!queryName) {
      setSearchError('Введите никнейм пользователя');
      return;
    }

    setSearchError('');
    setIsSearching(true);

    try {
      const cleanQuery = queryName.toLowerCase();
      let foundUser: UserProfile | null = null;

      // 1. First, search locally in already loaded availableUsers
      if (availableUsers.length > 0) {
        const matched = availableUsers.find(u => 
          u.username.toLowerCase().includes(cleanQuery) || 
          (u.email || '').toLowerCase().includes(cleanQuery)
        );
        if (matched) {
          foundUser = matched;
        }
      }

      // 2. If not found, fetch all users from Firestore and search
      if (!foundUser) {
        const qAll = collection(db, 'users');
        const snapAll = await getDocs(qAll);
        const allUsers: UserProfile[] = [];
        snapAll.forEach((doc) => {
          const u = doc.data() as UserProfile;
          if (u.uid && u.uid !== currentUserId) {
            allUsers.push(u);
          }
        });

        const matched = allUsers.find(u => 
          u.username.toLowerCase().includes(cleanQuery) || 
          (u.email || '').toLowerCase().includes(cleanQuery)
        );
        if (matched) {
          foundUser = matched;
        }
      }

      if (foundUser) {
        await handleStartDirectChat(foundUser);
        setTargetUsername('');
        setSearchError('');
      } else {
        setSearchError('Пользователь по запросу "' + queryName + '" не найден.');
      }
    } catch (err) {
      console.error("Error searching for user:", err);
      setSearchError('Ошибка поиска собеседника. Попробуйте еще раз.');
    } finally {
      setIsSearching(false);
    }
  };

  // 4. Create group chat
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    try {
      const chatRef = await addDoc(collection(db, 'chats'), {
        type: 'group',
        name: newGroupName.trim(),
        createdBy: currentUserId,
        createdAt: Date.now(),
        members: [currentUserId],
        lastMessageText: 'Группа успешно создана',
        lastMessageAt: Date.now()
      });

      const newGroup: Chat = {
        id: chatRef.id,
        type: 'group',
        name: newGroupName.trim(),
        createdBy: currentUserId,
        createdAt: Date.now(),
        members: [currentUserId],
        lastMessageText: 'Группа успешно создана',
        lastMessageAt: Date.now()
      };

      onSelectChat(newGroup);
      onSetView('chat');
      setNewGroupName('');
      setShowCreateGroup(false);
    } catch (err) {
      console.error("Error creating group:", err);
    }
  };



  // Direct chat name/avatar resolvers
  const getDirectChatInfo = (chat: Chat) => {
    // If it's a direct chat, we need details of the OTHER user.
    // For mock-resilience or in case user isn't fetched yet, we can do client-side caching.
    // We will save user details as custom mapping later.
    return {
      name: chat.name || 'Анонимный Тугрик',
      avatar: '👤'
    };
  };

  // Theme support classes based on app config
  const getAccentBg = () => {
    switch (currentConfig.themeAccent) {
      case 'emerald': return 'bg-emerald-600 hover:bg-emerald-500 text-white';
      case 'indigo': return 'bg-indigo-600 hover:bg-indigo-500 text-white';
      case 'rose': return 'bg-rose-600 hover:bg-rose-500 text-white';
      case 'amber': return 'bg-amber-600 hover:bg-amber-500 text-slate-900';
      case 'sky': return 'bg-sky-600 hover:bg-sky-500 text-slate-900';
      default: return 'bg-gradient-to-r from-violet-600 to-emerald-600 hover:from-violet-500 hover:to-emerald-500 text-white shadow-lg shadow-emerald-950/40';
    }
  };

  const getAccentText = () => {
    switch (currentConfig.themeAccent) {
      case 'emerald': return 'text-emerald-400';
      case 'indigo': return 'text-indigo-400';
      case 'rose': return 'text-rose-400';
      case 'amber': return 'text-amber-400';
      case 'sky': return 'text-sky-400';
      default: return 'text-emerald-400';
    }
  };

  const getAccentBorder = () => {
    switch (currentConfig.themeAccent) {
      case 'emerald': return 'border-emerald-500/20';
      case 'indigo': return 'border-indigo-500/20';
      case 'rose': return 'border-rose-500/20';
      case 'amber': return 'border-amber-500/20';
      case 'sky': return 'border-sky-500/20';
      default: return 'border-emerald-500/20';
    }
  };

  return (
    <div className="w-full md:w-80 lg:w-96 border-t md:border-t-0 md:border-r border-slate-800 bg-slate-950 flex flex-col h-[390px] md:h-full flex-shrink-0 select-none">
      
      {/* Upper header with app name and creator console check */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => { onSetView('chat'); }}>
          <span className="text-2xl animate-bounce">🪙</span>
          <div>
            <h1 className="font-display font-bold text-lg tracking-tight bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
              Тугрик
            </h1>
            <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">Анонимная Сеть</p>
          </div>
        </div>

        {onToggleMode && (
          <button
            onClick={onToggleMode}
            className={`px-2 py-1 rounded-lg text-[9px] font-mono font-bold uppercase transition-all flex items-center gap-1 cursor-pointer border ${
              isWindowedMode
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
            }`}
            title={isWindowedMode ? "Перейти в обычный режим" : "Перейти в многооконный режим"}
          >
            {isWindowedMode ? (
              <>
                <Monitor className="w-3 h-3 text-emerald-400" />
                ОКНА: ВКЛ
              </>
            ) : (
              <>
                <LayoutGrid className="w-3 h-3 text-slate-400" />
                ОКНА: ВЫКЛ
              </>
            )}
          </button>
        )}
      </div>

      {/* Navigation tabs */}
      <div className="grid grid-cols-4 border-b border-slate-800/80 mx-2 mt-2 p-1 bg-slate-900/40 rounded-xl">
        <button
          onClick={(e) => { 
            setActiveTab('chats'); 
            onSetView('chat', { x: e.clientX, y: e.clientY }); 
          }}
          className={`flex flex-col items-center gap-1 py-1.5 text-[10px] font-medium rounded-lg transition-all cursor-pointer ${
            activeTab === 'chats' && currentView !== 'console'
              ? 'bg-slate-800 text-white shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          Личные
        </button>
        <button
          onClick={(e) => { 
            setActiveTab('groups'); 
            onSetView('chat', { x: e.clientX, y: e.clientY }); 
          }}
          className={`flex flex-col items-center gap-1 py-1.5 text-[10px] font-medium rounded-lg transition-all cursor-pointer ${
            activeTab === 'groups' && currentView !== 'console'
              ? 'bg-slate-800 text-white shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          Группы
        </button>
        <button
          onClick={(e) => { 
            setActiveTab('calls'); 
            if (isWindowedMode) {
              onSetView('calls', { x: e.clientX, y: e.clientY });
            } else {
              onSetView('chat');
            }
          }}
          className={`flex flex-col items-center gap-1 py-1.5 text-[10px] font-medium rounded-lg transition-all cursor-pointer relative ${
            activeTab === 'calls' && currentView !== 'console'
              ? 'bg-slate-800 text-white shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          disabled={!currentConfig.featureToggles?.voiceCalls && userProfile.role !== 'admin'}
        >
          {!currentConfig.featureToggles?.voiceCalls && userProfile.role !== 'admin' && (
            <span className="absolute -top-1 -right-1 text-[9px]">🔒</span>
          )}
          <Phone className="w-4 h-4" />
          Звонки
        </button>
        <button
          onClick={(e) => { 
            setActiveTab('settings'); 
            if (isWindowedMode) {
              onSetView('settings', { x: e.clientX, y: e.clientY });
            } else {
              onSetView('chat');
            }
          }}
          className={`flex flex-col items-center gap-1 py-1.5 text-[10px] font-medium rounded-lg transition-all cursor-pointer ${
            activeTab === 'settings' && currentView !== 'console'
              ? 'bg-slate-800 text-white shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Settings className="w-4 h-4" />
          Анонимка
        </button>
      </div>

      {/* SEARCH / INTERACTION BUTTON */}
      {currentView !== 'console' && activeTab !== 'settings' && (
        <div className="p-3">
          {activeTab === 'chats' && (
            <button
              onClick={() => setShowNewChat(true)}
              className={`w-full py-2 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold shadow-md transition-all cursor-pointer ${getAccentBg()}`}
            >
              <UserPlus className="w-4 h-4" />
              Начать анонимный диалог
            </button>
          )}

          {activeTab === 'groups' && (
            <button
              onClick={() => {
                if (!currentConfig.featureToggles?.groupCreation && userProfile.role !== 'admin') {
                  alert('Создание групп временно отключено создателем.');
                  return;
                }
                setShowCreateGroup(true);
              }}
              className={`w-full py-2 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold shadow-md transition-all cursor-pointer ${getAccentBg()}`}
            >
              <Plus className="w-4 h-4" />
              Создать новую группу
            </button>
          )}
        </div>
      )}

      {/* SIDEBAR MAIN CONTENT AREA */}
      <div className="flex-1 overflow-y-auto px-2">
        {currentView === 'console' ? (
          <div className="p-4 text-center">
            <div className="inline-flex p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl mb-3">
              <UserCheck className="w-6 h-6" />
            </div>
            <h4 className="text-xs font-mono font-bold uppercase text-indigo-300">Режим Создателя Активен</h4>
            <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
              Вы вошли в панель управления. Все настройки мессенджера можно изменить во вкладках справа.
            </p>
          </div>
        ) : activeTab === 'chats' ? (
          <div className="space-y-1">
            {chats.filter(c => c.type === 'direct').length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500 font-mono">
                Нет активных диалогов.<br />Нажмите «Начать диалог» выше.
              </div>
            ) : (
              chats
                .filter(c => c.type === 'direct')
                .map((chat) => {
                  const isActive = chat.id === activeChatId;
                  return (
                    <button
                      key={chat.id}
                      onClick={(e) => onSelectChat(chat, { x: e.clientX, y: e.clientY })}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                        isActive 
                          ? 'bg-slate-800 text-white' 
                          : 'hover:bg-slate-900/60 text-slate-300'
                      }`}
                    >
                      <div className="w-10 h-10 bg-slate-800 border border-slate-700 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                        💬
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-xs truncate">Личный чат</span>
                          {chat.lastMessageAt && (
                            <span className="text-[9px] text-slate-500 font-mono">
                              {new Date(chat.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">
                          {chat.lastMessageText || 'Сообщений пока нет'}
                        </p>
                      </div>
                    </button>
                  );
                })
            )}
          </div>
        ) : activeTab === 'groups' ? (
          <div className="space-y-1">
            {chats.filter(c => c.type === 'group').length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500 font-mono">
                Нет групп. Создайте свою или попросите создателя разблокировать функцию.
              </div>
            ) : (
              chats
                .filter(c => c.type === 'group')
                .map((chat) => {
                  const isActive = chat.id === activeChatId;
                  return (
                    <button
                      key={chat.id}
                      onClick={(e) => onSelectChat(chat, { x: e.clientX, y: e.clientY })}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                        isActive 
                          ? 'bg-slate-800 text-white' 
                          : 'hover:bg-slate-900/60 text-slate-300'
                      }`}
                    >
                      <div className="w-10 h-10 bg-indigo-950/40 border border-indigo-900/50 rounded-xl flex items-center justify-center text-sm flex-shrink-0">
                        <Hash className="w-4 h-4 text-indigo-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs truncate">{chat.name}</span>
                          <span className="text-[9px] text-indigo-400/80 font-mono">
                            {chat.members?.length || 1} участников
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">
                          {chat.lastMessageText || 'Нет сообщений'}
                        </p>
                      </div>
                    </button>
                  );
                })
            )}
          </div>
        ) : activeTab === 'calls' ? (
          <div className="p-3">
            {/* Direct dial capability or dialing instructions */}
            <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl text-center">
              <span className="text-3xl block mb-2">📞</span>
              <h4 className="text-xs font-bold text-slate-200">Голосовая Анонимная Сеть</h4>
              <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                Чтобы позвонить собеседнику, откройте любой Личный Чат и нажмите кнопку <strong>Позвонить</strong> в верхнем правом углу!
              </p>
            </div>

            {/* List of announcements */}
            <div className="mt-4 border-t border-slate-900 pt-3">
              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block mb-2">Объявления от Создателя</span>
              {currentConfig.announcements && currentConfig.announcements.length > 0 ? (
                <div className="space-y-2">
                  {currentConfig.announcements.slice(0, 2).map((ann) => (
                    <div key={ann.id} className="bg-slate-900/40 border border-slate-800/80 p-2.5 rounded-xl">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                        <Megaphone className="w-3 h-3 text-indigo-400" />
                        <span>{ann.title}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">{ann.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-slate-500 font-mono">Объявлений пока нет.</p>
              )}
            </div>
          </div>
        ) : (
          /* SETTINGS TAB */
          <div className="p-4 animate-fade-in space-y-5">
            {/* Profile Overview Card */}
            <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl text-center space-y-4 relative overflow-hidden group">
              {/* Soft purple accent background */}
              <div className="absolute top-0 right-0 w-16 h-16 bg-violet-500/10 rounded-full blur-xl group-hover:bg-violet-500/20 transition-all duration-500"></div>
              
              <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-tr from-slate-950 to-slate-900 border border-slate-800 flex items-center justify-center text-4xl shadow-inner relative">
                <span>{userProfile.avatar || '🤖'}</span>
                <span className="absolute bottom-1 right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-900 rounded-full"></span>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-100">@{userProfile.username}</h4>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">{userProfile.email || 'Анонимный аккаунт'}</p>
              </div>

              <button
                type="button"
                onClick={(e) => onOpenProfileModal({ x: e.clientX, y: e.clientY })}
                className={`w-full py-2.5 rounded-xl text-xs font-semibold shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 ${getAccentBg()}`}
              >
                <Settings className="w-3.5 h-3.5" />
                Редактировать профиль
              </button>
            </div>

            {/* System Info */}
            <div className="p-4 bg-slate-900/40 border border-slate-800/60 rounded-2xl space-y-2">
              <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest block mb-1">Системные сведения</span>
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Ваш UID:</span>
                <span className="font-mono text-slate-500 select-all" title={currentUserId}>{currentUserId.slice(0, 12)}...</span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Ваш Email:</span>
                <span className="font-mono text-slate-500 truncate max-w-[150px]">{userProfile.email || 'Анонимно'}</span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Права доступа:</span>
                <span className="font-mono text-slate-500 capitalize">{userProfile.role}</span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Версия клиента:</span>
                <span className="font-mono text-slate-500">v1.2.0-secure</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CREATOR PANEL ACCESSIBILITY (Relocated to bottom) */}
      {((userProfile.email === 'faster123455677@gmail.com' || userProfile.role === 'admin') || currentConfig.creatorCustomText) && (
        <div className="p-3 border-t border-slate-800/80 bg-slate-900/10 space-y-2.5">
          {/* Creator console indicator button */}
          {(userProfile.email === 'faster123455677@gmail.com' || userProfile.role === 'admin') && (
            <button
              onClick={onNavigateToConsole}
              className={`w-full py-2 px-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                currentView === 'console'
                  ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-400'
                  : 'bg-slate-950/70 hover:bg-slate-950 border-slate-800 text-slate-300'
              }`}
              title="Панель Создателя (God Mode)"
            >
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 animate-pulse text-emerald-400" />
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider">Панель Создателя</span>
              </div>
              <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded text-emerald-400 font-mono">GOD MODE</span>
            </button>
          )}

          {/* Creator custom notice message */}
          {currentConfig.creatorCustomText && (
            <div className="px-3 py-2 bg-slate-950/40 border border-slate-800/60 rounded-xl text-[10px] text-slate-400 leading-relaxed relative overflow-hidden">
              <div className="absolute top-0 left-0 w-0.5 h-full bg-gradient-to-b from-emerald-500 to-indigo-500"></div>
              <span className="font-semibold block text-[9px] text-emerald-400 uppercase font-mono tracking-wide mb-0.5">💡 Записка Создателя</span>
              {currentConfig.creatorCustomText}
            </div>
          )}
        </div>
      )}

      {/* PERSISTENT SIDEBAR FOOTER (User Profile Shortcut & Settings Access) */}
      <div className="p-3 border-t border-slate-800 bg-slate-900/40 flex items-center justify-between gap-2">
        <button
          onClick={(e) => onOpenProfileModal({ x: e.clientX, y: e.clientY })}
          className="flex-1 flex items-center gap-2 px-3 py-2 bg-slate-950/70 hover:bg-slate-950 border border-slate-800 hover:border-slate-700/80 rounded-xl text-left transition-all cursor-pointer group"
          title="Настройки профиля"
        >
          <span className="text-lg group-hover:scale-110 transition-transform">{userProfile.avatar || '🤖'}</span>
          <div className="flex-1 min-w-0">
            <span className="text-slate-200 text-xs font-semibold block truncate group-hover:text-emerald-400 transition-colors">
              {userProfile.username}
            </span>
            <span className="text-[9px] text-slate-500 font-mono block">Профиль и Настройки ⚙️</span>
          </div>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50"></span>
        </button>

        <button
          onClick={onSignOut}
          className="p-2.5 bg-slate-950/70 hover:bg-rose-600/20 border border-slate-800 hover:border-rose-500/20 text-slate-400 hover:text-rose-400 rounded-xl transition-all cursor-pointer"
          title="Выйти из сети Tugrik"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* NEW DIRECT DIALOG MODAL */}
      {showNewChat && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl"></div>
            
            <h3 className="font-display font-bold text-sm text-slate-200 mb-2 flex items-center gap-1.5 relative z-10">
              <UserPlus className="w-4 h-4 text-emerald-400" />
              Начать анонимный диалог
            </h3>
            
            <p className="text-[10px] text-slate-400 mb-4 font-mono leading-relaxed relative z-10">
              Введите точный анонимный никнейм собеседника, чтобы мгновенно начать с ним защищенный диалог.
            </p>

            {/* USERNAME SEARCH FORM */}
            <form onSubmit={handleSearchAndStartChat} className="space-y-3 mb-5 relative z-10">
              <div>
                <label className="block text-[10px] font-mono text-slate-500 mb-1.5 uppercase tracking-wider">
                  Никнейм собеседника
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-mono">@</span>
                  <input
                    type="text"
                    value={targetUsername}
                    onChange={(e) => {
                      setTargetUsername(e.target.value);
                      setSearchError('');
                    }}
                    placeholder="Например: ШустрыйХомяк_492"
                    className="w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                    disabled={isSearching}
                    required
                  />
                </div>
              </div>

              {searchError && (
                <div className="text-[10px] text-rose-400 font-mono bg-rose-500/10 border border-rose-500/20 px-2.5 py-1.5 rounded-lg">
                  ⚠️ {searchError}
                </div>
              )}

              <button
                type="submit"
                disabled={isSearching}
                className="w-full py-2.5 bg-gradient-to-r from-violet-600 to-emerald-600 hover:from-violet-500 hover:to-emerald-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-emerald-950/40 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSearching ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Поиск...
                  </>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5" />
                    Найти и начать чат ✨
                  </>
                )}
              </button>
            </form>

            <div className="relative my-4 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800/80"></div>
              </div>
              <span className="relative px-2.5 bg-slate-900 text-[9px] uppercase font-mono tracking-widest text-slate-500">
                Или выберите из сети
              </span>
            </div>

            {/* QUICK LIST OF USERS */}
            <div className="max-h-40 overflow-y-auto space-y-1 pr-1 scrollbar-thin scrollbar-thumb-slate-800">
              {availableUsers.length === 0 ? (
                <div className="text-center py-4 text-[10px] text-slate-600 font-mono">
                  Собеседники пока не найдены.<br />Нажмите «Обновить» ниже.
                </div>
              ) : (
                availableUsers.map((user) => (
                  <button
                    key={user.uid}
                    onClick={() => handleStartDirectChat(user)}
                    className="w-full flex items-center gap-2.5 p-2 bg-slate-950/60 hover:bg-slate-950 border border-slate-800/40 hover:border-slate-700/60 rounded-xl text-left transition-all cursor-pointer group"
                  >
                    <span className="text-lg group-hover:scale-110 transition-transform">{user.avatar || '🤖'}</span>
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-[11px] text-slate-300 block truncate group-hover:text-emerald-400 transition-colors">
                        {user.username}
                      </span>
                    </div>
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      user.status === 'online' ? 'bg-emerald-500' : 'bg-slate-700'
                    }`} />
                  </button>
                ))
              )}
            </div>

            <div className="flex gap-2 mt-4 pt-4 border-t border-slate-800/60">
              <button
                onClick={fetchAvailableUsers}
                type="button"
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                Обновить
              </button>
              <button
                onClick={() => {
                  setShowNewChat(false);
                  setTargetUsername('');
                  setSearchError('');
                }}
                type="button"
                className="flex-1 py-1.5 bg-slate-950 border border-slate-800 text-slate-400 text-[10px] font-semibold rounded-lg hover:text-slate-200 transition-colors cursor-pointer"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE GROUP CHAT MODAL */}
      {showCreateGroup && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form onSubmit={handleCreateGroup} className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
            <div>
              <h3 className="font-display font-bold text-sm text-slate-200 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-violet-400" />
                Создать новую группу
              </h3>
              <p className="text-[10px] text-slate-400 mt-1 font-mono">
                Группы в Тугрике поддерживают до 100 участников с возможностью отправки сообщений.
              </p>
            </div>

            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wide mb-1">Название Группы</label>
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="КриптоАнархисты 🪙"
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-500 transition-colors"
                maxLength={30}
                required
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowCreateGroup(false)}
                className="flex-1 py-2 bg-slate-950 border border-slate-800 text-slate-400 text-xs font-semibold rounded-xl hover:text-slate-200 transition-colors cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="submit"
                className={`flex-1 py-2 rounded-xl text-xs font-semibold shadow-md transition-all cursor-pointer ${getAccentBg()}`}
              >
                Создать Группу
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
