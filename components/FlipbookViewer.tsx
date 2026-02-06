import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import HTMLFlipBook from 'react-pageflip';
import { Document, Page, pdfjs } from 'react-pdf';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { ZoomIn, ZoomOut, Maximize, Minimize, ChevronLeft, ChevronRight, X, Download, Share2, RotateCcw, Loader2, AlertTriangle } from 'lucide-react';
import { Booklet } from '../types';
import { recordView } from '../services/firebase';

// Ensure worker version matches the React-PDF version in index.html (v7.7.1 -> pdfjs-dist@3.11.174)
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;

interface FlipbookViewerProps {
  booklet: Booklet;
  onClose: () => void;
  onShare: () => void;
}

const PageContent = React.forwardRef<HTMLDivElement, any>((props, ref) => {
    return (
        <div ref={ref} className="bg-white shadow-lg h-full w-full overflow-hidden flex items-center justify-center border-l border-black/5" data-density={props['data-density'] || 'soft'}>
            {props.children}
        </div>
    );
});

const FlipbookViewer: React.FC<FlipbookViewerProps> = ({ booklet, onClose, onShare }) => {
  const [numPages, setNumPages] = useState<number>(0);
  
  // Safe initialization state
  const [windowSize, setWindowSize] = useState<{width: number, height: number} | null>(null);

  const [currentPage, setCurrentPage] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loadStatus, setLoadStatus] = useState<'loading' | 'success' | 'error'>('loading');
  
  const bookRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    recordView(booklet.id);
    
    const handleResize = () => {
        if (typeof window !== 'undefined') {
             // Basic debounce
             requestAnimationFrame(() => {
                setWindowSize({ width: window.innerWidth, height: window.innerHeight });
             });
        }
    };

    // Initial check
    handleResize();

    // Additional check for environments where window size might settle late
    const timer = setTimeout(handleResize, 100);

    window.addEventListener('resize', handleResize);
    return () => {
        window.removeEventListener('resize', handleResize);
        clearTimeout(timer);
    };
  }, [booklet.id]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoadStatus('success');
  };

  const onDocumentLoadError = (error: Error) => {
    console.error("PDF Load Error Details:", error);
    console.error("Attempted URL:", booklet.url);
    setLoadStatus('error');
  };

  const handleNext = useCallback(() => {
    if (bookRef.current) bookRef.current.pageFlip().flipNext();
  }, []);

  const handlePrev = useCallback(() => {
    if (bookRef.current) bookRef.current.pageFlip().flipPrev();
  }, []);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const dims = useMemo(() => {
    // CRITICAL: Return null if dimensions are invalid to prevent FlipBook crash
    if (!windowSize || windowSize.width <= 0 || windowSize.height <= 0) {
      return null;
    }

    const isPortrait = windowSize.width < windowSize.height;
    const availableH = windowSize.height - 180; // Reserve space for header/controls
    const availableW = windowSize.width - 60;   // Reserve margins
    
    // Target A4 Ratio (1 : 1.414)
    const h = Math.min(availableH, 900);
    const w = Math.min(h * 0.707, availableW / (isPortrait ? 1 : 2));
    
    // Strict limits
    const finalW = Math.floor(Math.max(w, 200));
    const finalH = Math.floor(Math.max(w / 0.707, 300));
    
    return { 
      pageWidth: finalW, 
      pageHeight: finalH, 
      isPortrait 
    };
  }, [windowSize]);

  // If dimensions aren't ready, show loader but DO NOT render FlipBook
  if (!windowSize || !dims) {
    return (
      <div className="fixed inset-0 z-[9999] bg-[#0d0d0d] flex items-center justify-center">
         <Loader2 className="animate-spin text-white/20" size={40} />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-[#0d0d0d] flex flex-col h-screen w-screen overflow-hidden select-none" ref={containerRef}>
        
        {/* Header bar */}
        <div className="h-16 bg-black/95 backdrop-blur-xl border-b border-white/10 flex items-center justify-between px-6 z-[100] flex-shrink-0">
            <div className="flex items-center gap-4">
                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-white/50 transition-colors">
                    <X size={20} />
                </button>
                <div className="flex flex-col">
                    <h1 className="font-serif text-sm font-bold text-white truncate max-w-[150px] uppercase tracking-wider">{booklet.title}</h1>
                    <span className="text-[7px] text-white/30 uppercase tracking-[0.3em] font-bold">Lumière Folio</span>
                </div>
            </div>
            <div className="flex items-center gap-3">
                 <button onClick={onShare} className="flex items-center gap-2 px-4 py-1.5 text-[10px] font-bold text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all uppercase tracking-widest">
                    <Share2 size={12} />
                    <span>Share</span>
                </button>
                <a href={booklet.url} download className="p-2 text-white/40 hover:text-white transition-colors"><Download size={20} /></a>
            </div>
        </div>

        {/* Viewer Area */}
        <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
             
             {loadStatus === 'loading' && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0d0d0d] z-50">
                     <Loader2 className="animate-spin text-white/20 mb-4" size={40} />
                     <span className="text-[10px] font-bold text-white/20 uppercase tracking-[0.5em]">Loading Folio</span>
                 </div>
             )}

             {loadStatus === 'error' && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0d0d0d] z-50 p-10 text-center">
                     <AlertTriangle className="text-red-500 mb-4" size={48} />
                     <h2 className="text-white mb-2">Unable to Load PDF</h2>
                     <p className="text-white/50 text-xs mb-6 max-w-md">The file could not be accessed. This may be due to a version mismatch or network restriction.</p>
                     <button onClick={onClose} className="px-8 py-2 border border-white/10 rounded-full text-white text-xs hover:bg-white/5">Close Viewer</button>
                 </div>
             )}

             <TransformWrapper
                initialScale={1}
                minScale={0.5}
                maxScale={4}
                centerOnInit
                centerZoomedOut
                limitToBounds={false}
             >
                {({ zoomIn, zoomOut, resetTransform }) => (
                    <>
                        <TransformComponent wrapperClass="!w-screen !h-full" contentClass="!w-full !h-full flex items-center justify-center">
                            <div className="flex items-center justify-center p-10 min-w-full min-h-full">
                                <Document
                                    file={booklet.url}
                                    onLoadSuccess={onDocumentLoadSuccess}
                                    onLoadError={onDocumentLoadError}
                                    loading={null}
                                >
                                    {numPages > 0 && dims && (
                                        <div className="shadow-[0_80px_160px_-40px_rgba(0,0,0,1)] bg-white">
                                            <HTMLFlipBook
                                                width={dims.pageWidth}
                                                height={dims.pageHeight}
                                                size="fixed"
                                                minWidth={100}
                                                maxWidth={3000}
                                                minHeight={150}
                                                maxHeight={3000}
                                                maxShadowOpacity={0.5}
                                                showCover={true}
                                                mobileScrollSupport={true}
                                                ref={bookRef}
                                                onFlip={(e) => setCurrentPage(e.data)}
                                                startPage={0}
                                                drawShadow={true}
                                                flippingTime={1000}
                                                usePortrait={dims.isPortrait}
                                                autoSize={true}
                                                clickEventForward={true}
                                                useMouseEvents={true}
                                                swipeDistance={30}
                                                showPageCorners={true}
                                                disableFlipByClick={false}
                                                style={{ display: 'block' }}
                                            >
                                                {Array.from(new Array(numPages), (el, index) => (
                                                    // Uniform 'soft' density for all pages to ensure consistent animation
                                                    <PageContent key={`page_${index + 1}`} data-density="soft">
                                                        <Page 
                                                            pageNumber={index + 1} 
                                                            width={dims.pageWidth}
                                                            renderTextLayer={false}
                                                            renderAnnotationLayer={false}
                                                            loading={null}
                                                        />
                                                    </PageContent>
                                                ))}
                                            </HTMLFlipBook>
                                        </div>
                                    )}
                                </Document>
                            </div>
                        </TransformComponent>

                        {/* Controls Overlay */}
                        {loadStatus === 'success' && (
                            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[110] flex items-center gap-2 bg-[#1a1a1a]/95 backdrop-blur-2xl p-1.5 rounded-full border border-white/10 shadow-2xl">
                                <div className="flex items-center gap-1 bg-black/40 rounded-full px-4 py-1.5 border border-white/5">
                                    <button onClick={handlePrev} className="p-1 hover:text-white text-white/30 disabled:opacity-0" disabled={currentPage === 0}><ChevronLeft size={22} /></button>
                                    <div className="flex items-center gap-2 min-w-[70px] justify-center text-white text-sm font-bold select-none">
                                        {currentPage + 1} <span className="text-[9px] text-white/20 uppercase">/ {numPages}</span>
                                    </div>
                                    <button onClick={handleNext} className="p-1 hover:text-white text-white/30 disabled:opacity-0" disabled={currentPage >= numPages - 1}><ChevronRight size={22} /></button>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => zoomOut()} className="p-3 text-white/30 hover:text-white transition-colors"><ZoomOut size={18} /></button>
                                    <button onClick={() => resetTransform()} className="p-3 text-white/30 hover:text-white transition-colors"><RotateCcw size={16} /></button>
                                    <button onClick={() => zoomIn()} className="p-3 text-white/30 hover:text-white transition-colors"><ZoomIn size={18} /></button>
                                </div>
                                <div className="border-l border-white/10 ml-1 pl-1">
                                    <button onClick={toggleFullScreen} className="p-3 text-white/30 hover:text-white transition-colors">
                                        {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </TransformWrapper>
        </div>
    </div>
  );
};

export default FlipbookViewer;