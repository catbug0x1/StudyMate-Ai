import React, { useState, useMemo, useEffect } from 'react';
import { StudyOutput, Flashcard, QuizQuestion, ChatMessage } from '../types';
import { CheckCircleIcon, XCircleIcon } from './icons';
import MarkdownRenderer from './MarkdownRenderer';
import ChatPanel from './ChatPanel';

export const proseThemeClasses = `prose max-w-none prose-neutral dark:prose-invert 
    prose-p:text-gruvbox-dark-bg dark:prose-p:text-gruvbox-dark-fg 
    prose-headings:text-gruvbox-dark-bg dark:prose-headings:text-gruvbox-dark-fg
    prose-h1:text-gruvbox-purple dark:prose-h1:text-gruvbox-purple-dark prose-h1:font-bold
    prose-h2:text-gruvbox-aqua dark:prose-h2:text-gruvbox-aqua-dark prose-h2:border-b prose-h2:border-gruvbox-light-border dark:prose-h2:border-gruvbox-dark-border prose-h2:pb-2
    prose-h3:text-gruvbox-blue dark:prose-h3:text-gruvbox-blue-dark
    prose-h4:text-gruvbox-yellow dark:prose-h4:text-gruvbox-yellow-dark
    prose-strong:text-gruvbox-orange dark:prose-strong:text-gruvbox-orange-dark
    prose-em:text-gruvbox-green dark:prose-em:text-gruvbox-green-dark
    prose-a:text-gruvbox-blue dark:prose-a:text-gruvbox-blue-dark prose-a:font-semibold hover:prose-a:underline
    prose-blockquote:border-l-gruvbox-orange dark:prose-blockquote:border-l-gruvbox-orange-dark prose-blockquote:text-gruvbox-gray-light dark:prose-blockquote:text-gruvbox-gray-dark
    prose-code:text-gruvbox-red-light dark:prose-code:text-gruvbox-red-dark prose-code:bg-gruvbox-light-bg-hover dark:prose-code:bg-gruvbox-dark-bg-hover prose-code:p-1 prose-code:rounded-md prose-code:font-mono
    prose-li:text-gruvbox-dark-bg dark:prose-li:text-gruvbox-dark-fg
    prose-li:marker:text-gruvbox-aqua dark:prose-li:marker:text-gruvbox-aqua-dark
    prose-hr:border-gruvbox-light-border dark:prose-hr:border-gruvbox-dark-border
`;

// --- Flashcard View ---
const FlashcardView: React.FC<{ cards: Flashcard[] }> = ({ cards }) => {
    const [displayCards, setDisplayCards] = useState(cards);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [flippedStates, setFlippedStates] = useState<boolean[]>(() => Array(cards.length).fill(false));
    const [learnedStates, setLearnedStates] = useState<boolean[]>(() => Array(cards.length).fill(false));
    const [activeTag, setActiveTag] = useState<string | null>(null);

    const allTags = useMemo(() => {
        const tags = new Set<string>();
        cards.forEach(card => card.tags.forEach(tag => tags.add(tag)));
        return Array.from(tags);
    }, [cards]);

    useEffect(() => {
        let filtered = cards;
        if (activeTag) {
            filtered = cards.filter(card => card.tags.includes(activeTag));
        }
        setDisplayCards(filtered);
        setFlippedStates(Array(filtered.length).fill(false));
        setLearnedStates(Array(filtered.length).fill(false));
        setCurrentIndex(0);
    }, [cards, activeTag]);
    
    const handleFlipCurrent = () => {
        setFlippedStates(prev => prev.map((state, i) => (i === currentIndex ? !state : state)));
    };

    const handleMarkAsLearnedCurrent = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent card from flipping
        setLearnedStates(prev => prev.map((state, i) => (i === currentIndex ? !state : state)));
    };

    const shuffleCards = () => {
        const shuffled = [...displayCards].sort(() => Math.random() - 0.5);
        setDisplayCards(shuffled);
        setFlippedStates(Array(shuffled.length).fill(false));
        setLearnedStates(Array(shuffled.length).fill(false));
        setCurrentIndex(0);
    };

    const goToPrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        }
    };

    const goToNext = () => {
        if (currentIndex < displayCards.length - 1) {
            setCurrentIndex(prev => prev - 1);
        }
    };
    
    if (displayCards.length === 0) {
        return <p className="text-center text-gruvbox-gray-light dark:text-gruvbox-gray-dark">No flashcards to display.</p>
    }
    
    const currentCard = displayCards[currentIndex];

    return (
        <div>
            <div className="flex flex-wrap items-center gap-2 mb-6">
                <p className="text-sm font-semibold text-gruvbox-gray-light dark:text-gruvbox-gray-dark mr-2">Filter by topic:</p>
                <button onClick={() => setActiveTag(null)} className={`px-3 py-1 text-xs rounded-full border transition-colors ${!activeTag ? 'bg-gruvbox-aqua text-white border-gruvbox-aqua' : 'bg-transparent border-gruvbox-light-border dark:border-gruvbox-dark-border hover:bg-gruvbox-light-bg-hover dark:hover:bg-gruvbox-dark-bg-hover'}`}>
                    All
                </button>
                {allTags.map(tag => (
                    <button key={tag} onClick={() => setActiveTag(tag)} className={`px-3 py-1 text-xs rounded-full border transition-colors ${activeTag === tag ? 'bg-gruvbox-aqua text-white border-gruvbox-aqua' : 'bg-transparent border-gruvbox-light-border dark:border-gruvbox-dark-border hover:bg-gruvbox-light-bg-hover dark:hover:bg-gruvbox-dark-bg-hover'}`}>
                        {tag}
                    </button>
                ))}
                <button onClick={shuffleCards} className="px-3 py-1 bg-gruvbox-light-yellow-dim dark:bg-gruvbox-dark-yellow-dim text-gruvbox-light-fg dark:text-gruvbox-dark-fg font-semibold rounded-md hover:bg-gruvbox-light-yellow dark:hover:bg-gruvbox-dark-yellow text-xs ml-auto">
                    Shuffle
                </button>
            </div>
            <div className="flex flex-col items-center">
                <div style={{ perspective: '1000px' }} className="w-full max-w-lg">
                    <div key={currentCard.id} className={`relative w-full h-64 cursor-pointer transition-opacity duration-300 ${learnedStates[currentIndex] ? 'opacity-40' : 'opacity-100'}`} onClick={handleFlipCurrent}>
                        <div className="relative w-full h-full text-center transition-transform duration-500" style={{ transformStyle: 'preserve-3d', transform: flippedStates[currentIndex] ? 'rotateY(180deg)' : 'none' }}>
                            <div className="absolute w-full h-full p-6 border border-gruvbox-light-border dark:border-gruvbox-dark-border rounded-lg bg-gruvbox-light-bg dark:bg-gruvbox-dark-bg flex flex-col justify-center items-center" style={{ backfaceVisibility: 'hidden' }}>
                                <p className="text-sm text-gruvbox-gray-light dark:text-gruvbox-gray-dark mb-2 font-semibold">Question</p>
                                <div className={`flex-grow overflow-y-auto w-full prose-p:my-0 ${proseThemeClasses}`}>
                                    <MarkdownRenderer content={currentCard.q} glossary={[]} />
                                </div>
                            </div>
                            <div className="absolute w-full h-full p-6 border border-gruvbox-light-border dark:border-gruvbox-dark-border rounded-lg bg-gruvbox-light-bg-soft dark:bg-gruvbox-dark-bg-soft flex flex-col justify-center items-center" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                                 <p className="text-sm text-gruvbox-gray-light dark:text-gruvbox-gray-dark mb-2 font-semibold">Answer</p>
                                 <div className={`flex-grow overflow-y-auto w-full prose-p:my-0 ${proseThemeClasses}`}>
                                    <MarkdownRenderer content={currentCard.a} glossary={[]} />
                                 </div>
                            </div>
                        </div>
                        <button onClick={handleMarkAsLearnedCurrent} className="absolute top-2 right-2 px-2 py-1 text-xs bg-gruvbox-green text-white rounded-full z-20">
                           {learnedStates[currentIndex] ? 'Review' : 'Got It!'}
                        </button>
                    </div>
                </div>

                <p className="my-4 text-sm font-semibold text-gruvbox-gray-light dark:text-gruvbox-gray-dark">{currentIndex + 1} / {displayCards.length}</p>

                <div className="flex items-center space-x-4">
                    <button onClick={goToPrev} disabled={currentIndex === 0} className="px-6 py-2 bg-gruvbox-light-bg-soft dark:bg-gruvbox-dark-bg-soft text-gruvbox-light-fg dark:text-gruvbox-dark-fg font-semibold rounded-md border border-gruvbox-light-border dark:border-gruvbox-dark-border hover:bg-gruvbox-light-bg-hover dark:hover:bg-gruvbox-dark-bg-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                        Previous
                    </button>
                    <button onClick={goToNext} disabled={currentIndex >= displayCards.length - 1} className="px-6 py-2 bg-gruvbox-light-bg-soft dark:bg-gruvbox-dark-bg-soft text-gruvbox-light-fg dark:text-gruvbox-dark-fg font-semibold rounded-md border border-gruvbox-light-border dark:border-gruvbox-dark-border hover:bg-gruvbox-light-bg-hover dark:hover:bg-gruvbox-dark-bg-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
};


// --- Quiz View ---
const QuizView: React.FC<{ questions: QuizQuestion[] }> = ({ questions }) => {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState<(number | null)[]>(() => Array(questions.length).fill(null));
    const [isFinished, setIsFinished] = useState(false);

    const currentQuestion = questions[currentQuestionIndex];
    const selectedAnswer = userAnswers[currentQuestionIndex];

    const handleAnswerSelect = (optionIndex: number) => {
        if (selectedAnswer !== null) return;
        setUserAnswers(prev => prev.map((ans, i) => i === currentQuestionIndex ? optionIndex : ans));
    };

    const handleNext = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        } else {
            setIsFinished(true);
        }
    };
    
    const handleRestart = () => {
        setCurrentQuestionIndex(0);
        setUserAnswers(Array(questions.length).fill(null));
        setIsFinished(false);
    }
    
    const score = useMemo(() => {
        return userAnswers.filter((answer, index) => answer === questions[index].answer_index).length;
    }, [userAnswers, questions]);

    if (isFinished) {
        return (
            <div className="text-center p-8 bg-gruvbox-light-bg-soft dark:bg-gruvbox-dark-bg-soft rounded-lg border border-gruvbox-light-border dark:border-gruvbox-dark-border">
                <h3 className="text-2xl font-bold text-gruvbox-light-fg dark:text-gruvbox-dark-fg">Quiz Complete!</h3>
                <p className="mt-2 text-lg text-gruvbox-gray-light dark:text-gruvbox-gray-dark">You scored</p>
                <p className="text-5xl font-bold text-gruvbox-aqua my-4">{score} / {questions.length}</p>
                <button onClick={handleRestart} className="mt-4 px-6 py-2 bg-gruvbox-aqua text-white font-semibold rounded-md hover:bg-gruvbox-green">
                    Try Again
                </button>
            </div>
        );
    }

    return (
        <div>
            <div className="mb-4">
                <p className="text-sm font-semibold text-gruvbox-gray-light dark:text-gruvbox-gray-dark mb-1">Question {currentQuestionIndex + 1} of {questions.length}</p>
                <div className="w-full bg-gruvbox-light-border dark:bg-gruvbox-dark-border rounded-full h-2.5">
                    <div className="bg-gruvbox-aqua h-2.5 rounded-full" style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}></div>
                </div>
            </div>

            <div className="p-6 border rounded-lg bg-gruvbox-light-bg dark:bg-gruvbox-dark-bg border-gruvbox-light-border dark:border-gruvbox-dark-border mb-4">
                <div className={`font-semibold text-lg mb-4 text-gruvbox-light-fg dark:text-gruvbox-dark-fg prose-p:my-0 ${proseThemeClasses}`}>
                    <MarkdownRenderer content={currentQuestion.q} glossary={[]} />
                </div>
                <div className="space-y-3">
                    {currentQuestion.options.map((option, index) => {
                         const isSelected = selectedAnswer === index;
                         const isCorrect = currentQuestion.answer_index === index;
                         const isAnswered = selectedAnswer !== null;

                         let buttonClass = 'bg-gruvbox-light-bg dark:bg-gruvbox-dark-bg hover:bg-gruvbox-light-bg-soft dark:hover:bg-gruvbox-dark-bg-soft border-gruvbox-light-border dark:border-gruvbox-dark-border';
                         if (isAnswered && isCorrect) {
                             buttonClass = 'bg-gruvbox-light-green-dim dark:bg-gruvbox-dark-green-dim border-gruvbox-green text-gruvbox-light-fg dark:text-gruvbox-dark-fg';
                         } else if (isAnswered && isSelected && !isCorrect) {
                             buttonClass = 'bg-gruvbox-light-red-dim dark:bg-gruvbox-dark-red-dim border-gruvbox-red-light dark:border-gruvbox-red-dark text-gruvbox-light-fg dark:text-gruvbox-dark-fg';
                         }

                        return ( <button key={index} onClick={() => handleAnswerSelect(index)} disabled={isAnswered} className={`w-full text-left p-3 rounded-md border text-gruvbox-light-fg dark:text-gruvbox-dark-fg font-medium transition-colors ${buttonClass}`}>
                            <span className={`${proseThemeClasses} prose-p:my-0`}>
                                <MarkdownRenderer content={option} glossary={[]} />
                            </span>
                        </button> );
                    })}
                </div>
                {selectedAnswer !== null && (
                    <div className={`mt-4 p-3 rounded-md text-sm bg-gruvbox-light-bg-soft dark:bg-gruvbox-dark-bg-soft text-gruvbox-light-fg dark:text-gruvbox-dark-fg`}>
                        <div className="flex items-center font-bold mb-1">
                            {selectedAnswer === currentQuestion.answer_index ? 
                                <CheckCircleIcon className="w-5 h-5 mr-2 text-gruvbox-green" /> : 
                                <XCircleIcon className="w-5 h-5 mr-2 text-gruvbox-red-light dark:text-gruvbox-red-dark" />
                            }
                            {selectedAnswer === currentQuestion.answer_index ? 'Correct!' : 'Incorrect.'}
                        </div>
                        <p>
                          <span className="font-semibold">Explanation:</span>
                          <span className={`ml-1 prose-p:my-0 prose-p:inline ${proseThemeClasses}`}>
                            <MarkdownRenderer content={currentQuestion.explanation} glossary={[]} />
                          </span>
                        </p>
                    </div>
                )}
            </div>
            <div className="flex justify-end">
                <button onClick={handleNext} disabled={selectedAnswer === null} className="px-6 py-2 bg-gruvbox-aqua text-white font-semibold rounded-md hover:bg-gruvbox-green disabled:bg-gruvbox-gray-light dark:disabled:bg-gruvbox-gray-dark disabled:cursor-not-allowed">
                    {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
                </button>
            </div>
        </div>
    );
};


// --- Main Component ---
interface OutputDisplayProps {
  studyOutput: StudyOutput;
  chatHistory: ChatMessage[];
  isChatLoading: boolean;
  onSendMessage: (message: string) => void;
  chatReady: boolean;
  isVoiceChatActive: boolean;
  onStartVoiceChat: () => void;
  onStopVoiceChat: () => void;
  partialUserTranscript: string;
  partialModelTranscript: string;
}

const OutputDisplay: React.FC<OutputDisplayProps> = (props) => {
    const { studyOutput, chatHistory, isChatLoading, onSendMessage, chatReady } = props;
    
    const availableTabs = useMemo(() => [
        { id: 'summary', label: 'Summary', enabled: !!studyOutput.summary?.short },
        { id: 'flashcards', label: 'Flashcards', enabled: studyOutput.flashcards.length > 0 },
        { id: 'quiz', label: 'Quiz', enabled: studyOutput.quiz.length > 0 },
        { id: 'plan', label: 'Study Plan', enabled: studyOutput.study_plan?.schedule?.length > 0 },
    ].filter(tab => tab.enabled), [studyOutput]);
    
    const [activeTab, setActiveTab] = useState('');
    const [activeSummary, setActiveSummary] = useState<'tl_dr' | 'short' | 'medium' | 'long'>('medium');
    
    useEffect(() => {
        if (availableTabs.length > 0 && !availableTabs.find(t => t.id === activeTab)) {
            setActiveTab(availableTabs[0].id);
        }
    }, [availableTabs, activeTab]);

    if (availableTabs.length === 0) {
        return <p className="text-gruvbox-gray-light dark:text-gruvbox-gray-dark text-center py-10">No study materials were generated based on your preferences.</p>
    }

    return (
        <div className="h-full">
            <div className="border-b border-gruvbox-light-border dark:border-gruvbox-dark-border mb-6">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    {availableTabs.map(tab => (
                         <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            className={`${ activeTab === tab.id ? 'border-gruvbox-purple text-gruvbox-purple' : 'border-transparent text-gruvbox-gray-light dark:text-gruvbox-gray-dark hover:text-gruvbox-light-fg dark:hover:text-gruvbox-dark-fg hover:border-gruvbox-gray-light dark:hover:border-gruvbox-gray-dark' } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors`}
                         >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            <div>
                {activeTab === 'summary' && (
                    <div>
                        <div className="flex space-x-2 mb-4">
                            {(['tl_dr', 'short', 'medium', 'long'] as const).map(s => (
                                <button key={s} onClick={() => setActiveSummary(s)} className={`px-3 py-1 text-sm rounded-full border transition-colors ${activeSummary === s ? 'bg-gruvbox-light-yellow-dim dark:bg-gruvbox-dark-yellow-dim text-gruvbox-light-fg dark:text-gruvbox-dark-fg border-gruvbox-light-border-yellow dark:border-gruvbox-dark-border-yellow' : 'bg-transparent text-gruvbox-gray-light dark:text-gruvbox-gray-dark border-gruvbox-light-border dark:border-gruvbox-dark-border hover:bg-gruvbox-light-bg-hover dark:hover:bg-gruvbox-dark-bg-hover'}`}>
                                    {s === 'tl_dr' ? "TL;DR" : s.charAt(0).toUpperCase() + s.slice(1)}
                                </button>
                            ))}
                        </div>
                        <div className={proseThemeClasses}>
                           <MarkdownRenderer content={studyOutput.summary[activeSummary]} glossary={studyOutput.summary.glossary} />
                        </div>
                    </div>
                )}
                {activeTab === 'flashcards' && ( <FlashcardView cards={studyOutput.flashcards} /> )}
                {activeTab === 'quiz' && ( <QuizView questions={studyOutput.quiz} /> )}
                {activeTab === 'plan' && (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gruvbox-light-border dark:divide-gruvbox-dark-border">
                            <thead className="bg-gruvbox-light-bg-soft dark:bg-gruvbox-dark-bg-soft">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gruvbox-gray-light dark:text-gruvbox-gray-dark uppercase tracking-wider">Day</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gruvbox-gray-light dark:text-gruvbox-gray-dark uppercase tracking-wider">Task</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gruvbox-gray-light dark:text-gruvbox-gray-dark uppercase tracking-wider">Time (Mins)</th>
                                </tr>
                            </thead>
                            <tbody className="bg-gruvbox-light-bg dark:bg-gruvbox-dark-bg divide-y divide-gruvbox-light-border dark:divide-gruvbox-dark-border">
                                {studyOutput.study_plan.schedule.map(task => (
                                    <tr key={task.day + task.task}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gruvbox-light-fg dark:text-gruvbox-dark-fg">{task.day}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gruvbox-light-fg dark:text-gruvbox-dark-fg">{task.task}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gruvbox-light-fg dark:text-gruvbox-dark-fg">{task.time_mins}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {chatReady && (
                <ChatPanel
                    history={chatHistory}
                    isLoading={isChatLoading}
                    onSendMessage={onSendMessage}
                    isVoiceChatActive={props.isVoiceChatActive}
                    onStartVoiceChat={props.onStartVoiceChat}
                    onStopVoiceChat={props.onStopVoiceChat}
                    partialUserTranscript={props.partialUserTranscript}
                    partialModelTranscript={props.partialModelTranscript}
                />
            )}
        </div>
    );
};

export default OutputDisplay;