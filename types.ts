export enum AppPhase {
    UPLOAD = 'UPLOAD',
    REVIEW = 'REVIEW',
    FINALIZE = 'FINALIZE',
}

export enum SourceType {
    OST = 'OST',
    AUDIO = 'Audio',
    BOTH = 'Both',
}

export interface AudioMeta {
    source: 'upload' | 'manual';
    // Upload details
    fileId?: string;
    fileName?: string;
    fileSize?: number;
    // Duration details
    originalDuration?: number; // in seconds
    trimmedDuration?: number; // in seconds
    // Trim details
    trimmedRanges?: { start: number; end: number }[];
    isTrimmed?: boolean;
    // Simulation details
    simulated?: 'upload' | 'transcription' | 'trim' | 'none';
    commandSnippet?: string;
    // Transcription details
    transcription?: {
        segments: { start: number; end: number; text: string }[];
        wordCount: number;
    };
}


export interface Slide {
    id: number;
    ost: string;
    transcript: string;
    selectedSource: SourceType;
    audioDuration: number; // in minutes
    isFinalized: boolean;
    audioMeta: AudioMeta;
    isDiscarded?: boolean;
    discardReason?: string;
    discardNote?: string;
    discardedAt?: string; // ISO timestamp
    discardedBy?: string; // User ID/name, placeholder for now
    undoAt?: string;
    undoBy?: string;
}

export interface CpeMetrics {
    totalWords: number;
    totalAvMinutes: number;
    totalQuestions: number;
    wordsCpe: number;
    avCpe: number;
    questionsCpe: number;
    rawCpeHours: number;
    roundedCpe: number;
}