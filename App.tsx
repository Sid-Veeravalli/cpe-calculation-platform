
import React, { useState, useCallback } from 'react';
import { AppPhase, Slide } from './types';
import UploadScreen from './components/UploadScreen';
import ReviewScreen from './components/ReviewScreen';
import FinalizationScreen from './components/FinalizationScreen';

const App: React.FC = () => {
    const [appPhase, setAppPhase] = useState<AppPhase>(AppPhase.UPLOAD);
    const [slides, setSlides] = useState<Slide[]>([]);
    const [fileName, setFileName] = useState<string>('');
    const [reviewQuestions, setReviewQuestions] = useState<number>(0);
    const [finalExamQuestions, setFinalExamQuestions] = useState<number>(0);

    const handleFileUpload = useCallback((parsedSlides: Slide[], name: string) => {
        setSlides(parsedSlides);
        setFileName(name);
        setAppPhase(AppPhase.REVIEW);
    }, []);

    const handleReviewCompletion = useCallback((finalizedSlides: Slide[], revQs: number, finalQs: number) => {
        setSlides(finalizedSlides);
        setReviewQuestions(revQs);
        setFinalExamQuestions(finalQs);
        setAppPhase(AppPhase.FINALIZE);
    }, []);

    const handleStartOver = useCallback(() => {
        setSlides([]);
        setFileName('');
        setReviewQuestions(0);
        setFinalExamQuestions(0);
        setAppPhase(AppPhase.UPLOAD);
    }, []);

    const handleGoBackToReview = useCallback(() => {
        setAppPhase(AppPhase.REVIEW);
    }, []);

    const renderContent = () => {
        switch (appPhase) {
            case AppPhase.UPLOAD:
                return <UploadScreen onFileUpload={handleFileUpload} />;
            case AppPhase.REVIEW:
                return <ReviewScreen
                    initialSlides={slides}
                    onComplete={handleReviewCompletion}
                    fileName={fileName}
                    initialReviewQuestions={reviewQuestions}
                    initialFinalExamQuestions={finalExamQuestions}
                />;
            case AppPhase.FINALIZE:
                return <FinalizationScreen slides={slides} onStartOver={handleStartOver} onGoBackToReview={handleGoBackToReview} fileName={fileName} reviewQuestions={reviewQuestions} finalExamQuestions={finalExamQuestions} />;
            default:
                return <UploadScreen onFileUpload={handleFileUpload} />;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 text-gray-800 font-sans">
            {renderContent()}
        </div>
    );
};

export default App;
