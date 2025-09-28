import React, { useState, useCallback, useEffect, useRef } from 'react';
import ChatWindow from './components/ChatWindow';
import ChatInput from './components/ChatInput';
import SettingsModal from './components/SettingsModal';
import { getBotResponse } from './services/geminiService';
import { ChatMessage, Sender, Sentiment } from './types';

const MESSAGE_RECEIVED_SOUND_URL = 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_2c3d56998b.mp3';

const playSound = (src: string) => {
  const audio = new Audio(src);
  audio.play().catch(error => console.error("Audio play failed:", error));
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    if (error.message.includes("Failed to parse bot response")) {
      return "I seem to have gotten my wires crossed and sent an invalid response. Could you try again?";
    }
    if (error.name === 'TypeError' && error.message.toLowerCase().includes('fetch')) {
      return "I'm having trouble connecting to the network. Please check your internet connection and try again.";
    }
    if (error.message.includes('API key not valid')) {
      return "There's an issue with the API configuration. Please contact support.";
    }
  }
  return "An unexpected error occurred. I've noted it down and will try to do better.";
};

// Define theme type
type Theme = 'light' | 'dark';

const INITIAL_MESSAGE: ChatMessage = { 
  id: 1, 
  sender: Sender.Bot, 
  text: "Welcome! I'm NMS, your AI companion with sentiment analysis. Feel free to chat about anything on your mind. How can I help you today?" 
};

const NewChatIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
);

const MoonIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
    </svg>
);

const SunIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
    </svg>
);

const SettingsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.24-.438.613-.43.992a6.759 6.759 0 0 1 0 1.844c.008.379.137.752.43.992l1.004.827a1.125 1.125 0 0 1 .26 1.43-1.125 1.125 0 0 1-1.37.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 0 1-.22.128c-.333.183-.582.495-.645.87l-.213 1.28c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.063-.374-.313-.686-.645-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.075-.124l-1.217.456a1.125 1.125 0 0 1-1.37-.49l-1.296-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.759 6.759 0 0 1 0-1.844c-.008-.379-.137-.752-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43 1.125 1.125 0 0 1 1.37-.491l1.217.456c.355.133.75.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.645-.87l.213-1.28Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
);


function App() {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const savedMessages = localStorage.getItem('chatHistory');
      const parsedMessages = savedMessages ? JSON.parse(savedMessages) : null;
      return parsedMessages && parsedMessages.length > 0 ? parsedMessages : [INITIAL_MESSAGE];
    } catch (error) {
      console.error("Failed to load chat history from localStorage", error);
      return [INITIAL_MESSAGE];
    }
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const savedTheme = localStorage.getItem('theme') as Theme | null;
      return savedTheme || 'dark';
    } catch {
      return 'dark';
    }
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [speechLang, setSpeechLang] = useState<string>(() => {
    try {
      const savedLang = localStorage.getItem('speechLang');
      return savedLang || 'en-US'; // Default to English
    } catch {
      return 'en-US';
    }
  });

  const prevMessagesCount = useRef(messages.length);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try {
      localStorage.setItem('theme', theme);
    } catch (error) {
      console.error("Failed to save theme to localStorage", error);
    }
  }, [theme]);
  
  useEffect(() => {
    try {
      localStorage.setItem('chatHistory', JSON.stringify(messages));
    } catch (error) {
      console.error("Failed to save chat history to localStorage", error);
    }
    
    if (messages.length > prevMessagesCount.current) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && lastMessage.sender === Sender.Bot) {
        playSound(MESSAGE_RECEIVED_SOUND_URL);
      }
    }
    prevMessagesCount.current = messages.length;
  }, [messages]);

  useEffect(() => {
    try {
      localStorage.setItem('speechLang', speechLang);
    } catch (error) {
      console.error("Failed to save speech language to localStorage", error);
    }
  }, [speechLang]);

  const handleNewChat = () => {
    setMessages([INITIAL_MESSAGE]);
  };

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

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
      setMessages(prev => prev.map(msg => msg.id === userMessage.id ? { ...msg, sentiment: botResponse.sentiment } : msg));
      const botMessage: ChatMessage = { id: Date.now() + 1, sender: Sender.Bot, text: botResponse.reply };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error("Failed to get response from bot:", error);
      const errorMessageText = getErrorMessage(error);
      const errorMessage: ChatMessage = { id: Date.now() + 1, sender: Sender.Bot, text: errorMessageText };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white flex flex-col h-screen font-sans transition-colors duration-300">
        <div className="relative bg-gray-100 dark:bg-gray-800 shadow-md p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="text-center">
                <h1 className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">NMS</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Your AI companion with sentiment analysis</p>
            </div>
            <div className="absolute top-1/2 right-4 -translate-y-1/2 flex items-center gap-2">
                 <button
                    onClick={handleNewChat}
                    className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    aria-label="Start new chat"
                >
                    <NewChatIcon />
                </button>
                 <button
                    onClick={() => setIsSettingsOpen(true)}
                    className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    aria-label="Open settings"
                >
                    <SettingsIcon />
                </button>
                <button
                    onClick={toggleTheme}
                    className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    aria-label="Toggle theme"
                >
                    {theme === 'light' ? <MoonIcon /> : <SunIcon />}
                </button>
            </div>
        </div>
        <div className="flex-1 flex flex-col max-w-4xl w-full mx-auto p-4 overflow-hidden">
            <ChatWindow messages={messages} isLoading={isLoading} />
            <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} speechLang={speechLang} />
        </div>
        <SettingsModal 
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            currentLang={speechLang}
            onLangChange={setSpeechLang}
        />
    </div>
  );
}

export default App;