import Papa from 'papaparse';
import { Slide, SourceType } from '../types';

// Helper to trigger file download
const downloadCsv = (csvString: string, fileName: string) => {
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

// Helper to format audio duration from minutes to m' ss"
const formatDurationForAudioExport = (minutes: number) => {
    if (isNaN(minutes) || minutes < 0) return `0' 00"`;
    const totalSeconds = minutes * 60;
    const m = Math.floor(totalSeconds / 60);
    const s = Math.round(totalSeconds % 60);
    return `${m}' ${String(s).padStart(2, '0')}"`;
};

// Helper to format trimmed duration from seconds to N min n sec
const formatTrimmedDuration = (seconds: number) => {
    if (isNaN(seconds) || seconds <= 0) return `0 min 0 sec`;
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m} min ${s} sec`;
};


// Export for Word Count
export const exportWordCountCsv = (slides: Slide[], fileName: string): void => {
    const wordCountSlides = slides.filter(s => 
        !s.isDiscarded && (s.selectedSource === SourceType.OST || s.selectedSource === SourceType.BOTH)
    );

    const getWordCount = (text: string): number => text.trim().split(/\s+/).filter(Boolean).length;

    const totalWordCount = wordCountSlides.reduce((sum, s) => sum + getWordCount(s.ost), 0);

    const headers = ['Slide no', 'Word Count', 'Final OST'];
    const rows = wordCountSlides.map(s => [
        s.id,
        getWordCount(s.ost),
        s.ost.replace(/(\r\n|\n|\r)/gm, " "), // Sanitize for CSV
    ]);
    
    const csvData = [
        ['Total word count:', totalWordCount],
        [], // Empty row
        headers,
        ...rows
    ];
    
    const csvString = Papa.unparse(csvData);
    downloadCsv(csvString, `WordCount_Export_${fileName.split('.')[0]}.csv`);
};

// Export for Audio Count
export const exportAudioCountCsv = (slides: Slide[], fileName: string): void => {
    const audioSlides = slides.filter(s => 
        !s.isDiscarded && (s.selectedSource === SourceType.AUDIO || s.selectedSource === SourceType.BOTH)
    );

    const totalAvMinutes = audioSlides.reduce((sum, s) => sum + s.audioDuration, 0);

    const headers = ['Slide no', 'Final Duration', 'Trimmed out duration'];
    const rows = audioSlides.map(s => {
        let trimmedOutDurationSec = 0;
        if (s.audioMeta && s.audioMeta.isTrimmed && s.audioMeta.originalDuration && s.audioMeta.trimmedDuration) {
            trimmedOutDurationSec = s.audioMeta.originalDuration - s.audioMeta.trimmedDuration;
        }

        return [
            s.id,
            formatDurationForAudioExport(s.audioDuration),
            formatTrimmedDuration(trimmedOutDurationSec),
        ];
    });
    
    const csvData = [
        ['Total AV minutes:', formatDurationForAudioExport(totalAvMinutes)],
        [],
        headers,
        ...rows
    ];
    
    const csvString = Papa.unparse(csvData);
    downloadCsv(csvString, `AudioCount_Export_${fileName.split('.')[0]}.csv`);
};