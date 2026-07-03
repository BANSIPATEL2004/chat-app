export default function ImageViewer({ isOpen, onClose, src }) {
  if (!isOpen || !src) return null;

  return (
    <div 
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <button 
        onClick={onClose}
        className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors p-2 bg-white/10 rounded-full"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="relative w-full h-full flex items-center justify-center p-4">
        <img 
          src={src} 
          alt="fullscreen" 
          className="max-w-full max-h-full object-contain shadow-2xl animate-scale-in"
          onClick={(e) => e.stopPropagation()} // Prevent closing when clicking the image
        />
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-white/10 rounded-full backdrop-blur-md">
        <a 
          href={src} 
          download 
          target="_blank" 
          rel="noreferrer"
          className="text-white text-sm font-medium flex items-center gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download Original
        </a>
      </div>
    </div>
  );
}
