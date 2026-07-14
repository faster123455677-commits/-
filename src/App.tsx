import React, { useState, useEffect } from 'react';
import { auth, db, signOut } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, updateDoc, collection, query, where, addDoc } from 'firebase/firestore';
import { UserProfile, Chat, Call, AppConfig, WindowInstance } from './types';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import CallScreen from './components/CallScreen';
import CreatorConsole from './components/CreatorConsole';
import ProfileSettingsModal, { ProfileSettingsForm } from './components/ProfileSettingsModal';
import DesktopWindow from './components/Window';
import { Shield, Sparkles, LogOut, Radio, Bell, Monitor, LayoutGrid } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [currentView, setCurrentView] = useState<'chat' | 'console'>('chat');
  
  // Real-time call tracking
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Window Manager States
  const [isWindowedMode, setIsWindowedMode] = useState(true);
  const [windows, setWindows] = useState<WindowInstance[]>([]);
  const [timeStr, setTimeStr] = useState('');

  // Custom Window Spawn States
  const [spawnMode, setSpawnMode] = useState<'cascade' | 'click' | 'cursor'>(() => {
    return (localStorage.getItem('spawn_mode') as 'cascade' | 'click' | 'cursor') || 'click';
  });
  const [chosenSpawnCoords, setChosenSpawnCoords] = useState<{ x: number; y: number } | null>(() => {
    const saved = localStorage.getItem('chosen_spawn_coords');
    return saved ? JSON.parse(saved) : null;
  });
  const [showTargetAnimation, setShowTargetAnimation] = useState(false);
  const [targetAnimCoords, setTargetAnimCoords] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);



  // 1. Listen for authentication states & Demo state
  useEffect(() => {
    const savedDemoUser = localStorage.getItem('demo_user');
    if (savedDemoUser) {
      try {
        const parsed = JSON.parse(savedDemoUser);
        setCurrentUser(parsed.user);
        setUserProfile(parsed.profile);
        setAuthLoading(false);
        return;
      } catch (e) {
        localStorage.removeItem('demo_user');
      }
    }

    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (!user) {
        setUserProfile(null);
        setAuthLoading(false);
      }
    });
    return unsub;
  }, []);

  // 1.1. Autoload timeout fallback to prevent hanging forever
  useEffect(() => {
    if (currentUser && authLoading) {
      const timer = setTimeout(() => {
        console.warn("Auth/profile subscription taking too long. Activating fallback.");
        const fallbackProfile: UserProfile = {
          uid: currentUser.uid,
          username: currentUser.displayName || `Тугрик_${currentUser.uid.slice(0, 5)}`,
          email: currentUser.email,
          avatar: '🤖',
          status: 'online',
          role: currentUser.email === 'faster123455677@gmail.com' ? 'admin' : 'user',
          createdAt: Date.now()
        };
        setUserProfile(fallbackProfile);
        setAuthLoading(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [currentUser, authLoading]);

  // 2. Fetch or create user profile on login
  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.uid.startsWith('demo_')) return; // Skip Firestore setup for demo user

    const userRef = doc(db, 'users', currentUser.uid);
    let isSubscribed = true;
    let unsubProfile: (() => void) | null = null;

    const setupProfile = async () => {
      let snapExists = false;
      let existingData: UserProfile | null = null;
      
      // 1. Try to proactively read the profile document first to see if it already exists
      try {
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          snapExists = true;
          existingData = snap.data() as UserProfile;
        }
      } catch (getErr) {
        console.warn("Proactive user profile getDoc check failed (or was blocked by auth transition):", getErr);
      }

      if (!isSubscribed) return;

      // 2. If it does not exist, create it proactively
      if (!snapExists) {
        const pendingName = localStorage.getItem('pending_tugrik_username') || `Тугрик_${Math.floor(1000 + Math.random() * 9000)}`;
        localStorage.removeItem('pending_tugrik_username');

        const initialAvatar = ['🤖', '🦊', '🐱', '🐶', '🥷', '👾'][Math.floor(Math.random() * 6)];
        
        const newProfile: UserProfile = {
          uid: currentUser.uid,
          username: pendingName,
          usernameLower: pendingName.toLowerCase(),
          email: currentUser.email,
          avatar: initialAvatar,
          status: 'online',
          role: currentUser.email === 'faster123455677@gmail.com' ? 'admin' : 'user',
          createdAt: Date.now()
        };

        try {
          await setDoc(userRef, newProfile);
          console.log("Proactively saved new user profile in Firestore:", newProfile);
          if (isSubscribed) {
            setUserProfile(newProfile);
            setAuthLoading(false);
          }
        } catch (setErr) {
          console.error("Critical: Failed to proactively setDoc user profile:", setErr);
        }
      } else if (existingData) {
        // Document exists, update status and set state
        if (isSubscribed) {
          setUserProfile(existingData);
          setAuthLoading(false);
        }
        await updateDoc(userRef, { status: 'online' }).catch(err => {
          console.warn("Could not set status to online:", err);
        });
      }

      // 3. Set up the real-time listener to sync changes (e.g. status updates)
      try {
        unsubProfile = onSnapshot(userRef, (snap) => {
          if (!isSubscribed) return;
          if (snap.exists()) {
            setUserProfile(snap.data() as UserProfile);
            setAuthLoading(false);
          } else {
            // Re-create if document was deleted or doesn't exist
            const pendingName = `Тугрик_${Math.floor(1000 + Math.random() * 9000)}`;
            const initialAvatar = ['🤖', '🦊', '🐱', '🐶', '🥷', '👾'][Math.floor(Math.random() * 6)];
            const newProfile: UserProfile = {
              uid: currentUser.uid,
              username: pendingName,
              usernameLower: pendingName.toLowerCase(),
              email: currentUser.email,
              avatar: initialAvatar,
              status: 'online',
              role: currentUser.email === 'faster123455677@gmail.com' ? 'admin' : 'user',
              createdAt: Date.now()
            };
            setDoc(userRef, newProfile).catch(e => console.error("Error re-creating profile in snapshot:", e));
          }
        }, (error) => {
          console.warn("Firestore Profile snapshot subscription failed:", error);
          if (isSubscribed) {
            // Set fallback profile if we don't have one yet
            setUserProfile((prev) => {
              if (prev) return prev;
              return {
                uid: currentUser.uid,
                username: currentUser.displayName || `Тугрик_${currentUser.uid.slice(0, 5)}`,
                email: currentUser.email,
                avatar: '🤖',
                status: 'online',
                role: currentUser.email === 'faster123455677@gmail.com' ? 'admin' : 'user',
                createdAt: Date.now()
              };
            });
            setAuthLoading(false);
          }
        });
      } catch (subErr) {
        console.error("Failed to attach snapshot profile listener:", subErr);
        if (isSubscribed) {
          setAuthLoading(false);
        }
      }
    };

    setupProfile();

    return () => {
      isSubscribed = false;
      if (unsubProfile) {
        unsubProfile();
      }
    };
  }, [currentUser]);

  // 3. Keep user profile status "online" and set to "offline" when window closes
  useEffect(() => {
    if (!currentUser || currentUser.uid.startsWith('demo_')) return;

    const handleBeforeUnload = () => {
      const userRef = doc(db, 'users', currentUser.uid);
      updateDoc(userRef, { status: 'offline' }).catch(() => {});
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentUser]);

  // 4. Subscribe to App Configuration (Announcements, Feature toggles, theme)
  useEffect(() => {
    const defaultConfig: AppConfig = {
      announcements: [
        {
          id: 'welcome',
          title: 'Добро пожаловать в мессенджер «Тугрик»!',
          content: 'Мы запустили зашифрованный чат, голосовые и видеозвонки, а также систему групповых каналов. Создатель может гибко настраивать функции.',
          createdAt: Date.now()
        }
      ],
      featureToggles: {
        voiceCalls: true,
        groupCreation: true,
        anonymousMode: true,
        themeSelection: true
      },
      creatorCustomText: 'Спасибо, что выбрали Тугрик! Наш мессенджер полностью анонимен. Ваши переписки защищены.',
      themeAccent: 'violet'
    };

    if (!currentUser || currentUser.uid.startsWith('demo_')) {
      setAppConfig(defaultConfig);
      return;
    }

    const configRef = doc(db, 'settings', 'app_config');
    
    const unsubConfig = onSnapshot(configRef, async (snap) => {
      try {
        if (snap.exists()) {
          setAppConfig(snap.data() as AppConfig);
        } else {
          // App config does not exist, initialize with default values
          await setDoc(configRef, defaultConfig).catch(() => {});
          setAppConfig(defaultConfig);
        }
      } catch (err) {
        console.warn("Could not create defaultConfig in Firestore, using client-side fallback:", err);
        setAppConfig(defaultConfig);
      }
    }, (error) => {
      console.warn("Could not subscribe to app configuration in Firestore (using offline/client-side fallback):", error);
      setAppConfig(defaultConfig);
    });

    return unsubConfig;
  }, [currentUser]);

  // 5. Active Call Listener (Listen for incoming calls)
  useEffect(() => {
    if (!currentUser || currentUser.uid.startsWith('demo_')) {
      setActiveCall(null);
      return;
    }

    // Listen to calls where the current user is the receiver and status is 'ringing' or 'dialing'
    const qIncoming = query(
      collection(db, 'calls'),
      where('receiverId', '==', currentUser.uid),
      where('status', 'in', ['dialing', 'ringing', 'connected'])
    );

    let unsubOutgoing: (() => void) | null = null;

    const unsubIncoming = onSnapshot(qIncoming, (snap) => {
      if (!snap.empty) {
        // Take the first active call
        const firstCall = snap.docs[0];
        setActiveCall({ id: firstCall.id, ...firstCall.data() } as Call);
      } else {
        // If no incoming call, check if there is an outgoing call started by the user that is still active
        const qOutgoing = query(
          collection(db, 'calls'),
          where('callerId', '==', currentUser.uid),
          where('status', 'in', ['dialing', 'ringing', 'connected'])
        );

        getDocFromServerOrState(qOutgoing);
      }
    }, (error) => {
      console.warn("Active call listener incoming failed:", error);
    });

    // Helper helper to avoid multiple listener races
    const getDocFromServerOrState = (qOutgoing: any) => {
      if (unsubOutgoing) {
        unsubOutgoing();
      }
      unsubOutgoing = onSnapshot(qOutgoing, (outgoingSnap) => {
        if (!outgoingSnap.empty) {
          const firstCall = outgoingSnap.docs[0];
          setActiveCall({ id: firstCall.id, ...firstCall.data() } as Call);
        } else {
          setActiveCall(null);
        }
      }, (error) => {
        console.warn("Active call listener outgoing failed:", error);
      });
    };

    return () => {
      unsubIncoming();
      if (unsubOutgoing) {
        unsubOutgoing();
      }
    };
  }, [currentUser]);

  // Initiate call helper
  const handleInitiateCall = async (receiverId: string, type: 'voice' | 'video') => {
    if (!currentUser || !userProfile) return;

    try {
      const callRef = await addDoc(collection(db, 'calls'), {
        callerId: currentUser.uid,
        callerName: userProfile.username,
        callerAvatar: userProfile.avatar || '🤖',
        receiverId: receiverId,
        status: 'ringing',
        type: type,
        createdAt: Date.now()
      });

      setActiveCall({
        id: callRef.id,
        callerId: currentUser.uid,
        callerName: userProfile.username,
        callerAvatar: userProfile.avatar || '🤖',
        receiverId: receiverId,
        status: 'ringing',
        type: type,
        createdAt: Date.now()
      });
    } catch (err) {
      console.error("Error creating outgoing call:", err);
    }
  };

  const openWindow = (
    type: 'chat' | 'console' | 'profile' | 'calls' | 'settings' | 'new_chat' | 'new_group',
    title: string,
    icon: string = '📂',
    chatData: Chat | null = null,
    eventCoords?: { x: number; y: number }
  ) => {
    const id = type === 'chat' && chatData ? `chat_${chatData.id}` : type;

    setWindows((prev) => {
      const existing = prev.find((w) => w.id === id);
      const maxZ = prev.reduce((max, w) => Math.max(max, w.zIndex), 10);
      
      if (existing) {
        return prev.map((w) => 
          w.id === id 
            ? { ...w, isMinimized: false, zIndex: maxZ + 1 } 
            : w
        );
      }

      let width = 600;
      let height = 500;
      if (type === 'chat') {
        width = 620;
        height = 580;
      } else if (type === 'console') {
        width = 850;
        height = 600;
      } else if (type === 'profile') {
        width = 460;
        height = 500;
      } else if (type === 'settings') {
        width = 440;
        height = 360;
      } else if (type === 'calls') {
        width = 500;
        height = 480;
      }

      const viewport = document.getElementById('desktop-viewport');
      const viewportWidth = viewport ? viewport.clientWidth : window.innerWidth;
      const viewportHeight = viewport ? viewport.clientHeight : window.innerHeight;

      let initialX = 0;
      let initialY = 0;

      if (spawnMode === 'cursor' && eventCoords && viewport) {
        const rect = viewport.getBoundingClientRect();
        // Center window on cursor click relative to viewport
        initialX = eventCoords.x - rect.left - (width / 2);
        initialY = eventCoords.y - rect.top - (height / 2);
      } else if (spawnMode === 'click' && chosenSpawnCoords) {
        // Center window on user-chosen spot
        initialX = chosenSpawnCoords.x - (width / 2);
        initialY = chosenSpawnCoords.y - (height / 2);
      } else if (spawnMode === 'click') {
        // Fallback to center of desktop
        initialX = (viewportWidth / 2) - (width / 2);
        initialY = (viewportHeight / 2) - (height / 2);
      } else {
        // Cascade mode
        const offsetCount = prev.length % 6;
        initialX = 30 + offsetCount * 30;
        initialY = 30 + offsetCount * 25;
      }

      // Clamp coordinates to keep window fully inside the viewport
      initialX = Math.max(10, Math.min(initialX, viewportWidth - width - 10));
      initialY = Math.max(10, Math.min(initialY, viewportHeight - height - 50));

      const newWin: WindowInstance = {
        id,
        title,
        icon,
        x: initialX,
        y: initialY,
        width,
        height,
        isMinimized: false,
        isMaximized: type === 'chat',
        zIndex: maxZ + 1,
        type,
        chatData
      };

      return [...prev, newWin];
    });
  };

  const handleDesktopClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    // Do not change spawn coords if clicking any button, window, input, textarea, or anchor tag
    if (
      target.closest('button') || 
      target.closest('.window-component') || 
      target.closest('input') || 
      target.closest('textarea') ||
      target.closest('a')
    ) {
      return;
    }
    
    const viewport = document.getElementById('desktop-viewport');
    if (viewport) {
      const rect = viewport.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      setChosenSpawnCoords({ x, y });
      localStorage.setItem('chosen_spawn_coords', JSON.stringify({ x, y }));
      
      setTargetAnimCoords({ x, y });
      setShowTargetAnimation(true);
      
      // Auto switch to click mode so that they see it works
      setSpawnMode('click');
      localStorage.setItem('spawn_mode', 'click');
      
      setTimeout(() => {
        setShowTargetAnimation(false);
      }, 1000);
    }
  };

  const closeWindow = (id: string) => {
    setWindows((prev) => prev.filter((w) => w.id !== id));
  };

  const minimizeWindow = (id: string) => {
    setWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, isMinimized: true } : w))
    );
  };

  const toggleMaximizeWindow = (id: string) => {
    setWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, isMaximized: !w.isMaximized } : w))
    );
  };

  const focusWindow = (id: string) => {
    setWindows((prev) => {
      const maxZ = prev.reduce((max, w) => Math.max(max, w.zIndex), 10);
      return prev.map((w) => (w.id === id ? { ...w, zIndex: maxZ + 1 } : w));
    });
  };

  const moveWindow = (id: string, x: number, y: number) => {
    setWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, x, y } : w))
    );
  };

  const resizeWindow = (id: string, width: number, height: number) => {
    setWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, width, height } : w))
    );
  };

  const renderWindowContent = (win: WindowInstance) => {
    switch (win.type) {
      case 'chat':
        return (
          <ChatArea
            currentUserId={currentUser!.uid}
            userProfile={userProfile!}
            currentConfig={appConfig!}
            chat={win.chatData || null}
            onInitiateCall={handleInitiateCall}
            onSelectChat={(chat) => {
              setWindows(prev => prev.map(w => w.id === win.id ? { ...w, chatData: chat } : w));
            }}
            onCloseChat={() => closeWindow(win.id)}
          />
        );
      case 'console':
        return (
          <CreatorConsole
            currentConfig={appConfig!}
            userProfile={userProfile!}
          />
        );
      case 'profile':
        return (
          <div className="p-6 overflow-y-auto h-full bg-slate-950 flex flex-col">
            <div className="flex items-center gap-2 mb-4 border-b border-slate-800/60 pb-3">
              <span className="text-xl">👤</span>
              <h3 className="text-xs font-semibold font-mono uppercase tracking-wider text-slate-400">Настройки Профиля</h3>
            </div>
            <ProfileSettingsForm
              userProfile={userProfile!}
              currentConfig={appConfig!}
              onSave={handleSaveProfile}
              onClose={() => closeWindow(win.id)}
            />
          </div>
        );
      case 'settings':
        return (
          <div className="p-6 overflow-y-auto h-full bg-slate-950 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800/60 pb-3">
              <span className="text-xl">⚙️</span>
              <h3 className="text-xs font-semibold font-mono uppercase tracking-wider text-slate-400">Параметры Системы</h3>
            </div>
            <div className="p-4 bg-slate-900/40 border border-slate-800/60 rounded-2xl space-y-2">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Ваш UID:</span>
                <span className="font-mono text-slate-500 select-all">{currentUser!.uid}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-400">
                <span>Ваш Email:</span>
                <span className="font-mono text-slate-500">{userProfile!.email || 'Анонимно'}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-400">
                <span>Права доступа:</span>
                <span className="font-mono text-slate-500 capitalize">{userProfile!.role}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-400">
                <span>Режим соединения:</span>
                <span className="font-mono text-emerald-400">Анонимный & Зашифрованный</span>
              </div>
              <div className="flex justify-between text-xs text-slate-400">
                <span>Версия ПО:</span>
                <span className="font-mono text-slate-500">v1.2.0-secure</span>
              </div>
            </div>
            <div className="p-4 bg-slate-900/40 border border-slate-800/60 rounded-2xl space-y-3">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block">Место открытия новых окон</span>
              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={() => {
                    setSpawnMode('cascade');
                    localStorage.setItem('spawn_mode', 'cascade');
                  }}
                  className={`px-3 py-2 rounded-xl text-left text-xs font-mono border transition-all cursor-pointer flex items-center justify-between ${
                    spawnMode === 'cascade'
                      ? 'bg-violet-500/15 border-violet-500/55 text-violet-300'
                      : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <span>📡 Умный каскад (по умолчанию)</span>
                  {spawnMode === 'cascade' && <span className="text-[9px] bg-violet-500/20 px-1.5 py-0.5 rounded text-violet-400">Активно</span>}
                </button>
                <button
                  onClick={() => {
                    setSpawnMode('click');
                    localStorage.setItem('spawn_mode', 'click');
                  }}
                  className={`px-3 py-2 rounded-xl text-left text-xs font-mono border transition-all cursor-pointer flex items-center justify-between ${
                    spawnMode === 'click'
                      ? 'bg-violet-500/15 border-violet-500/55 text-violet-300'
                      : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <span>🎯 Клик по рабочему столу (выбранное место)</span>
                  {spawnMode === 'click' && <span className="text-[9px] bg-violet-500/20 px-1.5 py-0.5 rounded text-violet-400">Активно</span>}
                </button>
                <button
                  onClick={() => {
                    setSpawnMode('cursor');
                    localStorage.setItem('spawn_mode', 'cursor');
                  }}
                  className={`px-3 py-2 rounded-xl text-left text-xs font-mono border transition-all cursor-pointer flex items-center justify-between ${
                    spawnMode === 'cursor'
                      ? 'bg-violet-500/15 border-violet-500/55 text-violet-300'
                      : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <span>🖱️ В месте клика (под курсором)</span>
                  {spawnMode === 'cursor' && <span className="text-[9px] bg-violet-500/20 px-1.5 py-0.5 rounded text-violet-400">Активно</span>}
                </button>
              </div>
              {spawnMode === 'click' && (
                <div className="text-[10px] text-slate-400 font-mono leading-relaxed bg-slate-950/50 p-2.5 rounded-xl border border-slate-850 space-y-1">
                  <p className="text-amber-400/90 font-semibold">📍 Как выбрать место:</p>
                  <p>Кликните в любое пустое место на обоях рабочего стола. На месте клика появится индикатор мишени 🎯.</p>
                  <p className="text-slate-500 mt-1">Текущие координаты спавна: <strong className="text-slate-300 font-mono">{chosenSpawnCoords ? `${Math.round(chosenSpawnCoords.x)}px, ${Math.round(chosenSpawnCoords.y)}px` : 'Центр экрана'}</strong></p>
                </div>
              )}
            </div>
            <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl text-[10px] leading-relaxed text-slate-400">
              🔒 Все сообщения шифруются на стороне клиента с помощью алгоритма AES-256. Ключи дешифрования хранятся исключительно в оперативной памяти вашего браузера.
            </div>
          </div>
        );
      case 'calls':
        return (
          <div className="p-6 overflow-y-auto h-full bg-slate-950 space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-3 border-b border-slate-800/60 pb-2">
                <span className="text-xl">📞</span>
                <h3 className="text-xs font-semibold font-mono uppercase tracking-wider text-slate-400">Голосовые анонимные вызовы</h3>
              </div>
              <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-xl text-center space-y-2">
                <span className="text-2xl block">📞</span>
                <p className="text-xs text-slate-300">Прямой вызов защищен сквозным шифрованием (E2EE)</p>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Для совершения вызова откройте окно нужного личного чата и нажмите на кнопку <strong>Позвонить</strong> в верхнем меню.
                </p>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3 border-b border-slate-800/60 pb-2">
                <span className="text-xl">📢</span>
                <h3 className="text-xs font-semibold font-mono uppercase tracking-wider text-slate-400">Новости и Объявления от Создателя</h3>
              </div>
              {appConfig!.announcements && appConfig!.announcements.length > 0 ? (
                <div className="space-y-3">
                  {appConfig!.announcements.map((ann) => (
                    <div key={ann.id} className="bg-slate-900/30 border border-slate-800/80 p-3.5 rounded-xl">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                        <span className="text-emerald-400">📢</span>
                        <span>{ann.title}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{ann.content}</p>
                      <span className="text-[9px] text-slate-500 font-mono mt-2 block">
                        {new Date(ann.createdAt).toLocaleDateString()} в {new Date(ann.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 font-mono">Объявлений пока нет.</p>
              )}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const handleDemoLogin = (username: string) => {
    const demoUid = `demo_${Math.floor(100000 + Math.random() * 900000)}`;
    const mockUser = {
      uid: demoUid,
      email: 'demo@tugrik.local',
      displayName: username,
    } as any;
    
    const mockProfile: UserProfile = {
      uid: demoUid,
      username: username,
      email: 'demo@tugrik.local',
      avatar: ['🤖', '🦊', '🐱', '🐶', '🥷', '👾'][Math.floor(Math.random() * 6)],
      status: 'online',
      role: 'user',
      createdAt: Date.now()
    };

    localStorage.setItem('demo_user', JSON.stringify({ user: mockUser, profile: mockProfile }));
    setCurrentUser(mockUser);
    setUserProfile(mockProfile);
    setAuthLoading(false);
  };

  const handleLoginSuccess = (user: User, customUsername?: string) => {
    if (customUsername) {
      localStorage.setItem('pending_tugrik_username', customUsername);
    }
    setCurrentUser(user);
  };

  const handleSignOut = async () => {
    localStorage.removeItem('demo_user');
    localStorage.removeItem('pending_tugrik_username');
    
    // Save current user ref to execute Firestore logout asynchronously
    const savedUser = currentUser;

    // Reset UI states immediately so it acts instantly
    setCurrentUser(null);
    setUserProfile(null);
    setActiveChat(null);
    setCurrentView('chat');
    setAuthLoading(false);

    if (savedUser && !savedUser.uid.startsWith('demo_')) {
      const userRef = doc(db, 'users', savedUser.uid);
      // Run background asynchronous updates without awaiting
      updateDoc(userRef, { status: 'offline' }).catch(() => {});
      signOut(auth).catch(() => {});
    }
  };

  const handleSaveProfile = async (newUsername: string, newAvatar: string) => {
    if (!currentUser || !userProfile) return;

    if (currentUser.uid.startsWith('demo_')) {
      const updatedProfile: UserProfile = {
        ...userProfile,
        username: newUsername,
        avatar: newAvatar,
      };
      setUserProfile(updatedProfile);
      const mockUser = {
        uid: currentUser.uid,
        email: currentUser.email,
        displayName: newUsername,
      };
      localStorage.setItem('demo_user', JSON.stringify({ user: mockUser, profile: updatedProfile }));
    } else {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        username: newUsername,
        usernameLower: newUsername.toLowerCase(),
        avatar: newAvatar
      });
      setUserProfile((prev) => prev ? { ...prev, username: newUsername, usernameLower: newUsername.toLowerCase(), avatar: newAvatar } : null);
    }
  };

  if (authLoading && currentUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-slate-100 font-sans p-6 text-center animate-fade-in">
        <span className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mb-4"></span>
        <p className="text-xs font-mono text-slate-400 mb-6">Сеть зашифровывается...</p>
        
        <button
          onClick={handleSignOut}
          className="px-4 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-800/80 rounded-xl text-xs font-mono text-slate-500 hover:text-slate-300 transition-all cursor-pointer"
          id="reset-session-loading-btn"
        >
          Сбросить сессию и перейти к регистрации ↩
        </button>
      </div>
    );
  }

  // If not logged in, render registration/login page
  if (!currentUser || !userProfile || !appConfig) {
    return <Login onLoginSuccess={handleLoginSuccess} onDemoLogin={handleDemoLogin} />;
  }

  const getThemeBackground = () => {
    switch (appConfig.themeAccent) {
      case 'emerald': return 'from-emerald-950/20 via-slate-900 to-slate-950';
      case 'indigo': return 'from-indigo-950/20 via-slate-900 to-slate-950';
      case 'rose': return 'from-rose-950/20 via-slate-900 to-slate-950';
      case 'amber': return 'from-amber-950/20 via-slate-900 to-slate-950';
      case 'sky': return 'from-sky-950/20 via-slate-900 to-slate-950';
      default: return 'from-violet-950/20 via-slate-900 to-slate-950';
    }
  };

  const getAccentText = () => {
    switch (appConfig.themeAccent) {
      case 'emerald': return 'text-emerald-400';
      case 'indigo': return 'text-indigo-400';
      case 'rose': return 'text-rose-400';
      case 'amber': return 'text-amber-400';
      case 'sky': return 'text-sky-400';
      default: return 'text-violet-400';
    }
  };

  const getAccentBg = () => {
    switch (appConfig.themeAccent) {
      case 'emerald': return 'bg-emerald-600 hover:bg-emerald-500 text-white';
      case 'indigo': return 'bg-indigo-600 hover:bg-indigo-500 text-white';
      case 'rose': return 'bg-rose-600 hover:bg-rose-500 text-white';
      case 'amber': return 'bg-amber-600 hover:bg-amber-500 text-slate-900';
      case 'sky': return 'bg-sky-600 hover:bg-sky-500 text-slate-900';
      default: return 'bg-violet-600 hover:bg-violet-500 text-white';
    }
  };

  const getAccentBorder = () => {
    switch (appConfig.themeAccent) {
      case 'emerald': return 'border-emerald-500/20';
      case 'indigo': return 'border-indigo-500/20';
      case 'rose': return 'border-rose-500/20';
      case 'amber': return 'border-amber-500/20';
      case 'sky': return 'border-sky-500/20';
      default: return 'border-violet-500/20';
    }
  };

  return (
    <div className={`h-screen flex flex-col-reverse md:flex-row bg-gradient-to-tr ${getThemeBackground()} text-slate-100 font-sans relative overflow-hidden`}>
      
      {/* 1. SIDEBAR */}
      <Sidebar
        currentUserId={currentUser.uid}
        userProfile={userProfile}
        currentConfig={appConfig}
        activeChatId={activeChat?.id || null}
        onSelectChat={(chat, eventCoords, resolvedTitle) => {
          setActiveChat(chat);
          if (isWindowedMode) {
            const finalTitle = chat.type === 'group' ? (chat.name || 'Группа') : (resolvedTitle ? `@${resolvedTitle}` : 'Личный чат');
            openWindow('chat', finalTitle, chat.type === 'group' ? '👥' : '💬', chat, eventCoords);
          } else {
            setCurrentView('chat');
          }
        }}
        onNavigateToConsole={() => {
          if (isWindowedMode) {
            openWindow('console', 'Панель Создателя', '🛡️');
          } else {
            setCurrentView('console');
          }
        }}
        currentView={currentView}
        onSetView={(view, eventCoords) => {
          if (isWindowedMode) {
            if (view === 'calls') {
              openWindow('calls', 'Звонки и Объявления', '📞', null, eventCoords);
            } else if (view === 'settings') {
              openWindow('settings', 'Параметры Системы', '⚙️', null, eventCoords);
            } else if (view === 'console') {
              openWindow('console', 'Панель Создателя', '🛡️', null, eventCoords);
            }
          } else {
            if (view === 'calls' || view === 'settings') {
              // classic modes mapping
              if (view === 'settings') {
                setShowProfileModal(true);
              }
            } else {
              setCurrentView(view as 'chat' | 'console');
            }
          }
        }}
        onOpenProfileModal={(eventCoords) => {
          if (isWindowedMode) {
            openWindow('profile', 'Настройки Профиля', '👤', null, eventCoords);
          } else {
            setShowProfileModal(true);
          }
        }}
        onSignOut={handleSignOut}
        isWindowedMode={isWindowedMode}
        onToggleMode={() => setIsWindowedMode(!isWindowedMode)}
      />

      {/* 2. MAIN WORKSPACE / DESKTOP WRAPPER */}
      <div className="flex-1 flex flex-col h-[calc(100vh-390px)] md:h-screen overflow-hidden relative">
        
        {/* Simple global announcement banner */}
        {appConfig.announcements && appConfig.announcements.length > 0 && (
          <div className="bg-gradient-to-r from-indigo-600/30 to-violet-600/30 border-b border-indigo-500/10 px-4 py-2 flex items-center justify-between z-20 animate-fade-in flex-shrink-0">
            <div className="flex items-center gap-2 overflow-hidden mr-4">
              <Bell className="w-4 h-4 text-violet-400 animate-swing flex-shrink-0" />
              <span className="text-[11px] font-semibold text-slate-200">
                Голос создателя:
              </span>
              <span className="text-[11px] text-slate-300 truncate">
                «{appConfig.announcements[0].title} — {appConfig.announcements[0].content}»
              </span>
            </div>
            <span className="text-[9px] font-mono text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded flex-shrink-0">
              Свежие Новости
            </span>
          </div>
        )}

        {isWindowedMode ? (
          /* WINDOWED DESKTOP VIEW */
          <div 
            className={`flex-1 flex flex-col overflow-hidden relative bg-slate-950/20 ${spawnMode === 'click' ? 'cursor-crosshair' : ''}`} 
            id="desktop-viewport"
            onClick={handleDesktopClick}
          >
            
            {/* Desktop Wallpaper / Ambient Clock & Guides */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none z-0 p-8">
              
              <div className="text-center space-y-4 animate-fade-in max-w-lg">
                <div className="text-6xl md:text-7xl font-display font-light text-slate-300/30 tracking-widest font-mono">
                  {timeStr || '00:00:00'}
                </div>
                
                <div className="space-y-1">
                  <div className="text-xs font-mono font-bold tracking-widest text-slate-500 uppercase">
                    🔒 СЕТЬ «ТУГРИК» ДЕСКТОП V1.2
                  </div>
                  <p className="text-[11px] text-slate-600 font-mono">
                    Все чаты открываются в независимых окнах. Перетаскивайте, меняйте размеры и сворачивайте окна.
                  </p>
                  {spawnMode === 'click' && (
                    <p className="text-[10px] text-violet-400 font-mono animate-pulse mt-2">
                      🎯 Кликните на обоях, чтобы выбрать место открытия окон
                    </p>
                  )}
                </div>

                {/* Grid of helpful shortcuts (pointer-events-auto to make interactive) */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-6 pointer-events-auto max-w-sm mx-auto">
                  <button
                    onClick={(e) => openWindow('profile', 'Настройки Профиля', '👤', null, { x: e.clientX, y: e.clientY })}
                    className="p-3 bg-slate-900/40 hover:bg-slate-900/80 border border-slate-800/40 hover:border-slate-700 rounded-2xl flex flex-col items-center gap-1.5 text-center transition-all group cursor-pointer shadow-sm"
                    id="shortcut-profile"
                  >
                    <span className="text-xl group-hover:scale-110 transition-transform">👤</span>
                    <span className="text-[10px] font-semibold text-slate-400 group-hover:text-slate-200">Мой Профиль</span>
                  </button>

                  <button
                    onClick={(e) => openWindow('settings', 'Параметры Системы', '⚙️', null, { x: e.clientX, y: e.clientY })}
                    className="p-3 bg-slate-900/40 hover:bg-slate-900/80 border border-slate-800/40 hover:border-slate-700 rounded-2xl flex flex-col items-center gap-1.5 text-center transition-all group cursor-pointer shadow-sm"
                    id="shortcut-settings"
                  >
                    <span className="text-xl group-hover:scale-110 transition-transform">⚙️</span>
                    <span className="text-[10px] font-semibold text-slate-400 group-hover:text-slate-200">Параметры</span>
                  </button>

                  <button
                    onClick={(e) => openWindow('calls', 'Звонки и Новости', '📞', null, { x: e.clientX, y: e.clientY })}
                    className="p-3 bg-slate-900/40 hover:bg-slate-900/80 border border-slate-800/40 hover:border-slate-700 rounded-2xl flex flex-col items-center gap-1.5 text-center transition-all group cursor-pointer shadow-sm col-span-2 sm:col-span-1"
                    id="shortcut-news"
                  >
                    <span className="text-xl group-hover:scale-110 transition-transform">📢</span>
                    <span className="text-[10px] font-semibold text-slate-400 group-hover:text-slate-200">Новости</span>
                  </button>
                </div>
              </div>

            </div>

            {/* If spawnMode is 'click' and we have coordinates, render a high-tech persistent target indicator */}
            {spawnMode === 'click' && chosenSpawnCoords && (
              <div 
                className="absolute pointer-events-none select-none z-0 transition-all duration-500 ease-out"
                style={{ 
                  left: chosenSpawnCoords.x, 
                  top: chosenSpawnCoords.y,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                {/* Outer spinning dash ring */}
                <div className="w-14 h-14 rounded-full border border-dashed border-violet-500/40 animate-spin duration-[15s] flex items-center justify-center">
                  {/* Subtle crosshair hair ticks */}
                  <div className="absolute w-full h-0.5 border-t border-violet-500/20"></div>
                  <div className="absolute h-full w-0.5 border-l border-violet-500/20"></div>
                </div>
                {/* Inner target circle */}
                <div className="absolute inset-0 m-auto w-6 h-6 rounded-full border border-dashed border-violet-400/50 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-ping"></div>
                  <div className="absolute w-1 h-1 rounded-full bg-violet-400"></div>
                </div>
                {/* Text tag */}
                <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-slate-900/80 border border-slate-800 px-2 py-0.5 rounded text-[8px] font-mono text-slate-400 whitespace-nowrap shadow-md">
                  🎯 Открытие окон здесь
                </div>
              </div>
            )}

            {/* Pulse ripple target effect */}
            {showTargetAnimation && targetAnimCoords && (
              <div 
                className="absolute pointer-events-none select-none z-10"
                style={{ 
                  left: targetAnimCoords.x, 
                  top: targetAnimCoords.y,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                <div className="w-24 h-24 rounded-full border border-violet-400 animate-ping opacity-75"></div>
              </div>
            )}

            {/* Active draggable windows */}
            <div className="flex-1 relative overflow-hidden z-10">
              {windows.map((win) => {
                const isFocused = win.zIndex === Math.max(...windows.map(w => w.zIndex), 10);
                const WinComp = DesktopWindow as any;
                return (
                  <WinComp
                    key={win.id}
                    id={win.id}
                    title={win.title}
                    icon={win.icon}
                    x={win.x}
                    y={win.y}
                    width={win.width}
                    height={win.height}
                    isMinimized={win.isMinimized}
                    isMaximized={win.isMaximized}
                    zIndex={win.zIndex}
                    active={isFocused}
                    onClose={() => closeWindow(win.id)}
                    onMinimize={() => minimizeWindow(win.id)}
                    onMaximize={() => toggleMaximizeWindow(win.id)}
                    onFocus={() => focusWindow(win.id)}
                    onMove={(x, y) => moveWindow(win.id, x, y)}
                    onResize={(w, h) => resizeWindow(win.id, w, h)}
                  >
                    {renderWindowContent(win)}
                  </WinComp>
                );
              })}
            </div>

            {/* Active Desktop Taskbar */}
            <div className="h-12 bg-slate-900/80 border-t border-slate-800/80 backdrop-blur-md px-4 flex items-center justify-start gap-2 select-none z-20 flex-shrink-0">
              <span className="text-slate-500 font-mono text-[9px] tracking-wider uppercase border-r border-slate-800 pr-3 mr-1">Панель окон</span>
              <div className="flex items-center gap-2 overflow-x-auto pr-2 no-scrollbar">
                {windows.map((win) => (
                  <button
                    key={win.id}
                    onClick={() => {
                      if (win.isMinimized) {
                        setWindows(prev => prev.map(w => w.id === win.id ? { ...w, isMinimized: false } : w));
                        focusWindow(win.id);
                      } else {
                        minimizeWindow(win.id);
                      }
                    }}
                    className={`px-3 py-1 rounded-xl border text-[11px] font-medium font-mono flex items-center gap-1.5 transition-all max-w-[130px] truncate cursor-pointer ${
                      win.isMinimized
                        ? 'bg-slate-950/40 text-slate-500 border-slate-800 hover:text-slate-300 hover:bg-slate-900/25'
                        : 'bg-slate-800 text-white border-slate-700 hover:bg-slate-750'
                    }`}
                    title={win.title}
                  >
                    <span>{win.icon}</span>
                    <span className="truncate">{win.title}</span>
                  </button>
                ))}
                {windows.length === 0 && (
                  <span className="text-[10px] text-slate-600 font-mono">Нет активных окон. Выберите диалог слева</span>
                )}
              </div>
            </div>

          </div>
        ) : (
          /* STANDARD CLASSIC SPLIT VIEW */
          <div className="flex-1 flex flex-col overflow-hidden">
            {currentView === 'console' && (userProfile.role === 'admin' || userProfile.email === 'faster123455677@gmail.com') ? (
              <CreatorConsole
                currentConfig={appConfig}
                userProfile={userProfile}
              />
            ) : activeChat ? (
              <div className="fixed inset-0 z-40 md:relative md:flex-1 h-full w-full bg-slate-950 flex flex-col">
                <ChatArea
                  currentUserId={currentUser.uid}
                  userProfile={userProfile}
                  currentConfig={appConfig}
                  chat={activeChat}
                  onInitiateCall={handleInitiateCall}
                  onSelectChat={(chat) => setActiveChat(chat)}
                  onCloseChat={() => setActiveChat(null)}
                />
              </div>
            ) : (
              <div className="hidden md:flex flex-1 flex-col items-center justify-center p-8 text-center bg-slate-950/20 select-none">
                <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-3xl mb-4 animate-bounce">
                  💬
                </div>
                <h3 className="text-sm font-bold text-slate-200">Выберите собеседника</h3>
                <p className="text-[11px] text-slate-500 mt-1 max-w-xs font-mono">
                  Перейдите в раздел «Личные» или «Группы» и выберите чат для начала анонимного диалога.
                </p>
              </div>
            )}
          </div>
        )}

      </div>

      {/* 3. CALL SCREEN OVERLAY */}
      {activeCall && (
        <CallScreen
          currentUserId={currentUser.uid}
          userProfile={userProfile}
          currentConfig={appConfig}
          call={activeCall}
          onEndCall={() => setActiveCall(null)}
        />
      )}

      {/* 4. CLASSIC PROFILE MODAL */}
      {showProfileModal && !isWindowedMode && (
        <ProfileSettingsModal
          userProfile={userProfile}
          currentConfig={appConfig}
          onClose={() => setShowProfileModal(false)}
          onSave={handleSaveProfile}
        />
      )}

    </div>
  );
}
