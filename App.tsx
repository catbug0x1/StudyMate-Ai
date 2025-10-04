

import React, { useState, useEffect, useRef } from 'react';
import InputPanel from './components/InputPanel';
import OutputDisplay from './components/OutputDisplay';
import Loader from './components/Loader';
import { SparklesIcon, BookOpenIcon, SunIcon, MoonIcon } from './components/icons';
import { generateStudyMaterials, startFollowUpChat, sendChatMessageStream } from './services/geminiService';
import { StudentProfile, Preferences, StudyOutput, ChatMessage } from './types';
import { GoogleGenAI, Chat, LiveSession, LiveServerMessage, Modality, Blob } from '@google/genai';

// --- Audio Helper Functions ---

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function createBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}


const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [studyOutput, setStudyOutput] = useState<StudyOutput | null>(null);
  const [loaderMessage, setLoaderMessage] = useState("Generating your personalized study materials...");
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  
  const [chat, setChat] = useState<Chat | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const academicContentRef = useRef('');

  // --- Voice Chat State ---
  const [isVoiceChatActive, setIsVoiceChatActive] = useState(false);
  const [partialUserTranscript, setPartialUserTranscript] = useState('');
  const [partialModelTranscript, setPartialModelTranscript] = useState('');
  const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const outputSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef(0);
  const aiRef = useRef<GoogleGenAI | null>(null);


  useEffect(() => {
    // Apply Tailwind dark mode class
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);

    // Dynamically switch PrismJS theme for code blocks
    const existingLink = document.getElementById('prism-theme-link');
    if (existingLink) {
      existingLink.remove();
    }
    const link = document.createElement('link');
    link.id = 'prism-theme-link';
    link.rel = 'stylesheet';
    link.href = theme === 'dark'
      ? 'https://cdn.jsdelivr.net/npm/prism-themes@1.9.0/themes/prism-gruvbox-dark.css'
      : 'https://cdn.jsdelivr.net/npm/prism-themes@1.9.0/themes/prism-gruvbox-light.css';
    document.head.appendChild(link);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  const handleGenerate = async (
    academicContent: string,
    studentProfile: StudentProfile,
    preferences: Preferences
  ) => {
    if (!academicContent.trim()) {
      setError("Input content is empty. Please provide text, a valid URL, or a file.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setStudyOutput(null);
    setChat(null);
    setChatHistory([]);
    await handleStopVoiceChat();
    academicContentRef.current = academicContent;
    setLoaderMessage("Generating your personalized study materials...");
    
    try {
      const result = await generateStudyMaterials(
        academicContent, 
        studentProfile, 
        preferences, 
        'en',
        (status: string) => setLoaderMessage(status)
      );
      setStudyOutput(result);
    } catch (e: any) {
      setError(e.message || 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (studyOutput) {
      const newChat = startFollowUpChat(academicContentRef.current, studyOutput);
      setChat(newChat);
      setChatHistory([
        { role: 'model', text: `Great! I've prepared your study guide for "${studyOutput.summary.title}". How can I help you dive deeper into the material? You can type or start a voice conversation.` }
      ]);
    }
  }, [studyOutput]);

  const handleSendChatMessage = async (message: string) => {
    if (!chat || isVoiceChatActive) return;

    const newHistory: ChatMessage[] = [...chatHistory, { role: 'user', text: message }];
    setChatHistory(newHistory);
    setIsChatLoading(true);

    try {
      const stream = await sendChatMessageStream(chat, message);
      
      let fullResponse = '';
      let currentHistory = [...newHistory, { role: 'model' as 'model', text: '' }];
      setChatHistory(currentHistory);

      for await (const chunk of stream) {
        fullResponse += chunk.text;
        currentHistory[currentHistory.length - 1] = { role: 'model', text: fullResponse };
        setChatHistory([...currentHistory]);
      }
    } catch (e: any) {
      const errorMessage = `Sorry, I encountered an error: ${e.message}`;
      // FIX: Although the error reports line 169, the issue is likely in this catch block.
      // The old code had a logic bug (re-adding user message from stale state) and a likely type-widening issue.
      // This fix corrects the logic by building on the correct `newHistory` variable and explicitly types the new array to satisfy TypeScript.
      const historyWithError: ChatMessage[] = [...newHistory, { role: 'model', text: errorMessage }];
      setChatHistory(historyWithError);
    } finally {
      setIsChatLoading(false);
    }
  };
  
  // --- Voice Chat Implementation ---

  const handleStartVoiceChat = async () => {
    if (isVoiceChatActive || !studyOutput) return;
    setError(null);
    setIsVoiceChatActive(true);
    
    let currentInput = '';
    let currentOutput = '';

    try {
      if (!aiRef.current) {
        aiRef.current = new GoogleGenAI({ apiKey: process.env.API_KEY! });
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      sessionPromiseRef.current = aiRef.current.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
            mediaStreamSourceRef.current = source;
            const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = scriptProcessor;

            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromiseRef.current?.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContextRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.inputTranscription) {
              setPartialUserTranscript(currentInput + message.serverContent.inputTranscription.text);
            }
            if (message.serverContent?.outputTranscription) {
                setPartialModelTranscript(currentOutput + message.serverContent.outputTranscription.text);
            }
            if (message.serverContent?.turnComplete) {
                const finalInput = currentInput + (message.serverContent.inputTranscription?.text || '');
                const finalOutput = currentOutput + (message.serverContent.outputTranscription?.text || '');
                
                if (finalInput.trim()) {
                    setChatHistory(prev => [...prev, {role: 'user', text: finalInput.trim()}]);
                }
                 if (finalOutput.trim()) {
                    setChatHistory(prev => [...prev, {role: 'model', text: finalOutput.trim()}]);
                }
                currentInput = '';
                currentOutput = '';
                setPartialUserTranscript('');
                setPartialModelTranscript('');
            }

            const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
            if (audioData && outputAudioContextRef.current) {
              const audioContext = outputAudioContextRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, audioContext.currentTime);
              
              const audioBuffer = await decodeAudioData(decode(audioData), audioContext, 24000, 1);
              const source = audioContext.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(audioContext.destination);
              
              source.addEventListener('ended', () => {
                outputSourcesRef.current.delete(source);
              });
              
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              outputSourcesRef.current.add(source);
            }
          },
          onerror: (e: ErrorEvent) => {
            console.error("Voice chat error:", e);
            setError(`Voice chat error: ${e.message}`);
            handleStopVoiceChat();
          },
          onclose: (e: CloseEvent) => {
            handleStopVoiceChat();
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: `You are StudyMate AI, an expert tutor. You have just generated a study guide for a student. Now, you will have a voice conversation with them about the material. Be helpful, clear, and stay on topic. The study guide title is "${studyOutput.summary.title}".`
        },
      });
    } catch (err: any) {
      console.error("Failed to start voice chat:", err);
      setError("Could not start voice chat. Please ensure you have a microphone and have granted permission.");
      await handleStopVoiceChat();
    }
  };

  const handleStopVoiceChat = async () => {
    if (!isVoiceChatActive && !sessionPromiseRef.current) return;
    setIsVoiceChatActive(false);

    micStreamRef.current?.getTracks().forEach(track => track.stop());
    scriptProcessorRef.current?.disconnect();
    mediaStreamSourceRef.current?.disconnect();

    if (inputAudioContextRef.current?.state !== 'closed') await inputAudioContextRef.current?.close();
    if (outputAudioContextRef.current?.state !== 'closed') await outputAudioContextRef.current?.close();

    outputSourcesRef.current.forEach(source => source.stop());
    outputSourcesRef.current.clear();
    
    sessionPromiseRef.current?.then(session => session.close()).catch(e => console.error("Error closing session:", e));

    micStreamRef.current = null;
    scriptProcessorRef.current = null;
    mediaStreamSourceRef.current = null;
    inputAudioContextRef.current = null;
    outputAudioContextRef.current = null;
    sessionPromiseRef.current = null;
    nextStartTimeRef.current = 0;
    setPartialUserTranscript('');
    setPartialModelTranscript('');
  };

  return (
    <div className="min-h-screen bg-gruvbox-light-bg dark:bg-gruvbox-dark-bg font-sans text-gruvbox-light-fg dark:text-gruvbox-dark-fg transition-colors duration-300">
      <header className="bg-gruvbox-light-bg-soft dark:bg-gruvbox-dark-bg-soft border-b border-gruvbox-light-border dark:border-gruvbox-dark-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <BookOpenIcon className="w-8 h-8 text-gruvbox-purple" />
            <h1 className="text-2xl font-bold ml-3 text-gruvbox-light-fg dark:text-gruvbox-dark-fg">StudyMate AI</h1>
          </div>
          <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-gruvbox-light-bg-hover dark:hover:bg-gruvbox-dark-bg-hover transition-colors">
            {theme === 'light' ? <MoonIcon className="w-6 h-6 text-gruvbox-light-fg" /> : <SunIcon className="w-6 h-6 text-gruvbox-dark-fg" />}
          </button>
        </div>
      </header>
      <main className="container mx-auto p-4 md:p-8">
        <div className="flex flex-col gap-8">
          <div className="bg-gruvbox-light-bg-soft dark:bg-gruvbox-dark-bg-soft p-6 rounded-lg border border-gruvbox-light-border dark:border-gruvbox-dark-border">
            <h2 className="text-xl font-semibold mb-6 flex items-center text-gruvbox-light-fg dark:text-gruvbox-dark-fg">
              <SparklesIcon className="w-6 h-6 mr-2 text-gruvbox-purple" />
              Create Your Study Guide
            </h2>
            <InputPanel onGenerate={handleGenerate} isLoading={isLoading} />
          </div>
          <div className="bg-gruvbox-light-bg-soft dark:bg-gruvbox-dark-bg-soft p-6 rounded-lg border border-gruvbox-light-border dark:border-gruvbox-dark-border min-h-[500px]">
            {isLoading && <Loader message={loaderMessage} />}
            {error && (
              <div className="text-gruvbox-red-dark bg-gruvbox-light-red-dim dark:bg-gruvbox-dark-red-dim p-4 rounded-md border border-gruvbox-red-light dark:border-gruvbox-red-dark">
                <span className="font-bold">Error:</span> {error}
              </div>
            )}
            {studyOutput && (
              <OutputDisplay
                studyOutput={studyOutput}
                chatHistory={chatHistory}
                isChatLoading={isChatLoading}
                onSendMessage={handleSendChatMessage}
                chatReady={!!chat}
                isVoiceChatActive={isVoiceChatActive}
                onStartVoiceChat={handleStartVoiceChat}
                onStopVoiceChat={handleStopVoiceChat}
                partialUserTranscript={partialUserTranscript}
                partialModelTranscript={partialModelTranscript}
              />
            )}
            {!isLoading && !error && !studyOutput && (
              <div className="flex flex-col items-center justify-center h-full text-center text-gruvbox-gray-light dark:text-gruvbox-gray-dark py-16">
                <BookOpenIcon className="w-20 h-20 text-gruvbox-light-bg-hover dark:text-gruvbox-dark-bg-hover mb-4" />
                <h3 className="text-xl font-semibold text-gruvbox-light-fg dark:text-gruvbox-dark-fg">Study Materials Output</h3>
                <p>Your personalized guide will appear here once generated.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;