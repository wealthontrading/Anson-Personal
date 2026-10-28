import React from 'react';
import { X, Download, FileText } from 'lucide-react';

interface ReceiptViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl?: string;
  title: string;
}

export const ReceiptViewerModal: React.FC<ReceiptViewerModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  title,
}) => {
  if (!isOpen || !imageUrl) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-xl bg-white rounded-3xl p-5 shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-500" />
            <h4 className="text-sm font-bold text-slate-900 truncate max-w-[280px]">
              {title} - Receipt
            </h4>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={imageUrl}
              download={`receipt_${Date.now()}.png`}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
              title="Download image"
            >
              <Download className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto flex items-center justify-center p-2 bg-slate-50 rounded-2xl">
          <img
            src={imageUrl}
            alt="Receipt Full Preview"
            className="max-h-[65vh] max-w-full object-contain rounded-xl shadow-sm"
          />
        </div>
      </div>
    </div>
  );
};
