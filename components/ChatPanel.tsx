import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import MarkdownRenderer from './MarkdownRenderer';
import { SendIcon, SparklesIcon, MicrophoneIcon, StopIcon } from './icons';
import { proseThemeClasses } from './OutputDisplay';

interface ChatPanelProps {
  history: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  isVoiceChatActive: boolean;
  onStartVoiceChat: () => void;
  onStopVoiceChat: () => void;
  partialUserTranscript: string;
  partialModelTranscript: string;
}

const ChatPanel: React.FC<ChatPanelProps> = (props) => {
  const { 
    history, onSendMessage, isLoading,
    isVoiceChatActive, onStartVoiceChat, onStopVoiceChat,
    partialUserTranscript, partialModelTranscript
   } = props;
  const [input, setInput] = useState('');
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading && !isVoiceChatActive) {
      onSendMessage(input);
      setInput('');
    }
  };

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, isLoading, partialUserTranscript, partialModelTranscript]);

  return (
    <div className="mt-8 pt-8 border-t border-gruvbox-light-border dark:border-gruvbox-dark-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-gruvbox-light-fg dark:text-gruvbox-dark-fg">Continue the Conversation</h3>
        {isVoiceChatActive && (
          <span className="flex items-center text-xs font-bold text-gruvbox-red-dark uppercase bg-gruvbox-light-red-dim dark:bg-gruvbox-dark-red-dim px-2 py-1 rounded-md">
            <div className="w-2 h-2 bg-gruvbox-red-dark rounded-full mr-1.5 animate-pulse"></div>
            Live
          </span>
        )}
      </div>
      <div className="space-y-4">
        {history.map((msg, index) => (
          <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xl p-3 rounded-lg ${msg.role === 'user' ? 'bg-gruvbox-blue-dark/20 dark:bg-gruvbox-blue-dark/30' : 'bg-gruvbox-light-bg-soft dark:bg-gruvbox-dark-bg-soft'}`}>
              <div className={`${proseThemeClasses} prose-p:my-0`}>
                 <MarkdownRenderer content={msg.text} glossary={[]} />
              </div>
            </div>
          </div>
        ))}

        {isLoading && history[history.length - 1]?.role === 'user' && (
           <div className="flex justify-start">
             <div className="max-w-xl p-3 rounded-lg bg-gruvbox-light-bg-soft dark:bg-gruvbox-dark-bg-soft">
                <div className="flex items-center space-x-2 text-sm text-gruvbox-gray-light dark:text-gruvbox-gray-dark">
                    <SparklesIcon className="w-5 h-5 animate-pulse" />
                    <span>Thinking...</span>
                </div>
             </div>
           </div>
        )}
         <div ref={endOfMessagesRef} />
      </div>

      {(partialUserTranscript || partialModelTranscript) && (
        <div className="mt-4 p-3 rounded-lg bg-gruvbox-light-bg-soft dark:bg-gruvbox-dark-bg-soft border border-dashed border-gruvbox-light-border dark:border-gruvbox-dark-border min-h-[5em]">
            <p className="text-sm text-gruvbox-gray-light dark:text-gruvbox-gray-dark"><span className="font-bold text-gruvbox-light-fg dark:text-gruvbox-dark-fg">You:</span> {partialUserTranscript}</p>
            <p className="text-sm text-gruvbox-gray-light dark:text-gruvbox-gray-dark mt-1"><span className="font-bold text-gruvbox-light-fg dark:text-gruvbox-dark-fg">StudyMate:</span> {partialModelTranscript}</p>
        </div>
      )}


      <div className="mt-6">
       {isVoiceChatActive ? (
          <div className="flex items-center justify-between p-2 bg-gruvbox-light-bg-soft dark:bg-gruvbox-dark-bg-soft border border-gruvbox-light-border dark:border-gruvbox-dark-border rounded-lg">
            <span className="flex items-center font-semibold text-gruvbox-aqua px-2">
              <MicrophoneIcon className="w-5 h-5 mr-2 animate-pulse" />
              Listening...
            </span>
            <button
              type="button"
              onClick={onStopVoiceChat}
              className="p-2 rounded-md bg-gruvbox-red-dark text-white hover:bg-gruvbox-red-light transition-colors"
              aria-label="Stop voice chat"
            >
              <StopIcon className="w-5 h-5" />
            </button>
          </div>
       ) : (
        <form onSubmit={handleSubmit}>
          <div className="flex items-center p-1 bg-gruvbox-light-bg-soft dark:bg-gruvbox-dark-bg-soft border border-gruvbox-light-border dark:border-gruvbox-dark-border rounded-lg">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a follow-up question..."
              className="w-full p-2 bg-transparent focus:outline-none"
              disabled={isLoading || isVoiceChatActive}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="p-2 rounded-md bg-gruvbox-purple text-white disabled:bg-gruvbox-gray-light dark:disabled:bg-gruvbox-gray-dark disabled:cursor-not-allowed hover:bg-gruvbox-purple-dark transition-colors"
              aria-label="Send message"
            >
              <SendIcon className="w-5 h-5" />
            </button>
             <button
                type="button"
                onClick={onStartVoiceChat}
                disabled={isLoading}
                className="p-2 ml-1 rounded-md text-gruvbox-purple disabled:text-gruvbox-gray-light dark:disabled:text-gruvbox-gray-dark disabled:cursor-not-allowed hover:bg-gruvbox-purple/10 dark:hover:bg-gruvbox-purple-dark/20 transition-colors"
                aria-label="Start voice chat"
              >
                <MicrophoneIcon className="w-5 h-5" />
            </button>
          </div>
        </form>
       )}
      </div>
    </div>
  );
};

export default ChatPanel;