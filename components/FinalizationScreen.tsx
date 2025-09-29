
import React from 'react';
import { Slide, SourceType } from '../types';
import { useCpeCalculator } from '../hooks/useCpeCalculator';
import { exportWordCountCsv, exportAudioCountCsv } from '../services/exportService';
import { RestartIcon, BackIcon } from './icons';

interface FinalizationScreenProps {
    slides: Slide[];
    onStartOver: () => void;
    onGoBackToReview: () => void;
    fileName: string;
    reviewQuestions: number;
    finalExamQuestions: number;
}

const FinalizationScreen: React.FC<FinalizationScreenProps> = ({ slides, onStartOver, onGoBackToReview, fileName, reviewQuestions, finalExamQuestions }) => {
    const activeSlides = slides.filter(s => !s.isDiscarded);
    const discardedSlides = slides.filter(s => s.isDiscarded);
    const metrics = useCpeCalculator(activeSlides, reviewQuestions, finalExamQuestions);
    
    return (
        <div className="max-w-7xl mx-auto p-8">
            <div className="bg-white p-8 rounded-xl shadow-lg">
                <header className="border-b pb-6 mb-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-4xl font-extrabold text-gray-900">CPE Calculation Complete</h1>
                            <p className="mt-2 text-gray-500">Summary for: {fileName}</p>
                             <div className="mt-4 text-sm text-gray-600 space-y-1">
                                <p>Total Slides: <span className="font-semibold">{slides.length}</span> (Active: {activeSlides.length}, Discarded: {discardedSlides.length})</p>
                                <p>Course Review Questions: <span className="font-semibold">{reviewQuestions}</span></p>
                                <p>Course Final Exam Questions: <span className="font-semibold">{finalExamQuestions}</span></p>
                            </div>
                        </div>
                        <div className="flex items-end gap-6 text-right">
                            <div>
                                <p className="text-sm text-gray-600">Raw CPE</p>
                                <p className="text-3xl font-bold text-gray-800">{metrics.rawCpeHours.toFixed(3)}</p>
                            </div>
                            <div>
                                <p className="text-lg text-gray-600">Total Rounded CPE</p>
                                <p className="text-6xl font-bold text-blue-600">{metrics.roundedCpe.toFixed(1)}</p>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="flex justify-end space-x-4 mb-6">
                    <button onClick={() => exportWordCountCsv(slides, fileName)} className="flex items-center gap-2 px-4 py-2 text-white bg-green-600 rounded-lg shadow-sm hover:bg-green-700 transition-colors">
                        Export Word Count (CSV)
                    </button>
                    <button onClick={() => exportAudioCountCsv(slides, fileName)} className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 transition-colors">
                        Export Audio Count (CSV)
                    </button>
                    <button onClick={onGoBackToReview} className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-200 rounded-lg shadow-sm hover:bg-gray-300 transition-colors">
                        <BackIcon /> Back
                    </button>
                    <button onClick={onStartOver} className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-200 rounded-lg shadow-sm hover:bg-gray-300 transition-colors">
                        <RestartIcon /> Start Over
                    </button>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Slide #</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Word Count</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">AV Mins</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Discard Reason</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {slides.map((slide) => (
                                <tr key={slide.id} className={`${slide.isDiscarded ? 'bg-gray-100 text-gray-400' : 'hover:bg-gray-50'}`}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{slide.id}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">
                                        {slide.isDiscarded 
                                            ? <span title={slide.discardReason}>Discarded</span>
                                            : <span className="text-green-600">Active</span>
                                        }
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">{slide.isDiscarded ? 'N/A' : slide.selectedSource}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        {slide.isDiscarded ? 0 :
                                         slide.selectedSource === SourceType.AUDIO ? 'N/A' :
                                         (slide.ost || '').trim().split(/\s+/).filter(Boolean).length}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        {(slide.isDiscarded || slide.selectedSource === SourceType.OST) 
                                            ? '0.00' 
                                            : slide.audioDuration.toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">{slide.isDiscarded ? slide.discardReason : ''}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default FinalizationScreen;
