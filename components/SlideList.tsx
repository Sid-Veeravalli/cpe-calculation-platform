import React from 'react';
import { Slide } from '../types';
import { CheckIcon, TrashIcon } from './icons';

interface SlideListProps {
    slides: Slide[];
    activeSlideId: number | null;
    onSelectSlide: (id: number) => void;
}

const SlideList: React.FC<SlideListProps> = ({ slides, activeSlideId, onSelectSlide }) => {
    return (
        <nav className="p-4">
            <h2 className="text-lg font-semibold text-gray-700 mb-3">Slides</h2>
            <ul>
                {slides.map(slide => (
                    <li key={slide.id}>
                        <button
                            onClick={() => onSelectSlide(slide.id)}
                            className={`w-full text-left p-3 rounded-lg mb-2 flex items-center justify-between transition-colors relative ${
                                activeSlideId === slide.id
                                    ? 'bg-blue-100 text-blue-800 font-semibold'
                                    : 'hover:bg-gray-200 text-gray-600'
                            } ${slide.isDiscarded ? 'opacity-60 line-through' : ''}`}
                             title={slide.isDiscarded ? `Discarded: ${slide.discardReason}` : `Slide ${slide.id}`}
                        >
                            <span>Slide {slide.id}</span>
                            <div className="flex items-center gap-2">
                               {slide.isDiscarded && <TrashIcon className="w-4 h-4 text-gray-500" />}
                               {slide.isFinalized && !slide.isDiscarded && <CheckIcon className="text-green-500" />}
                            </div>
                        </button>
                    </li>
                ))}
            </ul>
        </nav>
    );
};

export default SlideList;