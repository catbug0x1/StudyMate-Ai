

import React, { useState, useCallback, useRef } from 'react';
import { StudentProfile, Preferences, InputType } from '../types';
import { FileUploadIcon, LinkIcon, TextIcon, CheckCircleIcon } from './icons';

interface InputPanelProps {
  onGenerate: (
    academicContent: string,
    studentProfile: StudentProfile,
    preferences: Preferences
  ) => void;
  isLoading: boolean;
}

const getYoutubeVideoId = (url: string): string | null => {
    const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(youtubeRegex);
    return match ? match[1] : null;
};


const InputPanel: React.FC<InputPanelProps> = ({ onGenerate, isLoading }) => {
  const [inputType, setInputType] = useState<InputType>('text');
  const [inputText, setInputText] = useState('');
  const [inputUrl, setInputUrl] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fileStatus, setFileStatus] = useState<'idle' | 'processing' | 'success'>('idle');
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);

  const [studentProfile, setStudentProfile] = useState<StudentProfile>({
    level: 'undergrad',
    learning_style: 'mixed',
    goals: ['deep_understanding'],
  });

  const [preferences, setPreferences] = useState<Preferences>({
    summary_length: 'medium',
    flashcards: { enabled: true, density: 'key_concepts', count: 15 },
    quiz: { enabled: true, depth: 'quick_check', count: 10 },
    study_plan: { enabled: false, weeks: 4 },
  });

  const pdfjsLibRef = useRef<any>(null);
  const mammothLibRef = useRef<any>(null);
  const jszipLibRef = useRef<any>(null);

  const loadPdfJs = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (pdfjsLibRef.current) {
        return resolve(pdfjsLibRef.current);
      }
      if ((window as any).pdfjsLib) {
          const pdfjsLib = (window as any).pdfjsLib;
          pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.6.347/pdf.worker.min.js`;
          pdfjsLibRef.current = pdfjsLib;
          return resolve(pdfjsLib);
      }
      
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.6.347/pdf.min.js';
      script.async = true;

      script.onload = () => {
        try {
            const pdfjsLib = (window as any).pdfjsLib;
            if (!pdfjsLib) {
                throw new Error("pdfjsLib not found on window object after script load.");
            }
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.6.347/pdf.worker.min.js`;
            pdfjsLibRef.current = pdfjsLib;
            resolve(pdfjsLib);
        } catch (e) {
            console.error("Failed to initialize PDF.js library after loading:", e);
            setError("Could not initialize PDF processing library. Please try pasting text directly.");
            reject(e);
        }
      };
      
      script.onerror = (error) => {
        console.error("Failed to load PDF.js script:", error);
        setError("Could not load PDF processing library from the network. Please check your connection or try pasting text directly.");
        reject(error);
      };

      document.body.appendChild(script);
    });
  }, []);

  const loadMammothJs = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (mammothLibRef.current) return resolve(mammothLibRef.current);
      if ((window as any).mammoth) {
        mammothLibRef.current = (window as any).mammoth;
        return resolve(mammothLibRef.current);
      }
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.7.1/mammoth.browser.min.js';
      script.async = true;
      script.onload = () => {
        if ((window as any).mammoth) {
          mammothLibRef.current = (window as any).mammoth;
          resolve(mammothLibRef.current);
        } else {
          const msg = "mammoth.js not found on window object.";
          console.error(msg);
          setError("Failed to initialize document processor.");
          reject(new Error(msg));
        }
      };
      script.onerror = (err) => {
        console.error("Failed to load mammoth.js", err);
        setError("Could not load document processing library.");
        reject(err);
      };
      document.body.appendChild(script);
    });
  }, []);

  const loadJszip = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (jszipLibRef.current) return resolve(jszipLibRef.current);
      if ((window as any).JSZip) {
        jszipLibRef.current = (window as any).JSZip;
        return resolve(jszipLibRef.current);
      }
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
      script.async = true;
      script.onload = () => {
        if ((window as any).JSZip) {
          jszipLibRef.current = (window as any).JSZip;
          resolve(jszipLibRef.current);
        } else {
          const msg = "JSZip not found on window object.";
          console.error(msg);
          setError("Failed to initialize presentation processor.");
          reject(new Error(msg));
        }
      };
      script.onerror = (err) => {
        console.error("Failed to load jszip.js", err);
        setError("Could not load presentation processing library.");
        reject(err);
      };
      document.body.appendChild(script);
    });
  }, []);

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setFileStatus('idle');
      setFileName('');
      setFileContent('');
      return;
    }

    setError(null);
    setFileName(file.name);
    setFileContent('');
    setFileStatus('processing');

    const fileType = file.type;
    const fileNameLower = file.name.toLowerCase();
    
    const DOCX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    const PPTX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

    if (fileType === 'application/pdf') {
        try {
            const pdfjsLib: any = await loadPdfJs();
            if (!pdfjsLib) {
                setError("PDF library failed to load.");
                setFileStatus('idle');
                return;
            }
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const arrayBuffer = e.target?.result as ArrayBuffer;
                    if (!arrayBuffer) {
                        setError("Failed to read the file.");
                        setFileStatus('idle');
                        return;
                    }
                    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
                    let text = '';
                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const textContent = await page.getTextContent();
                        const pageText = textContent.items.map((item: any) => item.str).join(' ');
                        text += pageText + '\n';
                    }
                    setFileContent(text);
                    setFileStatus('success');
                } catch (err) {
                    console.error("Error parsing PDF:", err);
                    setError("Failed to parse PDF file. It might be corrupted or protected.");
                    setFileStatus('idle');
                }
            };
            reader.readAsArrayBuffer(file);
        } catch (error) {
            console.error("PDF.js loading failed:", error);
            setFileStatus('idle');
        }
    } else if (fileType === DOCX_MIME_TYPE || fileNameLower.endsWith('.docx')) {
        try {
            const mammoth = await loadMammothJs();
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const arrayBuffer = e.target?.result as ArrayBuffer;
                    if (!arrayBuffer) { setError("Failed to read the file."); setFileStatus('idle'); return; }
                    const result = await (mammoth as any).extractRawText({ arrayBuffer });
                    setFileContent(result.value);
                    setFileStatus('success');
                } catch (err) {
                    console.error("Error parsing DOCX:", err);
                    setError("Failed to parse DOCX file. It might be corrupted.");
                    setFileStatus('idle');
                }
            };
            reader.readAsArrayBuffer(file);
        } catch (error) {
            console.error("Error processing DOCX:", error);
            setFileStatus('idle');
        }
    } else if (fileType === PPTX_MIME_TYPE || fileNameLower.endsWith('.pptx')) {
        try {
            const JSZip = await loadJszip();
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const arrayBuffer = e.target?.result as ArrayBuffer;
                    if (!arrayBuffer) { setError("Failed to read the file."); setFileStatus('idle'); return; }
                    const zip = await (JSZip as any).loadAsync(arrayBuffer);
                    const slidePromises: Promise<{ slideNum: number; text: string }>[] = [];
                    const slideRegex = /ppt\/slides\/slide(\d+)\.xml/;

                    zip.forEach((relativePath: string, file: any) => {
                        const match = relativePath.match(slideRegex);
                        if (match) {
                            const slideNum = parseInt(match[1], 10);
                            const promise = file.async('string').then((xmlText: string) => {
                                const parser = new DOMParser();
                                const xmlDoc = parser.parseFromString(xmlText, 'application/xml');
                                
                                const errorNode = xmlDoc.querySelector('parsererror');
                                if (errorNode) {
                                    console.warn(`XML parsing error for slide ${slideNum}:`, errorNode.textContent);
                                    return { slideNum, text: '' };
                                }

                                const paragraphs = xmlDoc.getElementsByTagName('a:p');
                                const texts: string[] = [];
                                if (paragraphs) {
                                    for (let i = 0; i < paragraphs.length; i++) {
                                        const pText = paragraphs[i].textContent?.trim();
                                        if (pText) {
                                            texts.push(pText);
                                        }
                                    }
                                }
                                return { slideNum, text: texts.join('\n') };
                            });
                            slidePromises.push(promise);
                        }
                    });
                    
                    const slides = await Promise.all(slidePromises);
                    slides.sort((a, b) => a.slideNum - b.slideNum);
                    const fullText = slides.map(slide => slide.text).join('\n\n');
                    setFileContent(fullText);
                    setFileStatus('success');
                } catch (err) {
                    console.error("Error parsing PPTX:", err);
                    setError("Failed to parse PPTX file. It might be corrupted.");
                    setFileStatus('idle');
                }
            };
            reader.readAsArrayBuffer(file);
        } catch (error) {
            console.error("Error processing PPTX:", error);
            setFileStatus('idle');
        }
    } else if (fileType === 'text/plain' || fileNameLower.endsWith('.txt')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            setFileContent(e.target?.result as string);
            setFileStatus('success');
        };
        reader.readAsText(file);
    } else {
        setError('Unsupported file type. Please upload a PDF, TXT, DOCX, or PPTX file.');
        setFileStatus('idle');
    }
  }, [loadPdfJs, loadMammothJs, loadJszip]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (inputType === 'url') {
      if (!inputUrl.trim()) {
        setError('Please enter a URL.');
        return;
      }
      try {
        new URL(inputUrl);
      } catch (_) {
        setError('Please enter a valid URL.');
        return;
      }
      
      setIsFetchingUrl(true);
      setError(null);
      const videoId = getYoutubeVideoId(inputUrl);

      try {
        let academicContent = '';
        if (videoId) {
            const transcriptApiUrl = `https://youtube-transcript-api.vercel.app/api/transcript?videoId=${videoId}`;
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(transcriptApiUrl)}`;
            
            const response = await fetch(proxyUrl);
            const transcriptText = await response.text();

            if (!response.ok) {
                let errorMsg = `The transcript service failed. Status: ${response.status}.`;
                 try {
                    const errorJson = JSON.parse(transcriptText);
                    if (errorJson && errorJson.error) {
                        errorMsg = errorJson.error;
                    }
                } catch (e) { /* Ignore JSON parse error, use the status text */ }
                throw new Error(errorMsg);
            }

            const transcriptData = JSON.parse(transcriptText);

            if (transcriptData && transcriptData.error) {
                throw new Error(transcriptData.error);
            }

            if (!Array.isArray(transcriptData) || transcriptData.length === 0) {
                throw new Error("This video does not have a transcript available. This can happen with music videos or videos without spoken words. Please try a different video.");
            }
            
            academicContent = transcriptData.map((item: { text: string }) => item.text).join(' ');
        } else {
            // Standard article scraping logic
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(inputUrl)}`;
            const response = await fetch(proxyUrl);
            if (!response.ok) { throw new Error(`Network response was not ok: ${response.statusText}`); }
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            doc.querySelectorAll('script, style, nav, header, footer, aside').forEach(el => el.remove());
            academicContent = doc.body.textContent || "";
        }
        
        academicContent = academicContent.replace(/\s\s+/g, ' ').trim();
        if (!academicContent) {
            throw new Error(videoId ? "The extracted transcript was empty." : "Could not extract any text from the provided URL.");
        }
        
        onGenerate(academicContent, studentProfile, preferences);

      } catch (err: any) {
        if (videoId && err.message.includes("does not have a transcript available")) {
          setError(err.message);
        } else {
          const errorPrefix = videoId ? "Failed to process YouTube URL" : "Failed to process article URL";
          setError(`${errorPrefix}. ${err.message}. Please try again or paste the text directly.`);
        }
      } finally {
        setIsFetchingUrl(false);
      }
      return;
    }
    
    let content = '';
    if (inputType === 'text') content = inputText;
    else if (inputType === 'file') content = fileContent;

    if (!content.trim()) {
        setError('Please provide some content to generate study materials from.');
        return;
    }
    setError(null);
    onGenerate(content, studentProfile, preferences);
  };
  
  const handleGoalChange = (goal: 'exam' | 'revision' | 'deep_understanding') => {
      setStudentProfile(p => {
          const newGoals = p.goals.includes(goal)
              ? p.goals.filter(g => g !== goal)
              : [...p.goals, goal];
          return { ...p, goals: newGoals.length > 0 ? newGoals : ['deep_understanding'] };
      })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <div className="border-b border-gruvbox-light-border dark:border-gruvbox-dark-border">
          <nav className="-mb-px flex space-x-4" aria-label="Tabs">
            {(['text', 'file', 'url'] as const).map(tab => (
              <button type="button" key={tab} onClick={() => setInputType(tab)}
                className={`${inputType === tab ? 'border-gruvbox-purple text-gruvbox-purple' : 'border-transparent text-gruvbox-gray-light dark:text-gruvbox-gray-dark hover:text-gruvbox-light-fg dark:hover:text-gruvbox-dark-fg hover:border-gruvbox-gray-light dark:hover:border-gruvbox-gray-dark'} flex items-center whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors`}
              >
                {tab === 'text' && <TextIcon className="w-5 h-5 mr-2" />}
                {tab === 'file' && <FileUploadIcon className="w-5 h-5 mr-2" />}
                {tab === 'url' && <LinkIcon className="w-5 h-5 mr-2" />}
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>
        <div className="pt-4">
          {inputType === 'text' && <textarea value={inputText} onChange={e => setInputText(e.target.value)} placeholder="Paste your academic text here..." rows={8} className="w-full p-2 bg-gruvbox-light-bg dark:bg-gruvbox-dark-bg border border-gruvbox-light-border dark:border-gruvbox-dark-border rounded-md focus:ring-1 focus:ring-gruvbox-purple focus:border-gruvbox-purple" />}
          {inputType === 'file' && 
            <div>
              <input type="file" onChange={handleFileChange} accept=".pdf,.txt,.docx,.pptx" className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gruvbox-purple-dark/10 dark:file:bg-gruvbox-purple-dark/20 file:text-gruvbox-purple dark:file:text-gruvbox-dark-fg hover:file:bg-gruvbox-purple-dark/20 dark:hover:file:bg-gruvbox-purple-dark/30"/>
              <div className="mt-2 h-10 flex items-center justify-center">
                  {fileStatus === 'idle' && (
                      <p className="text-xs text-gruvbox-gray-light dark:text-gruvbox-gray-dark">
                          Upload a PDF, TXT, DOCX, or PPTX file.
                      </p>
                  )}
                  {fileStatus === 'processing' && (
                      <div className="w-full">
                          <div className="relative pt-1">
                              <div className="overflow-hidden h-2 mb-1 text-xs flex rounded bg-gruvbox-light-bg-hover dark:bg-gruvbox-dark-bg-hover">
                                  <div style={{ width: '100%' }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gruvbox-blue animate-pulse"></div>
                              </div>
                              <p className="text-xs text-center text-gruvbox-gray-light dark:text-gruvbox-gray-dark">
                                  Processing: {fileName}
                              </p>
                          </div>
                      </div>
                  )}
                  {fileStatus === 'success' && (
                      <div className="flex items-center p-2 bg-gruvbox-light-green-dim dark:bg-gruvbox-dark-green-dim border border-gruvbox-green rounded-md text-sm w-full">
                          <CheckCircleIcon className="w-5 h-5 mr-2 text-gruvbox-green flex-shrink-0" />
                          <p className="font-semibold text-gruvbox-light-fg dark:text-gruvbox-dark-fg truncate" title={fileName}>
                              {fileName}
                          </p>
                          <span className="ml-1 text-gruvbox-gray-light dark:text-gruvbox-gray-dark flex-shrink-0">is ready.</span>
                      </div>
                  )}
              </div>
            </div>
          }
          {inputType === 'url' && <input type="url" value={inputUrl} onChange={e => setInputUrl(e.target.value)} placeholder="https://example.com/article or YouTube URL" className="w-full p-2 bg-gruvbox-light-bg dark:bg-gruvbox-dark-bg border border-gruvbox-light-border dark:border-gruvbox-dark-border rounded-md focus:ring-1 focus:ring-gruvbox-purple focus:border-gruvbox-purple" />}
        </div>
      </div>

      {/* Student Profile */}
      <div className="space-y-4">
        <h3 className="font-semibold">Student Profile</h3>
        <div>
          <label className="block text-sm font-medium mb-1">Academic Level</label>
          <select value={studentProfile.level} onChange={e => setStudentProfile(p => ({ ...p, level: e.target.value as any }))} className="w-full p-2 bg-gruvbox-light-bg dark:bg-gruvbox-dark-bg border border-gruvbox-light-border dark:border-gruvbox-dark-border rounded-md focus:ring-1 focus:ring-gruvbox-purple focus:border-gruvbox-purple">
            <option value="school">High School</option>
            <option value="undergrad">Undergraduate</option>
            <option value="grad">Graduate</option>
            <option value="expert">Expert</option>
          </select>
        </div>
         <div>
            <label className="block text-sm font-medium mb-1">Main Goals</label>
            <div className="flex flex-wrap gap-2">
                {(['exam', 'revision', 'deep_understanding'] as const).map(g => (
                    <button type="button" key={g} onClick={() => handleGoalChange(g)} className={`px-3 py-1 text-sm rounded-full border transition-colors ${studentProfile.goals.includes(g) ? 'bg-gruvbox-light-yellow-dim dark:bg-gruvbox-dark-yellow-dim text-gruvbox-light-fg dark:text-gruvbox-dark-fg border-gruvbox-light-border-yellow dark:border-gruvbox-dark-border-yellow' : 'bg-transparent text-gruvbox-gray-light dark:text-gruvbox-gray-dark border-gruvbox-light-border dark:border-gruvbox-dark-border hover:bg-gruvbox-light-bg-hover dark:hover:bg-gruvbox-dark-bg-hover'}`}>{g.replace('_',' ')}</button>
                ))}
            </div>
        </div>
      </div>

      {/* Preferences */}
      <div className="space-y-4">
        <h3 className="font-semibold">Output Preferences</h3>
        <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Flashcards</label>
            <button type="button" onClick={() => setPreferences(p => ({...p, flashcards: {...p.flashcards, enabled: !p.flashcards.enabled}}))} className={`${preferences.flashcards.enabled ? 'bg-gruvbox-aqua' : 'bg-gruvbox-gray-dark'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}>
                <span className={`${preferences.flashcards.enabled ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
            </button>
        </div>
        {preferences.flashcards.enabled && (
            <div className="flex items-center justify-between pl-4">
                <label htmlFor="flashcard-count" className="text-sm font-medium text-gruvbox-gray-light dark:text-gruvbox-gray-dark">Number of flashcards</label>
                <input id="flashcard-count" type="number" min="5" max="50" step="1" value={preferences.flashcards.count} onChange={e => setPreferences(p => ({...p, flashcards: {...p.flashcards, count: parseInt(e.target.value, 10)}}))} className="w-20 p-1 text-sm bg-gruvbox-light-bg dark:bg-gruvbox-dark-bg border border-gruvbox-light-border dark:border-gruvbox-dark-border rounded-md focus:ring-1 focus:ring-gruvbox-purple focus:border-gruvbox-purple" />
            </div>
        )}

        <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Quiz</label>
             <button type="button" onClick={() => setPreferences(p => ({...p, quiz: {...p.quiz, enabled: !p.quiz.enabled}}))} className={`${preferences.quiz.enabled ? 'bg-gruvbox-aqua' : 'bg-gruvbox-gray-dark'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}>
                <span className={`${preferences.quiz.enabled ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
            </button>
        </div>
         {preferences.quiz.enabled && (
            <div className="flex items-center justify-between pl-4">
                <label htmlFor="quiz-count" className="text-sm font-medium text-gruvbox-gray-light dark:text-gruvbox-gray-dark">Number of questions</label>
                <input id="quiz-count" type="number" min="3" max="30" step="1" value={preferences.quiz.count} onChange={e => setPreferences(p => ({...p, quiz: {...p.quiz, count: parseInt(e.target.value, 10)}}))} className="w-20 p-1 text-sm bg-gruvbox-light-bg dark:bg-gruvbox-dark-bg border border-gruvbox-light-border dark:border-gruvbox-dark-border rounded-md focus:ring-1 focus:ring-gruvbox-purple focus:border-gruvbox-purple" />
            </div>
        )}

        <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Study Plan</label>
            <button type="button" onClick={() => setPreferences(p => ({...p, study_plan: {...p.study_plan, enabled: !p.study_plan.enabled}}))} className={`${preferences.study_plan.enabled ? 'bg-gruvbox-aqua' : 'bg-gruvbox-gray-dark'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}>
                <span className={`${preferences.study_plan.enabled ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
            </button>
        </div>
      </div>

      {error && <p className="text-sm text-gruvbox-red-dark dark:text-gruvbox-red-dark">{error}</p>}

      <button type="submit" disabled={isLoading || isFetchingUrl} className="w-full flex items-center justify-center py-3 px-4 bg-gruvbox-purple text-white font-semibold rounded-md hover:bg-gruvbox-purple-dark disabled:bg-gruvbox-gray-light dark:disabled:bg-gruvbox-gray-dark disabled:cursor-not-allowed transition-colors">
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
            Generating...
          </>
        ) : isFetchingUrl ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
            {getYoutubeVideoId(inputUrl) ? 'Fetching Transcript...' : 'Fetching URL...'}
          </>
        ) : 'Generate Study Materials'}
      </button>
    </form>
  );
};

export default InputPanel;