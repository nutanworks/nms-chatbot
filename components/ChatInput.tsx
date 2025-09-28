import React, { useState, useRef, useEffect } from 'react';

// FIX: Add types for Web Speech API to fix TypeScript errors.
// These interfaces are not part of the default DOM typings.
interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: (this: SpeechRecognition, ev: SpeechRecognitionEvent) => any;
  onstart: (this: SpeechRecognition, ev: Event) => any;
  onend: (this: SpeechRecognition, ev: Event) => any;
  onerror: (this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any;
  start(): void;
  stop(): void;
}

declare global {
  interface Window {
    SpeechRecognition: { new (): SpeechRecognition };
    webkitSpeechRecognition: { new (): SpeechRecognition };
  }
}

// Sound effect URLs
const SOUNDS = {
  MESSAGE_SENT: 'https://cdn.pixabay.com/download/audio/2022/03/10/audio_c394c0347e.mp3',
  MIC_ON: 'https://cdn.pixabay.com/download/audio/2021/08/04/audio_51c6c0a0c9.mp3',
  MIC_OFF: 'https://cdn.pixabay.com/download/audio/2021/08/04/audio_c6d5cfb868.mp3',
  ERROR: 'https://cdn.pixabay.com/download/audio/2022/03/10/audio_a7e2832148.mp3',
};

const playSound = (src: string) => {
  const audio = new Audio(src);
  audio.play().catch(error => console.error("Audio play failed:", error));
};


interface ChatInputProps {
  onSendMessage: (text: string) => void;
  isLoading: boolean;
  speechLang: string;
}

const SendIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
    </svg>
);

const MicrophoneIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M12 18.75a6 6 0 0 0 6-6v-1.5a6 6 0 0 0-12 0v1.5a6 6 0 0 0 6 6Z" />
        <path d="M12 21.75a.75.75 0 0 1-.75-.75v-2.639a6.002 6.002 0 0 0-5.25-5.962.75.75 0 0 1 0-1.498A6.002 6.002 0 0 0 11.25 5.61V3a.75.75 0 0 1 1.5 0v2.61a6.002 6.002 0 0 0 5.25 5.962.75.75 0 0 1 0 1.498A6.002 6.002 0 0 0 12.75 18.36v2.64a.75.75 0 0 1-.75.75Z" />
    </svg>
);


const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading, speechLang }) => {
  const [text, setText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const initialTextRef = useRef('');

  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      console.warn("Speech recognition not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognitionRef.current = recognition;

    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = speechLang;

    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        transcript += event.results[i][0].transcript;
      }
      setText(initialTextRef.current + transcript);
    };

    recognition.onstart = () => {
      playSound(SOUNDS.MIC_ON);
      setIsListening(true);
      setSpeechError(null);
    }
    recognition.onend = () => {
      playSound(SOUNDS.MIC_OFF);
      setIsListening(false);
      initialTextRef.current = '';
    }
    recognition.onerror = (event) => {
        playSound(SOUNDS.ERROR);
        console.error("Speech recognition error:", event.error);
        let errorMessage = "An unknown error occurred during speech recognition.";
        switch (event.error) {
            case 'no-speech':
                errorMessage = "No speech was detected. Please try again.";
                break;
            case 'audio-capture':
                errorMessage = "Microphone not found. Please ensure it's connected and enabled.";
                break;
            case 'not-allowed':
                errorMessage = "Microphone access denied. Please enable it in your browser settings.";
                break;
            case 'network':
                 errorMessage = "A network error prevented speech recognition. Please check your connection.";
                 break;
        }
        setSpeechError(errorMessage);
        setTimeout(() => setSpeechError(null), 5000); // Clear error after 5 seconds
        setIsListening(false);
    };
    
    // Cleanup function to stop recognition if component unmounts while listening
    return () => {
        recognition.stop();
    };
  }, [speechLang]);

  const handleMicClick = () => {
    if (!recognitionRef.current) return;
    
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      // Capture the initial text *right before* starting
      initialTextRef.current = text ? text + ' ' : '';
      recognitionRef.current.start();
      textareaRef.current?.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim() && !isLoading) {
      playSound(SOUNDS.MESSAGE_SENT);
      onSendMessage(text);
      setText('');
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  return (
    <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg shadow-inner transition-colors duration-300">
      <form onSubmit={handleSubmit} className="flex items-center space-x-3">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message or use the microphone..."
          className="flex-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 rounded-lg p-3 resize-none focus:ring-2 focus:ring-cyan-500 focus:outline-none transition duration-200 disabled:opacity-50"
          disabled={isLoading}
          rows={1}
        />
        <button
          type="button"
          onClick={handleMicClick}
          disabled={isLoading || !recognitionRef.current}
          className={`text-white p-3 rounded-full transition duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-800 focus:ring-cyan-500
            ${isListening ? 'bg-rose-600 animate-pulse' : 'bg-gray-500 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-500'}
            disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50
          `}
          aria-label={isListening ? 'Stop listening' : 'Start listening'}
        >
          <MicrophoneIcon />
        </button>
        <button
          type="submit"
          disabled={isLoading || !text.trim()}
          className="bg-cyan-600 text-white p-3 rounded-full hover:bg-cyan-500 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-800 focus:ring-cyan-500"
          aria-label="Send message"
        >
          <SendIcon />
        </button>
      </form>
      {speechError && (
        <p className="text-rose-600 dark:text-rose-400 text-sm text-center mt-2 animate-pulse">{speechError}</p>
      )}
    </div>
  );
};

export default ChatInput;