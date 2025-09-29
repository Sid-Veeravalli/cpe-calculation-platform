import React, { useMemo } from 'react';
import { Slide } from '../types';
import { useCpeCalculator } from '../hooks/useCpeCalculator';

interface StatsPanelProps {
    slides: Slide[];
    reviewQuestions: number;
    setReviewQuestions: (n: number) => void;
    finalExamQuestions: number;
    setFinalExamQuestions: (n: number) => void;
}

const StatsPanel: React.FC<StatsPanelProps> = ({ slides, reviewQuestions, setReviewQuestions, finalExamQuestions, setFinalExamQuestions }) => {
    
    const activeSlides = useMemo(() => slides.filter(s => !s.isDiscarded), [slides]);
    const finalizedSlides = useMemo(() => activeSlides.filter(s => s.isFinalized), [activeSlides]);
    
    const metrics = useCpeCalculator(finalizedSlides, reviewQuestions, finalExamQuestions);

    const StatItem = ({ label, value }: { label: string; value: string | number }) => (
        <div className="flex justify-between items-baseline py-2 border-b border-gray-200">
            <span className="text-sm text-gray-600">{label}</span>
            <span className="font-semibold text-gray-800">{value}</span>
        </div>
    );
    
    const QuestionInput = ({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void}) => (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <input
                type="number"
                min="0"
                value={value}
                onChange={e => onChange(parseInt(e.target.value, 10) || 0)}
                className="block w-full px-2 py-1 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
        </div>
    );

    return (
        <div className="p-4 bg-white rounded-lg shadow-sm h-full">
            <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Live CPE Stats</h2>
            
            <div className="space-y-3 p-3 mb-4 border rounded-md bg-gray-50">
                <h3 className="font-semibold text-md text-gray-700 mb-2">Course Questions</h3>
                <QuestionInput label="Review Questions" value={reviewQuestions} onChange={setReviewQuestions} />
                <QuestionInput label="Final Exam Questions" value={finalExamQuestions} onChange={setFinalExamQuestions} />
            </div>

            <div className="space-y-3">
                 <div className="p-2 bg-gray-50 rounded-md">
                     <StatItem label="Total Slides" value={slides.length} />
                     <StatItem label="Active Slides" value={activeSlides.length} />
                     <StatItem label="Discarded Slides" value={slides.length - activeSlides.length} />
                 </div>
                <StatItem label="Finalized Slides" value={`${finalizedSlides.length} / ${activeSlides.length}`} />
                <StatItem label="Total Words" value={metrics.totalWords.toLocaleString()} />
                <StatItem label="AV Minutes" value={metrics.totalAvMinutes.toFixed(2)} />
                <StatItem label="Total Questions" value={metrics.totalQuestions} />

                <div className="pt-4 mt-4 border-t-2 border-dashed">
                    <h3 className="font-semibold text-md text-gray-700 mb-2">CPE Breakdown (minutes)</h3>
                    <StatItem label="Words / 180" value={metrics.wordsCpe.toFixed(2)} />
                    <StatItem label="AV Duration" value={metrics.avCpe.toFixed(2)} />
                    <StatItem label="Questions × 1.85" value={metrics.questionsCpe.toFixed(2)} />
                </div>
                
                <div className="pt-4 mt-4 border-t-2">
                    <div className="flex justify-between items-center py-2">
                        <span className="text-sm font-medium text-gray-600">Raw CPE Hours</span>
                        <span className="font-bold text-lg text-blue-600">{metrics.rawCpeHours.toFixed(3)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 mt-2 bg-blue-50 rounded-lg">
                        <span className="text-md font-bold text-blue-800">Rounded CPE</span>
                        <span className="font-extrabold text-2xl text-blue-800">{metrics.roundedCpe.toFixed(1)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StatsPanel;