import React, { useState, useCallback, useEffect } from 'react';
import { CloseIcon, UploadIcon } from './icons';
import { AudioMeta } from '../types';

interface AudioUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAcceptDuration: (durationInSeconds: number, meta: AudioMeta) => void;
}

type ModalView = 'UPLOAD' | 'PROCESSING' | 'RESULT' | 'TRANSCRIBING' | 'TRANSCRIBED' | 'TRIMMING';

// --- Configuration ---
// NOTE: This URL points to a local server. For deployment, you will need to change this
// to the public address of your FastAPI backend.
const API_BASE_URL = 'http://127.0.0.1:8000';

// --- Helper Components & Functions ---
const formatDuration = (seconds: number): string => {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};
const formatFileSize = (bytes: number): string => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

// --- Main Component ---
const AudioUploadModal: React.FC<AudioUploadModalProps> = ({ isOpen, onClose, onAcceptDuration }) => {
    const [view, setView] = useState<ModalView>('UPLOAD');
    const [error, setError] = useState<string | null>(null);
    
    // File & Upload State
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [processingText, setProcessingText] = useState('Uploading');
    
    // Audio Metadata State
    const [audioMeta, setAudioMeta] = useState<Partial<AudioMeta>>({});
    const [currentDuration, setCurrentDuration] = useState(0);

    // Trim State
    const [segmentsToDelete, setSegmentsToDelete] = useState<Set<string>>(new Set());

    const resetState = useCallback(() => {
        setView('UPLOAD');
        setError(null);
        setSelectedFile(null);
        setAudioMeta({});
        setCurrentDuration(0);
        setSegmentsToDelete(new Set());
    }, []);

    const handleClose = () => {
        resetState();
        onClose();
    };

    useEffect(() => {
        if (isOpen) {
            resetState();
        }
    }, [isOpen, resetState]);


    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setError(null);
            setSelectedFile(file);
        }
    };
    
    const handleUpload = async () => {
        if (!selectedFile) return;
        setProcessingText('Uploading');
        setView('PROCESSING');
        setError(null);

        const formData = new FormData();
        formData.append('file', selectedFile);

        try {
            const response = await fetch(`${API_BASE_URL}/upload-audio`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.detail || 'Upload failed');
            }

            const { file_id, duration } = await response.json();
            setAudioMeta({
                source: 'upload',
                fileId: file_id,
                fileName: selectedFile.name,
                fileSize: selectedFile.size,
                originalDuration: duration,
            });
            setCurrentDuration(duration);
            setView('RESULT');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown upload error.');
            setView('UPLOAD');
        }
    };

    const handleTranscribe = async () => {
        if (!audioMeta.fileId) return;
        setView('TRANSCRIBING');
        setError(null);
        try {
            const response = await fetch(`${API_BASE_URL}/transcribe-audio/${audioMeta.fileId}`);
             if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.detail || 'Transcription failed');
            }
            const { transcription: segments } = await response.json();

            const wordCount = segments.reduce((acc: number, s: { text: string }) => acc + s.text.trim().split(/\s+/).length, 0);

            setAudioMeta(prev => ({ 
                ...prev, 
                transcription: { segments, wordCount },
            }));
            setView('TRANSCRIBED');
        } catch(err) {
            setError(err instanceof Error ? err.message : 'Transcription failed.');
            setView('RESULT'); // Go back to result view
        }
    };

    const handleTrim = async () => {
        if (!audioMeta.fileId || segmentsToDelete.size === 0) {
            setError("Please select at least one segment to delete.");
            return;
        }

        setProcessingText('Trimming Audio');
        setView('PROCESSING');
        setError(null);
        
        try {
            const response = await fetch(`${API_BASE_URL}/trim-audio`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    file_id: audioMeta.fileId,
                    delete_texts: Array.from(segmentsToDelete),
                }),
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.detail?.message || errData.detail || 'Trim failed');
            }

            const { new_duration } = await response.json();
            
            setAudioMeta(prev => ({
                 ...prev,
                 isTrimmed: true,
                 trimmedDuration: new_duration,
            }));
            setCurrentDuration(new_duration);
            setSegmentsToDelete(new Set()); // Reset selection
            setView('RESULT');

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Trim operation failed.');
            setView('TRIMMING');
        }
    };
    
    const handleAccept = () => {
        onAcceptDuration(currentDuration, { ...audioMeta, source: 'upload' } as AudioMeta);
        handleClose();
    };

    const handleSegmentToggle = (segmentText: string) => {
        setSegmentsToDelete(prev => {
            const newSet = new Set(prev);
            if (newSet.has(segmentText)) {
                newSet.delete(segmentText);
            } else {
                newSet.add(segmentText);
            }
            return newSet;
        });
    };

    const renderContent = () => {
        switch (view) {
            case 'UPLOAD': return (
                <div>
                    <label htmlFor="audio-upload" className="flex flex-col items-center justify-center w-full h-48 px-4 transition bg-white border-2 border-gray-300 border-dashed rounded-md appearance-none cursor-pointer hover:border-gray-400 focus:outline-none">
                        <span className="flex items-center space-x-2"><UploadIcon /> <span className="font-medium text-gray-600">{selectedFile ? selectedFile.name : 'Drop file or click to select'}</span></span>
                        <span className="text-xs text-gray-500 mt-1">WAV format recommended</span>
                        <input id="audio-upload" type="file" className="hidden" onChange={handleFileChange} accept="audio/wav,audio/mpeg,audio/mp4,audio/ogg" />
                    </label>
                    <button onClick={handleUpload} disabled={!selectedFile} className="mt-4 w-full px-4 py-2 text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 disabled:bg-gray-400">Upload</button>
                </div>
            );
            case 'PROCESSING': return <div className="text-center py-8">{processingText}...</div>;
            case 'TRANSCRIBING': return <div className="text-center py-8">Transcribing audio... This may take a moment.</div>;
            case 'RESULT': return (
                <div className="space-y-4">
                     <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                        <p className="text-sm text-green-700">Upload Complete {audioMeta.isTrimmed && <span className="font-bold">(Trimmed)</span>}</p>
                        <p className="text-3xl font-bold text-green-800 mt-1">{formatDuration(currentDuration)}</p>
                        <p className="text-xs text-gray-500 mt-2">{audioMeta.fileName} ({formatFileSize(audioMeta.fileSize || 0)})</p>
                    </div>
                    <div className="flex items-center justify-center space-x-2">
                        <button onClick={handleTranscribe} disabled={!!audioMeta.transcription} className="px-4 py-2 text-sm text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed">
                            {audioMeta.transcription ? 'Transcribed' : 'Transcribe'}
                        </button>
                        <button onClick={() => setView('TRIMMING')} disabled={!audioMeta.transcription} className="px-4 py-2 text-sm text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed">Trim</button>
                    </div>
                    <button onClick={handleAccept} className="w-full px-4 py-2 text-white bg-green-600 rounded-lg shadow-sm hover:bg-green-700">Accept Duration</button>
                </div>
            );
            case 'TRANSCRIBED': return (
                 <div className="space-y-4">
                    <h3 className="font-semibold">Transcript</h3>
                    <div className="max-h-60 overflow-y-auto p-3 bg-gray-50 border rounded-md space-y-3">
                        {audioMeta.transcription?.segments.map((seg, i) => (
                            <div key={i}>
                                <div className="text-xs font-mono text-blue-600 mb-1">{formatDuration(seg.start)} - {formatDuration(seg.end)}</div>
                                <p className="text-sm text-gray-800">{seg.text}</p>
                            </div>
                        ))}
                    </div>
                     <div className="flex gap-2">
                        <button onClick={() => setView('RESULT')} className="w-full px-4 py-2 text-gray-700 bg-gray-200 rounded-lg shadow-sm hover:bg-gray-300">Back to Details</button>
                        <button onClick={() => setView('TRIMMING')} className="w-full px-4 py-2 text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700">Trim This Audio</button>
                    </div>
                 </div>
            );
            case 'TRIMMING': return (
                 <div className="space-y-4">
                     <h3 className="font-semibold">Trim Audio by Deleting Segments</h3>
                     <p className="text-xs text-gray-500">Original Duration: {formatDuration(audioMeta.originalDuration || 0)}. Check the boxes next to segments you want to remove.</p>
                     <div className="space-y-2 max-h-48 overflow-auto border rounded-md p-2 bg-gray-50">
                        {audioMeta.transcription?.segments.map((segment, index) => (
                            <div key={index} className="flex items-start gap-3 p-2 rounded-md hover:bg-gray-100">
                                <input
                                    type="checkbox"
                                    id={`segment-${index}`}
                                    checked={segmentsToDelete.has(segment.text)}
                                    onChange={() => handleSegmentToggle(segment.text)}
                                    className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <label htmlFor={`segment-${index}`} className="flex-1 text-sm text-gray-700 cursor-pointer">
                                    <span className="font-mono text-xs text-blue-600">{formatDuration(segment.start)}:</span> {segment.text}
                                </label>
                            </div>
                        ))}
                     </div>
                     <p className="text-sm text-center font-medium">{segmentsToDelete.size} segment(s) selected for deletion.</p>
                     <div className="flex gap-2 pt-2 border-t">
                        <button onClick={() => setView('RESULT')} className="w-full px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300">Cancel</button>
                        <button onClick={handleTrim} disabled={segmentsToDelete.size === 0} className="w-full px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:bg-red-300">Delete Selected & Trim</button>
                     </div>
                 </div>
            );
            default: return null;
        }
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 transition-opacity" aria-modal="true" role="dialog">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg transform transition-all">
                <div className="flex justify-between items-center p-5 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-800">Upload & Process Audio</h2>
                    <button onClick={handleClose} className="text-gray-400 hover:text-gray-600"><CloseIcon /></button>
                </div>
                <div className="p-6">
                    {error && (
                        <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 rounded-lg" role="alert">
                           <span className="font-medium">Error:</span> {error}
                        </div>
                    )}
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default AudioUploadModal;