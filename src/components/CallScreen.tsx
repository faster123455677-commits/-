import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { Call, UserProfile, AppConfig } from '../types';
import { 
  PhoneOff, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Volume2, 
  VolumeX, 
  PhoneCall, 
  PhoneIncoming, 
  Activity 
} from 'lucide-react';

interface CallScreenProps {
  currentUserId: string;
  userProfile: UserProfile;
  currentConfig: AppConfig;
  call: Call;
  onEndCall: () => void;
}

export default function CallScreen({
  currentUserId,
  userProfile,
  currentConfig,
  call,
  onEndCall
}: CallScreenProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(call.type !== 'video');
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [duration, setDuration] = useState(0);
  const [partnerProfile, setPartnerProfile] = useState<UserProfile | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const isCaller = call.callerId === currentUserId;

  // 1. Fetch caller/receiver info
  useEffect(() => {
    const partnerId = isCaller ? call.receiverId : call.callerId;
    const unsub = onSnapshot(doc(db, 'users', partnerId), (snap) => {
      if (snap.exists()) {
        setPartnerProfile(snap.data() as UserProfile);
      }
    });

    return unsub;
  }, [call, isCaller]);

  // 2. Local Camera Access for Video Calls
  useEffect(() => {
    if (call.type === 'video' && !isVideoOff && call.status === 'connected') {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then((stream) => {
          mediaStreamRef.current = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        })
        .catch((err) => {
          console.error("Camera access failed:", err);
        });
    } else {
      // Release camera stream
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
    }

    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [call.status, isVideoOff, call.type]);

  // 3. Call Timer for Active Calls
  useEffect(() => {
    if (call.status === 'connected') {
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setDuration(0);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [call.status]);

  // 4. Accept Call (Receiver)
  const handleAcceptCall = async () => {
    try {
      await updateDoc(doc(db, 'calls', call.id), {
        status: 'connected'
      });
    } catch (err) {
      console.error("Error accepting call:", err);
    }
  };

  // 5. Decline/Decline Call (Receiver) or Hangup (Either)
  const handleHangUp = async () => {
    try {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      await updateDoc(doc(db, 'calls', call.id), {
        status: 'ended'
      });
      onEndCall();
    } catch (err) {
      console.error("Error ending call:", err);
      onEndCall();
    }
  };

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
  };

  // Theme support accents
  const getThemeColorClass = () => {
    switch (currentConfig.themeAccent) {
      case 'emerald': return 'text-emerald-400 border-emerald-500/20';
      case 'indigo': return 'text-indigo-400 border-indigo-500/20';
      case 'rose': return 'text-rose-400 border-rose-500/20';
      case 'amber': return 'text-amber-400 border-amber-500/20';
      case 'sky': return 'text-sky-400 border-sky-500/20';
      default: return 'text-violet-400 border-violet-500/20';
    }
  };

  const getThemeRingClass = () => {
    switch (currentConfig.themeAccent) {
      case 'emerald': return 'ring-emerald-500/20';
      case 'indigo': return 'ring-indigo-500/20';
      case 'rose': return 'ring-rose-500/20';
      case 'amber': return 'ring-amber-500/20';
      case 'sky': return 'ring-sky-500/20';
      default: return 'ring-violet-500/20';
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-between p-8 z-50 overflow-hidden font-sans text-slate-100 select-none">
      
      {/* Upper info panel */}
      <div className="text-center mt-8 space-y-2 z-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-900 border border-slate-800 rounded-full text-[10px] uppercase tracking-widest font-mono text-slate-400">
          <Activity className="w-3.5 h-3.5 animate-pulse text-emerald-500" />
          <span>Шифрованный звонок «Тугрик»</span>
        </div>

        <h3 className="text-3xl font-display font-bold tracking-tight">
          {partnerProfile ? partnerProfile.username : call.callerName || 'Анонимный Тугрик'}
        </h3>

        <div className="text-xs font-mono text-slate-400">
          {call.status === 'dialing' && 'Инициализация набора...'}
          {call.status === 'ringing' && (isCaller ? 'Вызов абонента...' : 'Входящий анонимный вызов...')}
          {call.status === 'connected' && (
            <span className="text-emerald-400 font-semibold flex items-center gap-1.5 justify-center">
              Соединено • {formatDuration(duration)}
            </span>
          )}
          {call.status === 'ended' && 'Звонок завершен'}
        </div>
      </div>

      {/* Main visual (Local camera or abstract sound circle) */}
      <div className="relative flex items-center justify-center w-full max-w-sm h-64 my-6">
        {call.type === 'video' && !isVideoOff && call.status === 'connected' ? (
          <div className="w-full h-full rounded-3xl overflow-hidden border border-slate-800 shadow-2xl relative bg-slate-900">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-3 left-3 bg-slate-950/70 border border-slate-800 px-2 py-1 rounded-lg text-[9px] font-mono text-slate-300">
              Вы • Локальная камера
            </div>
          </div>
        ) : (
          /* Abstract neon sound waves for audio/muted call */
          <div className="relative">
            {/* Pulsing glow circles */}
            <div className={`absolute -inset-8 rounded-full ring-4 ${getThemeRingClass()} animate-ping opacity-45`} />
            <div className={`absolute -inset-16 rounded-full ring-4 ${getThemeRingClass()} animate-ping opacity-25`} />
            
            <div className="w-40 h-40 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center text-6xl shadow-2xl relative z-10">
              {partnerProfile ? partnerProfile.avatar || '🤖' : call.callerAvatar || '🦊'}
            </div>
          </div>
        )}
      </div>

      {/* Control Actions */}
      <div className="w-full max-w-sm flex flex-col gap-6 mb-8 z-10">
        
        {/* Toggle options */}
        {call.status === 'connected' && (
          <div className="flex justify-center gap-6">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`p-4 rounded-full border transition-colors cursor-pointer ${
                isMuted 
                  ? 'bg-rose-500 border-rose-400 text-white' 
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'
              }`}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            {call.type === 'video' && (
              <button
                onClick={() => setIsVideoOff(!isVideoOff)}
                className={`p-4 rounded-full border transition-colors cursor-pointer ${
                  isVideoOff 
                    ? 'bg-rose-500 border-rose-400 text-white' 
                    : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'
                }`}
              >
                {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
              </button>
            )}

            <button
              onClick={() => setIsSpeakerOn(!isSpeakerOn)}
              className={`p-4 rounded-full border transition-colors cursor-pointer ${
                !isSpeakerOn 
                  ? 'bg-rose-500 border-rose-400 text-white' 
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'
              }`}
            >
              {isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
          </div>
        )}

        {/* Action button (Decline, Accept, Hangup) */}
        <div className="flex gap-4 w-full justify-center">
          
          {/* Receiver hears call and has not connected yet */}
          {!isCaller && call.status === 'ringing' ? (
            <>
              <button
                onClick={handleHangUp}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm rounded-2xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-rose-600/25 cursor-pointer"
              >
                <PhoneOff className="w-4 h-4" /> Отклонить
              </button>
              <button
                onClick={handleAcceptCall}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm rounded-2xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-emerald-600/25 cursor-pointer"
              >
                <PhoneCall className="w-4 h-4" /> Принять
              </button>
            </>
          ) : (
            /* Caller waiting for response, or active call of either party */
            <button
              onClick={handleHangUp}
              className="w-full max-w-xs py-3.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm rounded-2xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-rose-600/25 cursor-pointer"
            >
              <PhoneOff className="w-5 h-5" /> Завершить звонок
            </button>
          )}
        </div>
      </div>

    </div>
  );
}
