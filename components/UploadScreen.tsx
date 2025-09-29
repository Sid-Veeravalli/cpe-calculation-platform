
import React, { useState, useCallback } from 'react';
import { parseFile } from '../services/fileParser';
import { Slide } from '../types';
import { UploadIcon } from './icons';

interface UploadScreenProps {
    onFileUpload: (slides: Slide[], fileName: string) => void;
}

const UploadScreen: React.FC<UploadScreenProps> = ({ onFileUpload }) => {
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [fileName, setFileName] = useState<string | null>(null);

    const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setIsLoading(true);
            setError(null);
            setFileName(file.name);
            try {
                const slides = await parseFile(file);
                if (slides.length === 0) {
                    setError('Could not extract any slides. Please check the file format and content.');
                } else {
                    onFileUpload(slides, file.name);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An unknown error occurred during parsing.');
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        }
    }, [onFileUpload]);

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="w-full max-w-lg p-8 space-y-8 bg-white rounded-xl shadow-lg text-center">
                <header>
                    <h1 className="text-3xl font-bold text-gray-900">CPE Calculator</h1>
                    <p className="mt-2 text-gray-600">Upload your storyboard to get started</p>
                </header>
                
                <div className="flex justify-center items-center w-full">
                    <label htmlFor="dropzone-file" className="flex flex-col justify-center items-center w-full h-64 bg-gray-50 rounded-lg border-2 border-gray-300 border-dashed cursor-pointer hover:bg-gray-100 transition-colors">
                        <div className="flex flex-col justify-center items-center pt-5 pb-6">
                            <UploadIcon />
                            <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                            <p className="text-xs text-gray-500">Excel, CSV, or PPTX files</p>
                        </div>
                        <input id="dropzone-file" type="file" className="hidden" onChange={handleFileChange} accept=".xlsx, .xls, .csv, .pptx" disabled={isLoading} />
                    </label>
                </div>

                {isLoading && (
                    <div className="flex items-center justify-center space-x-2">
                        <div className="w-4 h-4 rounded-full animate-pulse bg-blue-600"></div>
                        <div className="w-4 h-4 rounded-full animate-pulse bg-blue-600" style={{animationDelay: '0.2s'}}></div>
                        <div className="w-4 h-4 rounded-full animate-pulse bg-blue-600" style={{animationDelay: '0.4s'}}></div>
                        <p className="text-gray-600">Parsing "{fileName}"...</p>
                    </div>
                )}

                {error && <p className="text-red-500 bg-red-100 p-3 rounded-lg">{error}</p>}
                
                <footer className="text-xs text-gray-400">
                    <p>&copy; {new Date().getFullYear()} CPE Calculator. All rights reserved.</p>
                </footer>
            </div>
        </div>
    );
};

export default UploadScreen;
