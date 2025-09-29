import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Slide, SourceType, AudioMeta } from '../types';
import { AudioIcon, TrashIcon } from './icons';
import AudioUploadModal from './AudioUploadModal';

interface SlideEditorProps {
    slide: Slide;
    onUpdate: (slide: Slide) => void;
    onFinalizeAndNext: () => void;
    onDiscardAndNext: (slide: Slide) => void;
    isLastSlide: boolean;
}

const getWordCount = (text: string): number => {
    return text.trim().split(/\s+/).filter(Boolean).length;
};

const DISCARD_REASONS = [
    'Non-learning content (e.g., title/intro)',
    'Table of contents / Glossary / Appendix',
    'Duplicate content',
    'Media-only / Image-only slide',
    'Review Question',
    'Disclaimer Slide',
    'Other',
];

// --- Highlighting Logic ---
const escapeHtml = (unsafe: string): string =>
    unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

const getHighlightedHtml = (text: string, highlights: Set<string>): string => {
    if (!text || highlights.size === 0) return escapeHtml(text);

    // This regex splits the text into sentences and the non-sentence parts (whitespace, newlines) between them.
    const sentenceAndWhitespaceRegex = /([^.!?]+[.!?]+)|([\s\S]+?)/g;
    const parts = text.match(sentenceAndWhitespaceRegex) || [];

    return parts.map(part => {
        const trimmedPart = part.trim();
        // Check if the trimmed part is one of the sentences to highlight.
        if (highlights.has(trimmedPart)) {
            return `<mark>${escapeHtml(part)}</mark>`;
        }
        return escapeHtml(part);
    }).join('');
};


const SlideEditor: React.FC<SlideEditorProps> = ({ slide, onUpdate, onFinalizeAndNext, onDiscardAndNext, isLastSlide }) => {
    // Component state
    const [ost, setOst] = useState(slide.ost);
    const [transcript, setTranscript] = useState(slide.transcript);
    const [selectedSource, setSelectedSource] = useState(slide.selectedSource);
    const [isFinalized, setIsFinalized] = useState(slide.isFinalized);
    const [finalizeError, setFinalizeError] = useState<string | null>(null);
    const [isAudioModalOpen, setIsAudioModalOpen] = useState(false);
    const [isDiscardModalOpen, setIsDiscardModalOpen] = useState(false);
    const [discardReason, setDiscardReason] = useState('');
    const [discardNote, setDiscardNote] = useState('');
    const [audioMeta, setAudioMeta] = useState<AudioMeta>(slide.audioMeta);

    // Audio duration state management
    const initialMinutes = Math.floor(slide.audioDuration);
    const initialSeconds = Math.round((slide.audioDuration - initialMinutes) * 60);
    const [minutes, setMinutes] = useState(initialMinutes);
    const [seconds, setSeconds] = useState(initialSeconds);
    const [audioDuration, setAudioDuration] = useState(slide.audioDuration);
    
    // --- Refs for highlighting ---
    const ostHighlighterRef = useRef<HTMLDivElement>(null);
    const ostTextareaRef = useRef<HTMLTextAreaElement>(null);
    const transcriptHighlighterRef = useRef<HTMLDivElement>(null);
    const transcriptTextareaRef = useRef<HTMLTextAreaElement>(null);

    // --- Memoized sentence analysis for highlighting ---
    const sentenceRegex = /[^.!?]+[.!?]+/g;
    const ostSentences = useMemo(() => new Set((ost.match(sentenceRegex) || []).map(s => s.trim())), [ost]);
    const transcriptSentences = useMemo(() => new Set((transcript.match(sentenceRegex) || []).map(s => s.trim())), [transcript]);

    const matchingSentences = useMemo(() => {
        const intersection = new Set<string>();
        ostSentences.forEach(s => {
            if (transcriptSentences.has(s)) {
                intersection.add(s);
            }
        });
        return intersection;
    }, [ostSentences, transcriptSentences]);
    
    const ostHighlightedHtml = useMemo(() => getHighlightedHtml(ost, matchingSentences), [ost, matchingSentences]);
    const transcriptHighlightedHtml = useMemo(() => getHighlightedHtml(transcript, matchingSentences), [transcript, matchingSentences]);


    // Memoized word counts
    const ostWordCount = useMemo(() => getWordCount(ost), [ost]);
    const transcriptWordCount = useMemo(() => getWordCount(transcript), [transcript]);

    // Effect to calculate total audio duration from minutes and seconds
    useEffect(() => {
        const newTotalDuration = (minutes || 0) + (seconds || 0) / 60;
        setAudioDuration(newTotalDuration);
    }, [minutes, seconds]);

    const handleAcceptDuration = useCallback((durationInSeconds: number, meta: AudioMeta) => {
        const newMinutes = Math.floor(durationInSeconds / 60);
        const newSeconds = Math.round(durationInSeconds % 60);
        setMinutes(newMinutes);
        setSeconds(newSeconds);
        setAudioMeta(meta);
        setIsAudioModalOpen(false);
    }, []);

    // Handle finalization with validation
    const handleFinalize = useCallback((): boolean => {
        // Validation check before finalizing
        if (!isFinalized && (selectedSource === SourceType.AUDIO || selectedSource === SourceType.BOTH) && audioDuration === 0) {
            setFinalizeError('Please enter audio duration for the selected source before finalizing.');
            return false;
        }
        
        setFinalizeError(null); // Clear error on success or unlock
        const finalizedState = !isFinalized;
        setIsFinalized(finalizedState);
        onUpdate({ ...slide, ost, transcript, selectedSource, audioDuration, audioMeta, isFinalized: finalizedState });
        return true;
    }, [isFinalized, slide, onUpdate, ost, transcript, selectedSource, audioDuration, audioMeta]);
    
    // Handle "Finalize and Next" click
    const handleFinalizeAndNextClick = () => {
        if (isFinalized) {
            onFinalizeAndNext(); // Already finalized, just navigate
        } else {
            const success = handleFinalize(); // Try to finalize
            if (success) {
                onFinalizeAndNext(); // Navigate on success
            }
        }
    };
    
    const handleDiscardConfirm = () => {
        if (!discardReason) return;
        const discardedSlide: Slide = {
            ...slide,
            ost, transcript, selectedSource, audioDuration, audioMeta, // save current state
            isDiscarded: true,
            discardReason,
            discardNote: discardReason === 'Other' ? discardNote : '',
            discardedAt: new Date().toISOString(),
            discardedBy: 'user', // Placeholder
        };
        onDiscardAndNext(discardedSlide);
        setIsDiscardModalOpen(false);
    };

    const handleUndoDiscard = () => {
        onUpdate({
            ...slide,
            isDiscarded: false,
            undoAt: new Date().toISOString(),
            undoBy: 'user', // Placeholder
        });
    };
    
    const syncScroll = (source: HTMLTextAreaElement, target: HTMLDivElement | null) => {
        if (target) {
            target.scrollTop = source.scrollTop;
            target.scrollLeft = source.scrollLeft;
        }
    };


    // Keyboard shortcut for finalization
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                handleFinalize();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleFinalize]);
    
    // Effect to auto-update parent component on any change if the slide is already finalized
    useEffect(() => {
        if(isFinalized) {
            const timer = setTimeout(() => {
                 onUpdate({ ...slide, ost, transcript, selectedSource, audioDuration, audioMeta, isFinalized: true });
            }, 500); // Debounce updates
            return () => clearTimeout(timer);
        }
    }, [ost, transcript, selectedSource, audioDuration, audioMeta, isFinalized, onUpdate, slide]);


    if (slide.isDiscarded) {
        return (
            <div className="p-8 bg-gray-100 border-l-4 border-gray-400 rounded-lg text-center">
                <TrashIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h2 className="text-2xl font-bold text-gray-700">Slide Discarded</h2>
                <p className="text-gray-600 mt-2">Reason: <span className="font-semibold">{slide.discardReason}</span></p>
                {slide.discardNote && <p className="text-gray-500 text-sm mt-1">Note: {slide.discardNote}</p>}
                <div className="mt-6 flex justify-center gap-4">
                     <button onClick={handleUndoDiscard} className="px-6 py-2 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors">
                        Undo Discard
                     </button>
                     <button onClick={onFinalizeAndNext} className="px-6 py-2 rounded-lg font-semibold text-gray-700 bg-gray-200 hover:bg-gray-300 transition-colors">
                        Next Slide
                    </button>
                </div>
            </div>
        )
    }

    const editorStyles = "relative z-10 w-full h-full p-3 bg-transparent border-none rounded-md focus:ring-0 focus:outline-none caret-current resize-none";
    const highlighterStyles = "absolute inset-0 z-0 p-3 overflow-auto pointer-events-none whitespace-pre-wrap break-words";
    
    return (
        <>
        <style>{`mark { background-color: #fef08a; }`}</style>
        <AudioUploadModal 
            isOpen={isAudioModalOpen}
            onClose={() => setIsAudioModalOpen(false)}
            onAcceptDuration={handleAcceptDuration}
        />
        {isDiscardModalOpen && (
             <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                    <h2 className="text-xl font-bold mb-4">Discard Slide?</h2>
                    <p className="text-gray-600 mb-4 text-sm">Discarding a slide will exclude it from CPE calculation and export. This action can be undone.</p>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="discardReason" className="block text-sm font-medium text-gray-700">Reason (Required)</label>
                            <select id="discardReason" value={discardReason} onChange={e => setDiscardReason(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
                                <option value="" disabled>Select a reason</option>
                                {DISCARD_REASONS.map(reason => <option key={reason} value={reason}>{reason}</option>)}
                            </select>
                        </div>
                         {discardReason === 'Other' && (
                             <div>
                                 <label htmlFor="discardNote" className="block text-sm font-medium text-gray-700">Note (Optional)</label>
                                 <input type="text" id="discardNote" value={discardNote} onChange={e => setDiscardNote(e.target.value)} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md" />
                             </div>
                         )}
                    </div>
                    <div className="mt-6 flex justify-end gap-3">
                        <button onClick={() => setIsDiscardModalOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
                        <button onClick={handleDiscardConfirm} disabled={!discardReason} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-red-300">Discard Slide</button>
                    </div>
                </div>
             </div>
        )}
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 border-b pb-2">Editing Slide {slide.id}</h2>
            
            <div className="grid grid-cols-2 gap-6">
                {/* OST Panel */}
                <div>
                    <div className="flex justify-between items-baseline mb-1">
                        <label className="text-sm font-semibold text-gray-700">On-Screen Text (OST)</label>
                        <span className="text-xs text-gray-500">Word Count: {ostWordCount}</span>
                    </div>
                    {isFinalized ? (
                         <textarea
                            value={ost}
                            disabled
                            className="w-full h-96 p-3 border border-gray-300 rounded-md shadow-sm bg-gray-100"
                        />
                    ) : (
                        <div className="relative w-full h-96 border border-gray-300 rounded-md shadow-sm focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500">
                             <div
                                ref={ostHighlighterRef}
                                className={highlighterStyles}
                                dangerouslySetInnerHTML={{ __html: ostHighlightedHtml }}
                            />
                            <textarea
                                ref={ostTextareaRef}
                                value={ost}
                                onChange={e => setOst(e.target.value)}
                                onScroll={e => syncScroll(e.currentTarget, ostHighlighterRef.current)}
                                spellCheck="false"
                                className={editorStyles}
                            />
                        </div>
                    )}
                </div>
                {/* Audio Panel */}
                <div className="flex flex-col">
                    <div className="flex justify-between items-baseline mb-1">
                        <label className="text-sm font-semibold text-gray-700">Audio (Transcript)</label>
                        { selectedSource !== SourceType.AUDIO && (
                            <span className="text-xs text-gray-500">Word Count: {transcriptWordCount}</span>
                        )}
                    </div>

                     {(selectedSource === SourceType.AUDIO || selectedSource === SourceType.BOTH) && (
                        <div className="mb-2 flex items-end gap-4 p-3 border rounded-md bg-gray-50">
                            <div className="flex-grow">
                                <label className="block text-sm font-medium text-gray-700">Audio Duration</label>
                                <div className="mt-1 flex items-center gap-2">
                                    <input
                                        type="number"
                                        min="0"
                                        value={minutes}
                                        onChange={e => {
                                            setMinutes(parseInt(e.target.value) || 0)
                                            setAudioMeta({ source: 'manual' })
                                        }}
                                        disabled={isFinalized}
                                        className="block w-20 px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100"
                                        aria-label="Minutes"
                                    />
                                    <span className="text-gray-600">min</span>
                                    <input
                                        type="number"
                                        min="0"
                                        max="59"
                                        value={seconds}
                                        onChange={e => {
                                            setSeconds(parseInt(e.target.value) || 0)
                                            setAudioMeta({ source: 'manual' })
                                        }}
                                        disabled={isFinalized}
                                        className="block w-20 px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100"
                                        aria-label="Seconds"
                                    />
                                    <span className="text-gray-600">sec</span>
                                </div>
                            </div>
                            <div className="flex-shrink-0 relative">
                                <button
                                    type="button"
                                    onClick={() => setIsAudioModalOpen(true)}
                                    className="flex items-center gap-2 py-2 px-3 text-sm font-medium text-blue-600 rounded-md hover:bg-blue-100 transition-colors"
                                    aria-label="Upload audio file"
                                >
                                    <AudioIcon className="w-5 h-5 text-blue-600" />
                                    <span>Upload Audio</span>
                                </button>
                            </div>
                        </div>
                    )}
                    {isFinalized ? (
                        <textarea
                            value={transcript}
                            disabled
                            className="w-full p-3 border border-gray-300 rounded-md shadow-sm bg-gray-100 flex-grow"
                        />
                    ) : (
                        <div className="relative w-full border border-gray-300 rounded-md shadow-sm flex-grow focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500">
                             <div
                                ref={transcriptHighlighterRef}
                                className={highlighterStyles}
                                dangerouslySetInnerHTML={{ __html: transcriptHighlightedHtml }}
                            />
                            <textarea
                                ref={transcriptTextareaRef}
                                value={transcript}
                                onChange={e => setTranscript(e.target.value)}
                                onScroll={e => syncScroll(e.currentTarget, transcriptHighlighterRef.current)}
                                spellCheck="false"
                                className={editorStyles}
                            />
                        </div>
                    )}
                </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-lg mb-4">CPE Calculation Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Source for CPE Calculation</label>
                        <div className="flex space-x-4">
                            {(Object.keys(SourceType) as Array<keyof typeof SourceType>).map(key => (
                                <label key={key} className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name={`source-${slide.id}`}
                                        value={SourceType[key]}
                                        checked={selectedSource === SourceType[key]}
                                        onChange={() => setSelectedSource(SourceType[key])}
                                        disabled={isFinalized}
                                        className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500 disabled:opacity-50"
                                    />
                                    <span>{SourceType[key]}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            
            {finalizeError && (
                 <div className="p-3 text-sm text-red-700 bg-red-100 rounded-lg" role="alert">
                    <span className="font-medium">Warning:</span> {finalizeError}
                </div>
            )}

            <div className="flex justify-between items-center gap-4 pt-4 border-t">
                 <button 
                    onClick={() => setIsDiscardModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100 border border-red-200 transition-colors"
                    >
                    <TrashIcon className="w-4 h-4" />
                    Discard Slide
                </button>
                <div className="flex items-center gap-4 ml-auto">
                     <p className="text-xs text-gray-500">Pro tip: Use Ctrl+Enter to finalize.</p>
                    <button
                        onClick={handleFinalize}
                        className={`px-6 py-2 rounded-lg font-semibold text-white transition-colors ${
                            isFinalized ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-gray-600 hover:bg-gray-700'
                        }`}
                    >
                        {isFinalized ? 'Unlock to Edit' : 'Finalize Selection'}
                    </button>
                    {isLastSlide ? (
                        <button
                            onClick={handleFinalize}
                            disabled={isFinalized}
                            className="px-6 py-2 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                        >
                            Finalize
                        </button>
                    ) : (
                         <button
                            onClick={handleFinalizeAndNextClick}
                            className="px-6 py-2 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                        >
                            {isFinalized ? 'Next Slide' : 'Finalize & Next'}
                        </button>
                    )}
                </div>
            </div>
        </div>
        </>
    );
};

export default SlideEditor;