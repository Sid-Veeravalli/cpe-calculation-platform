import { useMemo } from 'react';
import { Slide, SourceType, CpeMetrics } from '../types';

export const useCpeCalculator = (slides: Slide[], reviewQuestions: number, finalExamQuestions: number): CpeMetrics => {
    return useMemo(() => {
        const getWordCount = (text: string): number => {
            return text.trim().split(/\s+/).filter(Boolean).length;
        };
        
        // Exclude discarded slides from all calculations
        const activeSlides = slides.filter(slide => !slide.isDiscarded);

        const totals = activeSlides.reduce(
            (acc, slide) => {
                switch (slide.selectedSource) {
                    case SourceType.OST:
                        acc.totalWords += getWordCount(slide.ost);
                        break;
                    case SourceType.AUDIO:
                        acc.totalAvMinutes += slide.audioDuration;
                        break;
                    case SourceType.BOTH:
                        acc.totalWords += getWordCount(slide.ost);
                        acc.totalAvMinutes += slide.audioDuration;
                        break;
                }
                return acc;
            },
            { totalWords: 0, totalAvMinutes: 0 }
        );

        const totalQuestions = (reviewQuestions || 0) + (finalExamQuestions || 0);

        const wordsCpe = totals.totalWords / 180;
        const avCpe = totals.totalAvMinutes;
        const questionsCpe = totalQuestions * 1.85;
        
        const totalCpeMinutes = wordsCpe + avCpe + questionsCpe;
        const rawCpeHours = totalCpeMinutes / 60;
        const roundedCpe = Math.floor(rawCpeHours * 2) / 2;

        return {
            ...totals,
            totalQuestions,
            wordsCpe,
            avCpe,
            questionsCpe,
            rawCpeHours,
            roundedCpe: roundedCpe > 0 ? roundedCpe : 0,
        };
    }, [slides, reviewQuestions, finalExamQuestions]);
};