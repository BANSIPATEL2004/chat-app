import { useState } from "react";

export default function ImagePreviewModal({ isOpen, onClose, file, onSend, loading }) {
  if (!isOpen || !file) return null;

  const previewUrl = URL.createObjectURL(file);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-surface-950/90 backdrop-blur-md animate-fade-in">
      <div className="bg-surface-900 border border-surface-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-scale-in">
        <div className="p-4 border-b border-surface-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Preview Image</h2>
          <button onClick={onClose} className="text-surface-400 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 flex flex-col items-center">
          <div className="relative w-full max-h-[60vh] flex justify-center bg-surface-950 rounded-xl overflow-hidden border border-surface-800">
            <img 
              src={previewUrl} 
              alt="preview" 
              className="max-w-full max-h-full object-contain"
              onLoad={() => URL.revokeObjectURL(previewUrl)} // Clean up memory
            />
          </div>
          
          <div className="mt-6 flex gap-3 w-full justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl border border-surface-700 text-surface-300 hover:bg-surface-800 transition-all font-medium"
            >
              Cancel
            </button>
            <button
              onClick={onSend}
              disabled={loading}
              className="px-8 py-2.5 rounded-xl bg-brand-600 text-white hover:bg-brand-500 transition-all font-medium flex items-center gap-2 shadow-lg shadow-brand-600/20"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Sending...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Send Image
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
