

import React, { useMemo, useEffect, useRef, useState } from 'react';
import { LightbulbIcon, BeakerIcon, AlertTriangleIcon, XCircleIcon, BrainIcon, ClipboardCopyIcon, CheckCircleIcon } from './icons';
import { GlossaryTerm } from '../types';

declare global {
    interface Window {
        katex: any;
        Prism: any;
        renderMathInElement: (element: HTMLElement, options?: any) => void;
    }
}

interface MarkdownRendererProps {
  content: string;
  glossary: GlossaryTerm[];
}

// --- Callout Block Components ---

const ProTip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="my-4 p-4 rounded-lg bg-gruvbox-light-yellow-dim dark:bg-gruvbox-dark-yellow-dim border-l-4 border-gruvbox-yellow dark:border-gruvbox-yellow-dark">
        <div className="flex items-start">
            <LightbulbIcon className="w-6 h-6 mr-3 mt-1 flex-shrink-0 text-gruvbox-yellow dark:text-gruvbox-yellow-dark" />
            <div className="flex-grow prose-p:my-0 prose-headings:my-2">{children}</div>
        </div>
    </div>
);

const ExampleBlock: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="my-4 p-4 rounded-lg bg-gruvbox-light-bg-soft dark:bg-gruvbox-dark-bg-soft border-l-4 border-gruvbox-blue dark:border-gruvbox-blue-dark">
        <div className="flex items-start">
            <BeakerIcon className="w-6 h-6 mr-3 mt-1 flex-shrink-0 text-gruvbox-blue dark:border-gruvbox-blue-dark" />
            <div className="flex-grow prose-p:my-0 prose-headings:my-2">{children}</div>
        </div>
    </div>
);

const WarningBlock: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="my-4 p-4 rounded-lg bg-gruvbox-light-red-dim dark:bg-gruvbox-dark-red-dim border-l-4 border-gruvbox-red-light dark:border-gruvbox-red-dark">
        <div className="flex items-start">
            <AlertTriangleIcon className="w-6 h-6 mr-3 mt-1 flex-shrink-0 text-gruvbox-red-light dark:border-gruvbox-red-dark" />
            <div className="flex-grow prose-p:my-0 prose-headings:my-2">{children}</div>
        </div>
    </div>
);

const KeyConceptBlock: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="my-4 p-4 rounded-lg bg-gruvbox-light-green-dim dark:bg-gruvbox-dark-green-dim border-l-4 border-gruvbox-green dark:border-gruvbox-green-dark">
        <div className="flex items-start">
            <BrainIcon className="w-6 h-6 mr-3 mt-1 flex-shrink-0 text-gruvbox-green dark:border-gruvbox-green-dark" />
            <div className="flex-grow prose-p:my-0 prose-headings:my-2">{children}</div>
        </div>
    </div>
);


// --- Interactive Components ---

const GlossaryTermInline: React.FC<{ term: string; definition: string | undefined }> = ({ term, definition }) => {
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const ref = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setIsPopoverOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [ref]);

    if (!definition) {
        return <strong>{term}</strong>;
    }

    return (
        <strong className="relative inline-block group">
            <button
                ref={ref}
                onClick={(e) => { e.stopPropagation(); setIsPopoverOpen(!isPopoverOpen); }}
                className="cursor-pointer border-b-2 border-dotted border-gruvbox-purple dark:border-gruvbox-purple-dark hover:bg-gruvbox-purple/10 dark:hover:bg-gruvbox-purple-dark/10"
                aria-haspopup="true"
                aria-expanded={isPopoverOpen}
            >
                {term}
            </button>
            
            {/* Hover Tooltip - shown when popover is closed */}
            {!isPopoverOpen && (
                 <div className="absolute z-20 bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs p-2 rounded-md shadow-lg 
                    bg-gruvbox-light-bg-soft dark:bg-gruvbox-dark-bg-hover border border-gruvbox-light-border dark:border-gruvbox-dark-border 
                    text-gruvbox-light-fg dark:text-gruvbox-dark-fg text-xs 
                    opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                    role="tooltip"
                >
                    {definition}
                    {/* Arrow for tooltip */}
                    <div className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-0 h-0 border-x-8 border-x-transparent border-t-8 border-t-gruvbox-light-border dark:border-t-gruvbox-dark-border" />
                    <div className="absolute left-1/2 -translate-x-1/2 -bottom-[7px] w-0 h-0 border-x-8 border-x-transparent border-t-8 border-t-gruvbox-light-bg-soft dark:border-t-gruvbox-dark-bg-hover" />
                </div>
            )}

            {/* Click Popover */}
            {isPopoverOpen && (
                <div
                    className="absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-3 rounded-lg shadow-lg bg-gruvbox-light-bg-soft dark:bg-gruvbox-dark-bg-hover border border-gruvbox-light-border dark:border-gruvbox-dark-border text-left"
                    role="dialog"
                    aria-label="Definition"
                >
                    <p className="text-sm text-gruvbox-light-fg dark:text-gruvbox-dark-fg">{definition}</p>
                    <button onClick={() => setIsPopoverOpen(false)} className="absolute top-1 right-1 text-gruvbox-gray-light dark:text-gruvbox-gray-dark hover:text-gruvbox-light-fg dark:hover:text-gruvbox-dark-fg">
                        <XCircleIcon className="w-5 h-5" />
                    </button>
                    {/* Arrow pointing down to the term */}
                    <div className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-0 h-0 border-x-8 border-x-transparent border-t-8 border-t-gruvbox-light-border dark:border-t-gruvbox-dark-border" />
                    <div className="absolute left-1/2 -translate-x-1/2 -bottom-[7px] w-0 h-0 border-x-8 border-x-transparent border-t-8 border-t-gruvbox-light-bg-soft dark:border-t-gruvbox-dark-bg-hover" />
                </div>
            )}
        </strong>
    );
};

const CodeBlock: React.FC<{ language: string; code: string }> = ({ language, code }) => {
    const [isCopied, setIsCopied] = useState(false);
    const codeRef = useRef<HTMLElement>(null);

    const handleCopy = () => {
        if(codeRef.current) {
            navigator.clipboard.writeText(codeRef.current.innerText);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        }
    }

    useEffect(() => {
        if (window.Prism && codeRef.current) {
            window.Prism.highlightElement(codeRef.current);
        }
    }, [code, language]);

    return (
        <div className="relative my-4 group">
            {/* The pre element's style is now fully controlled by the Prism theme CSS, ensuring a perfect match. */}
            <pre className="!m-0 !rounded-lg !p-4">
                <code ref={codeRef} className={`language-${language}`}>{code}</code>
            </pre>
            
            {/* The language name and copy button are overlaid, appearing on hover. */}
            <div className="absolute top-2 right-2 flex items-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <span className="text-xs font-semibold text-gruvbox-gray-light dark:text-gray-400 select-none mr-4">{language}</span>
                <button 
                    onClick={handleCopy} 
                    className="flex items-center text-xs p-1 rounded-md bg-gruvbox-light-bg-hover/50 hover:bg-gruvbox-light-bg-hover text-gruvbox-gray-light hover:text-gruvbox-light-fg dark:bg-gruvbox-dark-bg-hover/50 dark:hover:bg-gruvbox-dark-bg-hover dark:text-gray-300 dark:hover:text-white transition-colors"
                    aria-label="Copy code"
                >
                    {isCopied ? <CheckCircleIcon className="w-4 h-4 mr-1 text-gruvbox-green dark:text-gruvbox-green-dark" /> : <ClipboardCopyIcon className="w-4 h-4 mr-1" />}
                    {isCopied ? 'Copied!' : 'Copy'}
                </button>
            </div>
        </div>
    )
}

// --- Main Renderer ---

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, glossary }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const glossaryMap = useMemo(() => new Map(glossary.map(item => [item.term.toLowerCase(), item.definition])), [glossary]);

  const renderInlineMarkdown = (text: string): (React.ReactNode | string)[] => {
     const regex = /(\*\*\*.*?\*\*\*|\*\*.*?\*\*|\*.*?\*|`.*?`|\$.*?\$)/g;
     const parts = text.split(regex).filter(part => part);
     
     return parts.map((part, i) => {
        if (part.startsWith('***') && part.endsWith('***')) {
            return <strong key={i}><em>{part.substring(3, part.length - 3)}</em></strong>;
        }
        if (part.startsWith('**') && part.endsWith('**')) {
            const term = part.substring(2, part.length - 2);
            const definition = glossaryMap.get(term.toLowerCase());
            return definition 
                ? <GlossaryTermInline key={i} term={term} definition={definition} />
                : <strong key={i}>{term}</strong>;
        }
        if (part.startsWith('*') && part.endsWith('*')) {
            return <em key={i}>{part.substring(1, part.length - 1)}</em>;
        }
        if (part.startsWith('`') && part.endsWith('`')) {
            return <code key={i}>{part.substring(1, part.length - 1)}</code>;
        }
        if (part.startsWith('$') && part.endsWith('$')) {
            return part; // Return raw LaTeX string for auto-renderer
        }
        return part;
     });
  }
  
  const parsedComponents = useMemo(() => {
    if (!content) return [];

    const lines = content.split('\n');
    const components: React.ReactNode[] = [];
    let currentBlock: string[] = [];
    let blockType: 'p' | 'ul' | 'blockquote' | 'code' | 'math' | null = null;
    let codeLang = 'plaintext';

    const flushBlock = () => {
        if (currentBlock.length === 0) return;

        const key = `block-${components.length}`;
        const joinedBlock = currentBlock.join('\n');

        if (blockType === 'p') {
            components.push(<p key={key}>{renderInlineMarkdown(joinedBlock)}</p>);
        } else if (blockType === 'ul') {
            components.push(<ul key={key}>{currentBlock.map((item, i) => <li key={i}>{renderInlineMarkdown(item)}</li>)}</ul>);
        } else if (blockType === 'blockquote') {
            const content = joinedBlock.replace(/^\s*>\s?/, '');
            const renderedContent = renderInlineMarkdown(content.replace(/^(Key Concept|Pro-Tip|Example|Warning):\s?/, ''));

            if (content.startsWith('Key Concept:')) components.push(<KeyConceptBlock key={key}>{renderedContent}</KeyConceptBlock>);
            else if (content.startsWith('Pro-Tip:')) components.push(<ProTip key={key}>{renderedContent}</ProTip>);
            else if (content.startsWith('Example:')) components.push(<ExampleBlock key={key}>{renderedContent}</ExampleBlock>);
            else if (content.startsWith('Warning:')) components.push(<WarningBlock key={key}>{renderedContent}</WarningBlock>);
            else components.push(<blockquote key={key}>{renderInlineMarkdown(content)}</blockquote>);
        } else if (blockType === 'code') {
            components.push(<CodeBlock key={key} language={codeLang} code={joinedBlock} />);
        } else if (blockType === 'math') {
            // Output raw LaTeX with delimiters for auto-renderer
            components.push(<div key={key}>{'$$' + joinedBlock + '$$'}</div>);
        }
        
        currentBlock = [];
        blockType = null;
    };

    for (const line of lines) {
        if (blockType === 'code') {
            if (line.trim() === '```') { flushBlock(); continue; }
            currentBlock.push(line);
            continue;
        }
         if (blockType === 'math') {
            if (line.trim() === '$$') { flushBlock(); continue; }
            currentBlock.push(line);
            continue;
        }

        if (line.trim() === '') { flushBlock(); continue; }

        if (line.startsWith('# ')) { flushBlock(); components.push(<h1 key={`block-${components.length}`}>{renderInlineMarkdown(line.substring(2))}</h1>); continue; }
        if (line.startsWith('## ')) { flushBlock(); components.push(<h2 key={`block-${components.length}`}>{renderInlineMarkdown(line.substring(3))}</h2>); continue; }
        if (line.startsWith('### ')) {
            flushBlock();
            const text = line.substring(4);
            components.push(<h3 key={`block-${components.length}`}>{renderInlineMarkdown(text)}</h3>);
            continue;
        }
        if (line.startsWith('---')) { flushBlock(); components.push(<hr key={`block-${components.length}`} />); continue; }

        const codeMatch = line.match(/^```(\w*)/);
        if (codeMatch) {
            flushBlock();
            blockType = 'code';
            codeLang = codeMatch[1] || 'plaintext';
            continue;
        }
         if (line.trim() === '$$') { flushBlock(); blockType = 'math'; continue; }
        
        if (line.startsWith('>')) {
            const isNewBlock = blockType !== 'blockquote';
            if (isNewBlock) flushBlock();
            blockType = 'blockquote';
            currentBlock.push(line.replace(/^>\s?/, ''));
            continue;
        }
        if (line.match(/^(\s*)- /)) {
            const isNewList = blockType !== 'ul';
            if (isNewList) flushBlock();
            blockType = 'ul';
            currentBlock.push(line.replace(/^(\s*)- /, ''));
            continue;
        }
        
        if (blockType !== 'p') flushBlock();
        blockType = 'p';
        currentBlock.push(line);
    }
    
    flushBlock();
    return components;

  }, [content, glossaryMap]);

  // Effect for KaTeX auto-rendering
  useEffect(() => {
    const container = rootRef.current;
    if (!container || !window.renderMathInElement) return;

    const render = () => {
      try {
        window.renderMathInElement(container, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false },
          ],
          throwOnError: false,
        });
      } catch (e) {
        console.error("KaTeX auto-render error:", e);
      }
    };
    // Use a timeout to allow React to render the raw text first
    const timer = setTimeout(render, 100);
    return () => clearTimeout(timer);
  }, [parsedComponents]);

  return <div ref={rootRef}>{parsedComponents}</div>;
};

export default MarkdownRenderer;