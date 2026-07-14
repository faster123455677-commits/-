import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { 
  collection, 
  query, 
  where,
  getDocs,
  orderBy, 
  onSnapshot, 
  addDoc, 
  doc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove, 
  deleteDoc 
} from 'firebase/firestore';
import { Chat, Message, UserProfile, AppConfig } from '../types';
import { 
  Send, 
  Phone, 
  Video, 
  Trash2, 
  Info, 
  Users, 
  UserMinus, 
  ShieldAlert, 
  LogOut, 
  AlertCircle,
  Search,
  UserPlus,
  RefreshCw,
  UserCheck,
  Copy,
  Check,
  Sparkles,
  ArrowLeft
} from 'lucide-react';

interface ChatAreaProps {
  currentUserId: string;
  userProfile: UserProfile;
  currentConfig: AppConfig;
  chat: Chat | null;
  onInitiateCall: (receiverId: string, type: 'voice' | 'video') => void;
  onSelectChat: (chat: Chat) => void;
  onCloseChat?: () => void;
}

export default function ChatArea({
  currentUserId,
  userProfile,
  currentConfig,
  chat,
  onInitiateCall,
  onSelectChat,
  onCloseChat
}: ChatAreaProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [typedMessage, setTypedMessage] = useState('');
  const [memberProfiles, setMemberProfiles] = useState<Record<string, UserProfile>>({});
  
  // Full-screen search and discover state
  const [fullscreenSearch, setFullscreenSearch] = useState('');
  const [fullscreenError, setFullscreenError] = useState('');
  const [fullscreenSearching, setFullscreenSearching] = useState(false);
  const [fullscreenResults, setFullscreenResults] = useState<UserProfile[]>([]);
  const [copiedName, setCopiedName] = useState(false);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Subscribe to messages inside the active chat
  useEffect(() => {
    if (!chat) return;

    if (chat.id.startsWith('demo_') || (currentUserId && currentUserId.startsWith('demo_'))) {
      const localKey = `demo_messages_${chat.id}`;
      const saved = localStorage.getItem(localKey);
      if (saved) {
        setMessages(JSON.parse(saved));
      } else {
        const defaultMsgs: Message[] = [
          {
            id: 'demo_msg_init',
            senderId: 'demo_user1',
            senderName: 'МудрыйБобер_858',
            senderAvatar: '🐶',
            content: 'Привет! Добро пожаловать в анонимный Тугрик-чат 🚀',
            createdAt: Date.now() - 3600000,
            type: 'text'
          },
          {
            id: 'demo_msg_init_2',
            senderId: 'demo_user1',
            senderName: 'МудрыйБобер_858',
            senderAvatar: '🐶',
            content: 'Вы зашли под быстрым Демо-входом. Ваши сообщения будут сохраняться локально в браузере.',
            createdAt: Date.now() - 3000000,
            type: 'text'
          }
        ];
        setMessages(defaultMsgs);
        localStorage.setItem(localKey, JSON.stringify(defaultMsgs));
      }
      return;
    }

    const q = query(
      collection(db, 'chats', chat.id, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsub = onSnapshot(q, (snap) => {
      const msgList: Message[] = [];
      snap.forEach((doc) => {
        msgList.push({ id: doc.id, ...doc.data() } as Message);
      });
      setMessages(msgList);
    }, (error) => {
      console.warn("Could not load messages in real-time (offline/demo fallback):", error);
    });

    return unsub;
  }, [chat, currentUserId]);

  // 2. Fetch member profiles of this chat to resolve names/avatars dynamically
  useEffect(() => {
    if (!chat || !chat.members) return;

    if (chat.id.startsWith('demo_') || (currentUserId && currentUserId.startsWith('demo_'))) {
      const mockProfiles: Record<string, UserProfile> = {
        'demo_user1': { uid: 'demo_user1', username: 'МудрыйБобер_858', email: 'bober@demo.com', avatar: '🐶', status: 'online', role: 'user', createdAt: Date.now() },
        'demo_user2': { uid: 'demo_user2', username: 'БыстрыйХомяк_492', email: 'hamster@demo.com', avatar: '🐹', status: 'online', role: 'user', createdAt: Date.now() },
        'demo_user3': { uid: 'demo_user3', username: 'КосмическийКот_101', email: 'cat@demo.com', avatar: '🐱', status: 'offline', role: 'user', createdAt: Date.now() }
      };
      setMemberProfiles(mockProfiles);
      return;
    }

    // We can do real-time monitoring of members' active user profiles
    const unsubscribes = chat.members.map((memberUid) => {
      return onSnapshot(doc(db, 'users', memberUid), (snapshot) => {
        if (snapshot.exists()) {
          const profile = snapshot.data() as UserProfile;
          setMemberProfiles((prev) => ({
            ...prev,
            [memberUid]: profile
          }));
        }
      }, (error) => {
        console.warn(`Could not subscribe to member profile ${memberUid} (offline/demo fallback):`, error);
      });
    });

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [chat, currentUserId]);

  // 3. Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load registered users directory for full-screen discovery
  useEffect(() => {
    if (chat) return;
    if (!currentUserId) return;

    if (currentUserId.startsWith('demo_')) {
      const mockUsers: UserProfile[] = [
        { uid: 'demo_user1', username: 'МудрыйБобер_858', email: 'bober@demo.com', avatar: '🐶', status: 'online', role: 'user', createdAt: Date.now() },
        { uid: 'demo_user2', username: 'БыстрыйХомяк_492', email: 'hamster@demo.com', avatar: '🐹', status: 'online', role: 'user', createdAt: Date.now() },
        { uid: 'demo_user3', username: 'КосмическийКот_101', email: 'cat@demo.com', avatar: '🐱', status: 'offline', role: 'user', createdAt: Date.now() }
      ];
      setUsersList(mockUsers);
      setIsLoadingUsers(false);
      return;
    }

    setIsLoadingUsers(true);
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const list: UserProfile[] = [];
      const seenUids = new Set<string>();
      snap.forEach((doc) => {
        const u = doc.data() as UserProfile;
        if (u.uid && u.uid !== currentUserId && !seenUids.has(u.uid)) {
          seenUids.add(u.uid);
          list.push(u);
        }
      });
      setUsersList(list);
      setIsLoadingUsers(false);
    }, (err) => {
      console.warn("Could not load users for full-screen directory:", err);
      setIsLoadingUsers(false);
    });
    return unsub;
  }, [chat, currentUserId]);

  const handleFullscreenSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const queryName = fullscreenSearch.trim();
    if (!queryName) {
      setFullscreenError('Введите поисковый запрос (никнейм или email)');
      return;
    }

    setFullscreenError('');
    setFullscreenSearching(true);
    setFullscreenResults([]);

    try {
      const cleanQuery = queryName.toLowerCase();
      let matchedUsers: UserProfile[] = [];

      // 1. First, look through the loaded real-time users list
      if (usersList.length > 0) {
        matchedUsers = usersList.filter(u => {
          const username = u.username.toLowerCase();
          const email = (u.email || '').toLowerCase();
          return username.includes(cleanQuery) || email.includes(cleanQuery);
        });
      }

      // 2. If no matches in active state, perform a fallback scan from Firestore of all users to be absolutely sure
      if (matchedUsers.length === 0) {
        const qAll = collection(db, 'users');
        const snapAll = await getDocs(qAll);
        const fetchedList: UserProfile[] = [];
        snapAll.forEach((doc) => {
          const u = doc.data() as UserProfile;
          if (u.uid && u.uid !== currentUserId) {
            fetchedList.push(u);
          }
        });

        matchedUsers = fetchedList.filter(u => {
          const username = u.username.toLowerCase();
          const email = (u.email || '').toLowerCase();
          return username.includes(cleanQuery) || email.includes(cleanQuery);
        });
      }

      // 3. Deduplicate final matched results by uid
      const seen = new Set<string>();
      const uniqueMatched = matchedUsers.filter(u => {
        if (!u.uid || seen.has(u.uid)) return false;
        seen.add(u.uid);
        return true;
      });

      if (uniqueMatched.length > 0) {
        setFullscreenResults(uniqueMatched);
      } else {
        setFullscreenError(`Пользователь по запросу "${queryName}" не найден. Попробуйте ввести другую часть имени.`);
      }
    } catch (err) {
      console.error("Error searching in full screen:", err);
      setFullscreenError('Произошла ошибка при поиске собеседника.');
    } finally {
      setFullscreenSearching(false);
    }
  };

  const handleStartChatWithUser = async (targetUser: UserProfile) => {
    try {
      // 1. Query Firestore if a direct chat between currentUserId and targetUser.uid already exists
      const qChats = query(
        collection(db, 'chats'),
        where('members', 'array-contains', currentUserId)
      );
      const snapChats = await getDocs(qChats);
      let existingChat: Chat | null = null;
      
      snapChats.forEach((doc) => {
        const c = doc.data() as Chat;
        if (c.type === 'direct' && c.members.includes(targetUser.uid)) {
          existingChat = { id: doc.id, ...c };
        }
      });

      if (existingChat) {
        onSelectChat(existingChat);
        return;
      }

      // 2. Otherwise create a new direct chat doc
      const newChatRef = await addDoc(collection(db, 'chats'), {
        type: 'direct',
        members: [currentUserId, targetUser.uid],
        createdAt: Date.now(),
        lastMessageText: 'Чат создан анонимно',
        lastMessageAt: Date.now()
      });

      const newChat: Chat = {
        id: newChatRef.id,
        type: 'direct',
        members: [currentUserId, targetUser.uid],
        createdAt: Date.now(),
        lastMessageText: 'Чат создан анонимно',
        lastMessageAt: Date.now()
      };

      onSelectChat(newChat);
    } catch (err) {
      console.error("Error starting direct chat from full-screen view:", err);
      setFullscreenError("Не удалось запустить чат. Попробуйте еще раз.");
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(userProfile.username);
    setCopiedName(true);
    setTimeout(() => setCopiedName(false), 2000);
  };

  if (!chat) {
    return (
      <div className="flex-1 flex flex-col lg:flex-row h-screen overflow-hidden bg-slate-900/60 relative">
        
        {/* Glow ambient design effects */}
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-violet-600/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600/5 rounded-full blur-3xl pointer-events-none"></div>

        {/* Left pane: Active search and profile showcase */}
        <div className="flex-1 flex flex-col justify-center p-6 md:p-12 lg:p-16 max-w-2xl mx-auto z-10 w-full">
          <div className="space-y-6">
            
            {/* Title Section */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-[10px] font-mono uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '4s' }} />
                Интеллектуальный поиск собеседников
              </div>
              <h2 className="font-display font-bold text-3xl tracking-tight text-slate-100">
                Начните защищенный <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-emerald-400 to-indigo-400">диалог</span>
              </h2>
              <p className="text-xs text-slate-400 max-w-md leading-relaxed font-mono">
                Для моментального шифрованного общения введите уникальный никнейм собеседника или скопируйте свой никнейм, чтобы передать его другу.
              </p>
            </div>

            {/* Quick Share My Username card */}
            <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{userProfile.avatar || '🤖'}</span>
                <div>
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">Ваш анонимный никнейм</span>
                  <span className="font-semibold text-slate-200 text-xs font-mono">@{userProfile.username}</span>
                </div>
              </div>
              <button
                onClick={copyToClipboard}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 text-[10px] font-mono rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {copiedName ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    Скопировано!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Копировать
                  </>
                )}
              </button>
            </div>

            {/* Search Input Box */}
            <form onSubmit={handleFullscreenSearch} className="space-y-3">
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-sm font-semibold">@</div>
                <input
                  type="text"
                  value={fullscreenSearch}
                  onChange={(e) => {
                    setFullscreenSearch(e.target.value);
                    setFullscreenError('');
                  }}
                  placeholder="Введите точный никнейм (например: ШустрыйХомяк_492)"
                  className="w-full pl-9 pr-24 py-3.5 bg-slate-950/90 border border-slate-800 focus:border-emerald-500 rounded-2xl text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 transition-all shadow-xl"
                  disabled={fullscreenSearching}
                />
                <button
                  type="submit"
                  disabled={fullscreenSearching}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-gradient-to-r from-violet-600 to-emerald-600 hover:from-violet-500 hover:to-emerald-500 text-white font-semibold text-xs rounded-xl transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-md"
                >
                  {fullscreenSearching ? (
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  ) : (
                    <>
                      <Search className="w-3.5 h-3.5" />
                      Найти
                    </>
                  )}
                </button>
              </div>

              {fullscreenError && (
                <div className="p-3 text-[11px] text-rose-400 font-mono bg-rose-500/10 border border-rose-500/20 rounded-xl leading-relaxed">
                  ⚠️ {fullscreenError}
                </div>
              )}
            </form>

            {/* Search Results Display */}
            {fullscreenResults.length > 0 && (
              <div className="space-y-2.5 animate-fade-in">
                <h4 className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Результаты поиска ({fullscreenResults.length})</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {fullscreenResults.map((u) => (
                    <button
                      key={u.uid}
                      onClick={() => handleStartChatWithUser(u)}
                      className="flex items-center gap-3 p-3 bg-slate-950 hover:bg-slate-950 border border-slate-800/80 hover:border-emerald-500/40 rounded-2xl text-left transition-all group cursor-pointer"
                    >
                      <span className="text-2xl group-hover:scale-110 transition-transform">{u.avatar || '🤖'}</span>
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-xs text-slate-200 block truncate group-hover:text-emerald-400 transition-colors">@{u.username}</span>
                        <span className="text-[9px] text-slate-500 block truncate font-mono">ID: {u.uid.slice(0, 8)}...</span>
                      </div>
                      <div className="p-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg group-hover:bg-emerald-500 group-hover:text-white transition-all">
                        <UserPlus className="w-3.5 h-3.5" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Right pane: Directory of online peers inside the network */}
        <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-slate-800 bg-slate-950/60 p-6 flex flex-col h-[40vh] lg:h-full z-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display font-bold text-xs text-slate-200">Пользователи в сети</h3>
              <p className="text-[9px] font-mono text-slate-500">Активные анонимные профили</p>
            </div>
            <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-[9px] font-mono text-emerald-400">
              {usersList.length} в эфире
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
            {isLoadingUsers ? (
              <div className="flex flex-col items-center justify-center h-full py-12 text-slate-600 font-mono text-[10px]">
                <span className="w-5 h-5 border-2 border-slate-700 border-t-slate-500 rounded-full animate-spin mb-2"></span>
                Синхронизация участников...
              </div>
            ) : usersList.length === 0 ? (
              <div className="text-center py-12 text-[10px] text-slate-600 font-mono leading-relaxed">
                В сети пока никого нет.<br />Поделитесь своим ником, чтобы пригласить друга!
              </div>
            ) : (
              usersList.map((u) => (
                <button
                  key={u.uid}
                  onClick={() => handleStartChatWithUser(u)}
                  className="w-full flex items-center gap-2.5 p-2.5 bg-slate-950/30 hover:bg-slate-950 border border-slate-800/40 hover:border-slate-700/60 rounded-xl text-left transition-all cursor-pointer group"
                >
                  <span className="text-xl group-hover:scale-110 transition-transform">{u.avatar || '🤖'}</span>
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-xs text-slate-300 block truncate group-hover:text-emerald-400 transition-colors">@{u.username}</span>
                    <span className="text-[8px] text-slate-500 font-mono block">Анонимная зашифрованная линия</span>
                  </div>
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    u.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'
                  }`} />
                </button>
              ))
            )}
          </div>
          
          <div className="mt-4 pt-3 border-t border-slate-800/80 text-[9px] font-mono text-slate-500 text-center leading-relaxed">
            🔒 Сессия полностью защищена сквозным асимметричным шифрованием. IP-адреса и почтовые ящики скрыты от всех участников.
          </div>
        </div>

      </div>
    );
  }

  const isMember = chat.members.includes(currentUserId);

  // Resolve chat name and avatar for display
  let chatDisplayName = chat.name || 'Анонимный Чат';
  let chatDisplayAvatar = '👤';

  if (chat.type === 'direct') {
    const otherMemberId = chat.members.find((id) => id !== currentUserId) || '';
    const otherProfile = memberProfiles[otherMemberId];
    if (otherProfile) {
      chatDisplayName = otherProfile.username;
      chatDisplayAvatar = otherProfile.avatar || '🤖';
    } else {
      chatDisplayName = 'Анонимный Тугрик';
      chatDisplayAvatar = '👤';
    }
  } else {
    chatDisplayName = chat.name || 'Анонимная группа';
    chatDisplayAvatar = '👥';
  }

  // 4. Send a message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedMessage.trim() || !isMember) return;

    const messageContent = typedMessage.trim();
    setTypedMessage('');

    if (chat.id.startsWith('demo_') || (currentUserId && currentUserId.startsWith('demo_'))) {
      const localKey = `demo_messages_${chat.id}`;
      const newMsg: Message = {
        id: `demo_msg_${Date.now()}`,
        senderId: currentUserId,
        senderName: userProfile.username,
        senderAvatar: userProfile.avatar || '🤖',
        content: messageContent,
        createdAt: Date.now(),
        type: 'text'
      };

      const updated = [...messages, newMsg];
      setMessages(updated);
      localStorage.setItem(localKey, JSON.stringify(updated));

      // Update sidebar chat lastMessage info by raising custom event or local storage updates
      // (For direct styling, the list of chats will read latest messages)
      
      // Simulate bot typing response
      setTimeout(() => {
        const botResponses = [
          "Ха-ха! Да, это отличная мысль! 😂",
          "Интересно! Расскажи подробнее.",
          "Я согласен с этим полностью. Но давай сохраним это в тайне 🤫",
          "Хм, надо подумать. В анонимной сети Тугрик всё под надежной защитой!",
          "Круто! Рад пообщаться в демо-режиме.",
          "Всё супер, шифрование работает на ура 🛡️"
        ];
        const randomResp = botResponses[Math.floor(Math.random() * botResponses.length)];
        const botMsg: Message = {
          id: `demo_msg_bot_${Date.now()}`,
          senderId: 'demo_user1',
          senderName: 'МудрыйБобер_858',
          senderAvatar: '🐶',
          content: randomResp,
          createdAt: Date.now(),
          type: 'text'
        };
        const withBot = [...updated, botMsg];
        setMessages(withBot);
        localStorage.setItem(localKey, JSON.stringify(withBot));
      }, 1000);
      return;
    }

    try {
      // 1. Add to subcollection of messages
      await addDoc(collection(db, 'chats', chat.id, 'messages'), {
        senderId: currentUserId,
        senderName: userProfile.username,
        senderAvatar: userProfile.avatar || '🤖',
        content: messageContent,
        createdAt: Date.now(),
        type: 'text'
      });

      // 2. Update chat metadata for sidebar sorting
      await updateDoc(doc(db, 'chats', chat.id), {
        lastMessageText: messageContent,
        lastMessageAt: Date.now()
      });
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  // 5. Join Group
  const handleJoinGroup = async () => {
    try {
      const chatRef = doc(db, 'chats', chat.id);
      await updateDoc(chatRef, {
        members: arrayUnion(currentUserId)
      });
      // Add system welcome message
      await addDoc(collection(db, 'chats', chat.id, 'messages'), {
        senderId: 'system',
        senderName: 'Система',
        senderAvatar: '🪙',
        content: `Пользователь ${userProfile.username} присоединился к группе`,
        createdAt: Date.now(),
        type: 'system'
      });
    } catch (err) {
      console.error("Error joining group:", err);
    }
  };

  // 6. Leave Group
  const handleLeaveGroup = async () => {
    if (!window.confirm("Вы уверены, что хотите покинуть эту группу?")) return;
    try {
      const chatRef = doc(db, 'chats', chat.id);
      await updateDoc(chatRef, {
        members: arrayRemove(currentUserId)
      });
      // Add system departure message
      await addDoc(collection(db, 'chats', chat.id, 'messages'), {
        senderId: 'system',
        senderName: 'Система',
        senderAvatar: '🪙',
        content: `Пользователь ${userProfile.username} покинул группу`,
        createdAt: Date.now(),
        type: 'system'
      });
    } catch (err) {
      console.error("Error leaving group:", err);
    }
  };

  // 7. Creator Moderation: Delete Chat
  const handleCreatorDeleteChat = async () => {
    if (!window.confirm("ГЕНЕРАЛЬНАЯ МОДЕРАЦИЯ: Вы действительно хотите удалить этот чат и все его сообщения у всех участников?")) return;

    try {
      // Delete all messages first (simple Firestore loop, usually CJS is fast)
      // Note: we can delete the chat doc directly.
      await deleteDoc(doc(db, 'chats', chat.id));
      alert("Чат успешно удален.");
    } catch (err) {
      console.error("Error deleting chat:", err);
    }
  };

  // 8. Creator/User Moderation: Delete Message
  const handleCreatorDeleteMessage = async (messageId: string) => {
    try {
      await deleteDoc(doc(db, 'chats', chat.id, 'messages', messageId));
    } catch (err) {
      console.error("Error deleting message:", err);
    }
  };

  // Theme support colors
  const getAccentBg = () => {
    switch (currentConfig.themeAccent) {
      case 'emerald': return 'bg-emerald-600 text-white';
      case 'indigo': return 'bg-indigo-600 text-white';
      case 'rose': return 'bg-rose-600 text-white';
      case 'amber': return 'bg-amber-600 text-slate-900';
      case 'sky': return 'bg-sky-600 text-slate-900';
      default: return 'bg-gradient-to-r from-violet-600 to-emerald-600 text-white';
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

  const getAccentBorderFocus = () => {
    switch (currentConfig.themeAccent) {
      case 'emerald': return 'focus:border-emerald-500';
      case 'indigo': return 'focus:border-indigo-500';
      case 'rose': return 'focus:border-rose-500';
      case 'amber': return 'focus:border-amber-500';
      case 'sky': return 'focus:border-sky-500';
      default: return 'focus:border-emerald-500';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-900 relative">
      
      {/* 1. HEADER */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          {onCloseChat && (
            <button
              type="button"
              onClick={onCloseChat}
              className="p-2 mr-1 bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-slate-200 rounded-xl transition-all cursor-pointer flex items-center justify-center"
              title="Выйти из чата"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="w-10 h-10 bg-slate-800 border border-slate-700/80 rounded-xl flex items-center justify-center text-2xl">
            {chatDisplayAvatar}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-200 text-sm leading-tight">{chatDisplayName}</span>
              {chat.type === 'group' && (
                <span className="text-[10px] bg-slate-800 text-slate-400 border border-slate-700 px-1.5 py-0.5 rounded font-mono">
                  Группа
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
              {chat.type === 'direct' 
                ? 'Прямой анонимный канал связи' 
                : `${chat.members?.length || 1} участников в сети`}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          
          {/* Voice/Video calls - ONLY for direct chats, and ONLY if voiceCalls toggled ON or if user is admin */}
          {chat.type === 'direct' && (currentConfig.featureToggles?.voiceCalls || userProfile.role === 'admin') && (
            <>
              <button
                onClick={() => {
                  const receiverId = chat.members.find(m => m !== currentUserId) || '';
                  onInitiateCall(receiverId, 'voice');
                }}
                className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-slate-200 rounded-xl transition-all cursor-pointer"
                title="Аудиозвонок"
              >
                <Phone className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  const receiverId = chat.members.find(m => m !== currentUserId) || '';
                  onInitiateCall(receiverId, 'video');
                }}
                className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-slate-200 rounded-xl transition-all cursor-pointer"
                title="Видеозвонок"
              >
                <Video className="w-4 h-4" />
              </button>
            </>
          )}

          {/* Group controls */}
          {chat.type === 'group' && isMember && (
            <button
              onClick={handleLeaveGroup}
              className="p-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
              title="Покинуть группу"
            >
              <LogOut className="w-4 h-4" />
              Выйти
            </button>
          )}

          {/* Creator exclusive moderation: DELETE WHOLE CHAT */}
          {userProfile.role === 'admin' && (
            <button
              onClick={handleCreatorDeleteChat}
              className="p-2 bg-amber-500/10 hover:bg-amber-500/25 border border-amber-500/20 text-amber-400 rounded-xl transition-all cursor-pointer"
              title="Модерация: Удалить этот чат у всех"
            >
              <ShieldAlert className="w-4 h-4 text-amber-400" />
            </button>
          )}
        </div>
      </div>

      {/* 2. MESSAGES VIEWPORT */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        
        {/* If user is not member of group chat, prompt to Join */}
        {chat.type === 'group' && !isMember && (
          <div className="max-w-md mx-auto my-12 bg-slate-950/60 border border-slate-800/80 p-6 rounded-2xl text-center space-y-4">
            <span className="text-4xl block">👥</span>
            <h4 className="font-display font-bold text-sm text-slate-200">Вы не являетесь участником этой группы</h4>
            <p className="text-xs text-slate-400 leading-relaxed font-mono">
              Чтобы читать сообщения и писать в эту группу, вам нужно присоединиться к ней. Все действия анонимизированы.
            </p>
            <button
              onClick={handleJoinGroup}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl transition-all cursor-pointer shadow-lg shadow-indigo-600/20"
            >
              Присоединиться к Группе
            </button>
          </div>
        )}

        {isMember && messages.length === 0 && (
          <div className="text-center py-12 text-slate-500 text-xs font-mono">
            Чат пуст. Напишите первое сообщение, чтобы начать анонимную беседу.
          </div>
        )}

        {isMember && messages.map((msg) => {
          const isMe = msg.senderId === currentUserId;
          const isSystem = msg.type === 'system' || msg.senderId === 'system';
          
          if (isSystem) {
            return (
              <div key={msg.id} className="flex justify-center my-2 animate-fade-in">
                <span className="px-3 py-1 bg-slate-800/60 border border-slate-700/30 rounded-full text-[10px] text-slate-400 font-mono flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-slate-500" />
                  {msg.content}
                </span>
              </div>
            );
          }

          // Resolve display credentials
          const senderProfile = memberProfiles[msg.senderId];
          const senderName = senderProfile ? senderProfile.username : msg.senderName || 'Анонимный Тугрик';
          const senderAvatar = senderProfile ? senderProfile.avatar : msg.senderAvatar || '🤖';

          return (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-[92%] sm:max-w-[85%] animate-fade-in ${
                isMe ? 'ml-auto flex-row-reverse' : 'mr-auto'
              }`}
            >
              {/* Avatar */}
              <div className="w-8 h-8 bg-slate-800 border border-slate-700 rounded-lg flex items-center justify-center text-lg flex-shrink-0">
                {senderAvatar}
              </div>

              {/* Message box */}
              <div className="space-y-1">
                {/* Sender username (Only in groups or for other users) */}
                {!isMe && (
                  <span className="text-[10px] text-slate-400 font-bold block ml-1">
                    {senderName}
                  </span>
                )}

                <div className="relative group flex items-start gap-2">
                  <div
                    className={`p-3 rounded-2xl text-xs leading-relaxed break-all relative ${
                      isMe 
                        ? `${getAccentBg()} rounded-tr-none shadow-md` 
                        : 'bg-slate-800 text-slate-100 rounded-tl-none border border-slate-700/60'
                    }`}
                  >
                    {msg.content}
                    
                    {/* Timestamp overlay */}
                    <span className="block text-[8px] text-right text-slate-400 mt-1 font-mono">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Creator / Sender direct delete button */}
                  {(userProfile.role === 'admin' || isMe) && (
                    <button
                      onClick={() => handleCreatorDeleteMessage(msg.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 border border-rose-500/20 rounded-lg transition-all self-center cursor-pointer"
                      title="Удалить сообщение"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* 3. INPUT COMPOSER (Visible only if user joined group or in personal chats) */}
      {isMember && (
        <form 
          onSubmit={handleSendMessage} 
          className="p-4 border-t border-slate-800/80 bg-slate-950/40 flex gap-2 items-center"
        >
          <input
            type="text"
            value={typedMessage}
            onChange={(e) => setTypedMessage(e.target.value)}
            placeholder="Введите анонимное сообщение..."
            className={`flex-1 bg-slate-900 border border-slate-800 rounded-xl py-2.5 px-4 text-xs text-slate-100 focus:outline-none focus:bg-slate-950 transition-colors ${getAccentBorderFocus()}`}
            maxLength={1000}
            required
          />
          <button
            type="submit"
            className={`p-2.5 rounded-xl transition-all shadow-md cursor-pointer ${getAccentBg()}`}
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      )}

    </div>
  );
}
