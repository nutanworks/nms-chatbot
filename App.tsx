import React, { useState, useCallback, useEffect, useRef } from 'react';
import ChatWindow from './components/ChatWindow';
import ChatInput from './components/ChatInput';
import { getBotResponse } from './services/geminiService';
import { ChatMessage, Sender, Sentiment } from './types';

const MESSAGE_RECEIVED_SOUND_URL = 'https://cdn.aistudio.google.com/studio/sounds/message_received.mp3';

const playSound = (src: string) => {
  const audio = new Audio(src);
  audio.play().catch(error => console.error("Audio play failed:", error));
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    // Custom error from our service for malformed JSON
    if (error.message.includes("Failed to parse bot response")) {
      return "I seem to have gotten my wires crossed and sent an invalid response. Could you try again?";
    }
    // Generic browser error for network issues
    if (error.name === 'TypeError' && error.message.toLowerCase().includes('fetch')) {
      return "I'm having trouble connecting to the network. Please check your internet connection and try again.";
    }
    // Gemini-specific errors might be generic, but we can check for common phrases
    if (error.message.includes('API key not valid')) {
      return "There's an issue with the API configuration. Please contact support.";
    }
  }
  // A fallback for all other unhandled cases
  return "An unexpected error occurred. I've noted it down and will try to do better.";
};

function App() {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const savedMessages = localStorage.getItem('chatHistory');
      if (savedMessages) {
        return JSON.parse(savedMessages);
      }
    } catch (error) {
      console.error("Failed to load chat history from localStorage", error);
    }
    return [
      {
        id: 1,
        sender: Sender.Bot,
        text: "Hello! I'm NMS. How are you feeling today?",
      }
    ];
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const prevMessagesCount = useRef(messages.length);

  useEffect(() => {
    try {
      localStorage.setItem('chatHistory', JSON.stringify(messages));
    } catch (error) {
      console.error("Failed to save chat history to localStorage", error);
    }
    
    // Play sound only when a new message is added by the bot
    if (messages.length > prevMessagesCount.current) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && lastMessage.sender === Sender.Bot) {
        playSound(MESSAGE_RECEIVED_SOUND_URL);
      }
    }
    prevMessagesCount.current = messages.length;
  }, [messages]);


  const handleSendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now(),
      sender: Sender.User,
      text,
      sentiment: Sentiment.Unknown,
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const botResponse = await getBotResponse(text);
      
      setMessages(prev => 
        prev.map(msg => 
          msg.id === userMessage.id ? { ...msg, sentiment: botResponse.sentiment } : msg
        )
      );

      const botMessage: ChatMessage = {
        id: Date.now() + 1,
        sender: Sender.Bot,
        text: botResponse.reply,
      };
      
      setMessages(prev => [...prev, botMessage]);

    } catch (error) {
      console.error("Failed to get response from bot:", error);
      const errorMessageText = getErrorMessage(error);
      const errorMessage: ChatMessage = {
        id: Date.now() + 1,
        sender: Sender.Bot,
        text: errorMessageText,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <div className="bg-gray-900 text-white flex flex-col h-screen font-sans">
        <div className="bg-gray-800 shadow-md p-4 border-b border-gray-700">
            <h1 className="text-2xl font-bold text-center text-cyan-400">NMS</h1>
            <p className="text-center text-sm text-gray-400">Your AI companion with sentiment analysis</p>
        </div>
        <div className="flex-1 flex flex-col max-w-4xl w-full mx-auto p-4 overflow-hidden">
            <ChatWindow messages={messages} isLoading={isLoading} />
            <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
        </div>
    </div>
  );
}

export default App;