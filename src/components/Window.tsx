import React from 'react';
import { Minus, Square, X } from 'lucide-react';

interface WindowProps {
  id: string;
  title: string;
  icon?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
  active: boolean;
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  onFocus: () => void;
  onMove: (x: number, y: number) => void;
  onResize?: (width: number, height: number) => void;
  children: React.ReactNode;
}

export default function DesktopWindow({
  id,
  title,
  icon = '📂',
  x,
  y,
  width,
  height,
  isMinimized,
  isMaximized,
  zIndex,
  active,
  onClose,
  onMinimize,
  onMaximize,
  onFocus,
  onMove,
  onResize,
  children
}: WindowProps) {
  if (isMinimized) return null;

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    onFocus();
    if (isMaximized) return;

    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('textarea')) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const initialX = x;
    const initialY = y;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      onMove(initialX + deltaX, Math.max(0, initialY + deltaY));
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    onFocus();
    if (isMaximized) return;

    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('textarea')) return;

    const touch = e.touches[0];
    const startX = touch.clientX;
    const startY = touch.clientY;
    const initialX = x;
    const initialY = y;

    const handleTouchMove = (moveEvent: TouchEvent) => {
      const currentTouch = moveEvent.touches[0];
      const deltaX = currentTouch.clientX - startX;
      const deltaY = currentTouch.clientY - startY;
      onMove(initialX + deltaX, Math.max(0, initialY + deltaY));
    };

    const handleTouchEnd = () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };

    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd);
  };

  const handleResizeMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    onFocus();
    if (isMaximized) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const initialWidth = width;
    const initialHeight = height;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      if (onResize) {
        onResize(
          Math.max(320, initialWidth + deltaX),
          Math.max(240, initialHeight + deltaY)
        );
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const windowStyle: React.CSSProperties = isMaximized
    ? {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex,
      }
    : {
        position: 'absolute',
        left: `${x}px`,
        top: `${y}px`,
        width: `${width}px`,
        height: `${height}px`,
        zIndex,
      };

  return (
    <div
      style={windowStyle}
      onClick={onFocus}
      className={`flex flex-col bg-slate-950 border rounded-2xl overflow-hidden shadow-2xl transition-all duration-150 ${
        active 
          ? 'border-emerald-500/50 shadow-emerald-950/20 ring-1 ring-emerald-500/10' 
          : 'border-slate-800 shadow-black/50'
      }`}
    >
      {/* Title Bar */}
      <div
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        className={`px-4 py-2.5 flex items-center justify-between select-none cursor-move ${
          active 
            ? 'bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 border-b border-emerald-500/20' 
            : 'bg-slate-900 border-b border-slate-800'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm">{icon}</span>
          <span className={`text-xs font-semibold font-mono tracking-wide ${active ? 'text-slate-100' : 'text-slate-400'}`}>
            {title}
          </span>
        </div>
        
        {/* Window Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onMinimize(); }}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            title="Свернуть"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onMaximize(); }}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            title={isMaximized ? "Восстановить" : "Развернуть"}
          >
            <Square className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="p-1 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
            title="Закрыть"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Window Body */}
      <div className="flex-1 overflow-hidden relative flex flex-col bg-slate-950">
        {children}
      </div>

      {/* Resize Handle (bottom right corner) */}
      {!isMaximized && onResize && (
        <div
          onMouseDown={handleResizeMouseDown}
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize flex items-end justify-end p-0.5 z-50 group"
        >
          <svg className="w-2.5 h-2.5 text-slate-700 group-hover:text-emerald-500 transition-colors" viewBox="0 0 10 10">
            <line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" strokeWidth="1.5" />
            <line x1="10" y1="4" x2="4" y2="10" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </div>
      )}
    </div>
  );
}
