
import React from 'react';

interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string | null;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({ isOpen, onClose, imageSrc }) => {
  if (!isOpen || !imageSrc) return null;

  return (
    <div 
        className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4 animate-fade-in cursor-zoom-out"
        onClick={onClose}
    >
        <div className="relative max-w-full max-h-full animate-slide-in-up">
             <button 
                onClick={onClose}
                className="absolute -top-10 right-0 text-gray-400 hover:text-white transition-colors"
                aria-label="Close preview"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <img 
                src={imageSrc} 
                alt="Full Preview" 
                className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking image itself
            />
        </div>
    </div>
  );
};
