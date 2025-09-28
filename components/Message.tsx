import React, { useState, useRef } from 'react';
import { ChatMessage, Sender, Sentiment } from '../types';

interface MessageProps {
  message: ChatMessage;
}

const BOT_AVATAR_URL = 'https://api.dicebear.com/8.x/bottts/svg?seed=NMS';
const USER_AVATAR_URL = 'https://api.dicebear.com/8.x/initials/svg?seed=U';

const SentimentIndicator: React.FC<{ sentiment?: Sentiment }> = ({ sentiment }) => {
  if (!sentiment || sentiment === Sentiment.Unknown) return null;

  const sentimentMap = {
    [Sentiment.Positive]: { emoji: '😊', color: 'text-emerald-200', text: 'Positive' },
    [Sentiment.Negative]: { emoji: '😠', color: 'text-rose-200', text: 'Negative' },
    [Sentiment.Neutral]: { emoji: '😐', color: 'text-amber-200', text: 'Neutral' },
  };

  const { emoji, color, text } = sentimentMap[sentiment];

  return (
    <div className={`flex items-center space-x-1 text-xs mt-1.5 opacity-90 ${color}`}>
      <span>{emoji}</span>
      <span>{text}</span>
    </div>
  );
};

const Avatar: React.FC<{ src: string, alt: string }> = ({ src, alt }) => (
    <img src={src} alt={alt} className="w-8 h-8 rounded-full shadow-md bg-gray-800" />
);

const Message: React.FC<MessageProps> = ({ message }) => {
  const [isCopied, setIsCopied] = useState(false);
  const longPressTimerRef = useRef<number | null>(null);

  const handleCopyToClipboard = () => {
    // Prevent re-triggering if the "Copied!" message is already showing
    if (isCopied) return;
    
    navigator.clipboard.writeText(message.text).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 1500); // Show "Copied!" for 1.5 seconds
    }).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  };

  const clearLongPressTimer = () => {
     if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  // Start a timer on mouse down or touch start
  const handlePressStart = () => {
    clearLongPressTimer(); // Ensure no old timer is running
    longPressTimerRef.current = window.setTimeout(() => {
        handleCopyToClipboard();
    }, 700); // 700ms is a common duration for long press
  };

  // Clear the timer if the press is released or pointer moves away
  const handlePressEnd = () => {
    clearLongPressTimer();
  };
  
  // Handle right-click for desktop users
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    clearLongPressTimer(); // A right-click shouldn't also trigger a long press
    handleCopyToClipboard();
  };

  const isUser = message.sender === Sender.User;

  const getUserBubbleColor = (sentiment?: Sentiment): string => {
    switch (sentiment) {
      case Sentiment.Positive:
        return 'bg-emerald-600';
      case Sentiment.Negative:
        return 'bg-rose-600';
      case Sentiment.Neutral:
        return 'bg-amber-600';
      case Sentiment.Unknown:
      default:
        return 'bg-cyan-600';
    }
  };

  const messageContainerClasses = isUser ? 'flex justify-end items-end gap-3' : 'flex justify-start items-end gap-3';
  const messageBubbleClasses = isUser
    ? `${getUserBubbleColor(message.sentiment)} text-white rounded-br-none`
    : 'bg-gray-700 text-gray-200 rounded-bl-none';

  return (
    <div className={messageContainerClasses}>
      {!isUser && <Avatar src={BOT_AVATAR_URL} alt="Bot Avatar" />}
      <div 
        className={`relative p-3 rounded-lg max-w-lg shadow-md transition-colors duration-300 select-none ${messageBubbleClasses}`}
        onContextMenu={handleContextMenu}
        onMouseDown={handlePressStart}
        onMouseUp={handlePressEnd}
        onMouseLeave={handlePressEnd}
        onTouchStart={handlePressStart}
        onTouchEnd={handlePressEnd}
      >
        {isCopied && (
            <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center rounded-lg transition-opacity duration-300">
                <span className="text-white font-semibold">Copied!</span>
            </div>
        )}
        <p className="whitespace-pre-wrap">{message.text}</p>
        {isUser && <SentimentIndicator sentiment={message.sentiment} />}
      </div>
      {isUser && <Avatar src={USER_AVATAR_URL} alt="User Avatar" />}
    </div>
  );
};

export default Message;