
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Slide } from '../types';
import SlideList from './SlideList';
import SlideEditor from './SlideEditor';
import StatsPanel from './StatsPanel';
import { CheckCircleIcon, ChevronLeftIcon, ChevronRightIcon } from './icons';

interface ReviewScreenProps {
    initialSlides: Slide[];
    onComplete: (slides: Slide[], reviewQuestions: number, finalExamQuestions: number) => void;
    fileName: string;
    initialReviewQuestions: number;
    initialFinalExamQuestions: number;
}

const ReviewScreen: React.FC<ReviewScreenProps> = ({ initialSlides, onComplete, fileName, initialReviewQuestions, initialFinalExamQuestions }) => {
    const [slides, setSlides] = useState<Slide[]>(initialSlides);
    const [activeSlideId, setActiveSlideId] = useState<number | null>(initialSlides.length > 0 ? initialSlides[0].id : null);
    const [reviewQuestions, setReviewQuestions] = useState(initialReviewQuestions);
    const [finalExamQuestions, setFinalExamQuestions] = useState(initialFinalExamQuestions);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const showToast = (message: string) => {
        setToastMessage(message);
        setTimeout(() => {
            setToastMessage(null);
        }, 3000);
    };

    const handleSlideUpdate = useCallback((updatedSlide: Slide) => {
        const oldSlide = slides.find(s => s.id === updatedSlide.id);
        if (oldSlide) {
             if (!oldSlide.isFinalized && updatedSlide.isFinalized) {
                showToast(`Slide ${updatedSlide.id} finalized`);
            }
             if (!oldSlide.isDiscarded && updatedSlide.isDiscarded) {
                showToast(`Slide ${updatedSlide.id} discarded`);
            }
        }

        setSlides(currentSlides =>
            currentSlides.map(slide => (slide.id === updatedSlide.id ? updatedSlide : slide))
        );
    }, [slides]);

    const activeSlideIndex = useMemo(() => slides.findIndex(s => s.id === activeSlideId), [slides, activeSlideId]);
    const isLastSlide = activeSlideIndex === slides.length - 1;
    
    const activeSlidesForNav = useMemo(() => slides.filter(s => !s.isDiscarded), [slides]);
    const activeNavIndex = useMemo(() => activeSlidesForNav.findIndex(s => s.id === activeSlideId), [activeSlidesForNav, activeSlideId]);


    const handleNextSlide = useCallback(() => {
        const currentNavIndex = slides.findIndex(s => s.id === activeSlideId);
        if (currentNavIndex < slides.length - 1) {
            setActiveSlideId(slides[currentNavIndex + 1].id);
        }
    }, [activeSlideId, slides]);

    const handlePreviousSlide = useCallback(() => {
        const currentNavIndex = slides.findIndex(s => s.id === activeSlideId);
        if (currentNavIndex > 0) {
            setActiveSlideId(slides[currentNavIndex - 1].id);
        }
    }, [activeSlideId, slides]);
    
    const handleDiscardAndNext = useCallback((updatedSlide: Slide) => {
        handleSlideUpdate(updatedSlide);
        const currentIndex = slides.findIndex(s => s.id === updatedSlide.id);
        if (currentIndex < slides.length - 1) {
            setActiveSlideId(slides[currentIndex + 1].id);
        } else if (currentIndex > 0) {
            setActiveSlideId(slides[currentIndex - 1].id);
        } else {
            setActiveSlideId(null);
        }
    }, [slides, handleSlideUpdate]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return; // Ignore shortcuts if typing in an input
            }
            if (e.key === 'ArrowRight') {
                handleNextSlide();
            } else if (e.key === 'ArrowLeft') {
                handlePreviousSlide();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleNextSlide, handlePreviousSlide]);


    const activeSlide = useMemo(() => slides.find(s => s.id === activeSlideId), [slides, activeSlideId]);
    const allSlidesFinalized = useMemo(() => slides.filter(s => !s.isDiscarded).every(s => s.isFinalized), [slides]);

    return (
        <div className="flex flex-col h-screen bg-white">
            <header className="flex items-center justify-between p-4 border-b border-gray-200 shadow-sm bg-gray-50 flex-shrink-0">
                <div>
                    <h1 className="text-xl font-bold text-gray-800">Review Storyboard</h1>
                    <p className="text-sm text-gray-500 truncate max-w-md">{fileName}</p>
                </div>
                <button
                    onClick={() => onComplete(slides, reviewQuestions, finalExamQuestions)}
                    disabled={!allSlidesFinalized}
                    className="flex items-center gap-2 px-4 py-2 text-white bg-green-600 rounded-lg shadow-sm hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                    <CheckCircleIcon />
                    Complete Review
                </button>
            </header>
            <div className="flex flex-grow overflow-hidden">
                <aside className="w-1/5 border-r border-gray-200 overflow-y-auto bg-gray-50">
                    <SlideList slides={slides} activeSlideId={activeSlideId} onSelectSlide={setActiveSlideId} />
                </aside>
                <main className="w-3/5 overflow-y-auto p-6 relative">
                    <div className="flex justify-between items-center mb-4 sticky top-0 bg-white py-2 z-10">
                         <button onClick={handlePreviousSlide} disabled={activeSlideIndex === 0} className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 bg-white rounded-md border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">
                            <ChevronLeftIcon /> Previous
                         </button>
                         <span className="text-sm font-medium text-gray-500">{activeSlideIndex + 1} of {slides.length}</span>
                         <button onClick={handleNextSlide} disabled={activeSlideIndex === slides.length - 1} className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 bg-white rounded-md border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">
                            Next <ChevronRightIcon />
                         </button>
                    </div>

                    {activeSlide ? (
                        <SlideEditor 
                            key={activeSlide.id} 
                            slide={activeSlide} 
                            onUpdate={handleSlideUpdate}
                            onFinalizeAndNext={handleNextSlide}
                            onDiscardAndNext={handleDiscardAndNext}
                            isLastSlide={isLastSlide}
                         />
                    ) : (
                        <div className="flex items-center justify-center h-full">
                            <p className="text-gray-500">All slides have been discarded. Review complete.</p>
                        </div>
                    )}
                </main>
                <aside className="w-1/5 border-l border-gray-200 overflow-y-auto p-4 bg-gray-50">
                    <StatsPanel 
                        slides={slides} 
                        reviewQuestions={reviewQuestions}
                        setReviewQuestions={setReviewQuestions}
                        finalExamQuestions={finalExamQuestions}
                        setFinalExamQuestions={setFinalExamQuestions}
                    />
                </aside>
            </div>
             {toastMessage && (
                <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-5 py-3 rounded-lg shadow-lg z-50 transition-opacity duration-300" role="alert">
                    {toastMessage}
                </div>
            )}
        </div>
    );
};

export default ReviewScreen;
