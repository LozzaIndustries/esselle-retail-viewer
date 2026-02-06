import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import HTMLFlipBook from 'react-pageflip';
import { Document, Page, pdfjs } from 'react-pdf';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { ZoomIn, ZoomOut, Maximize, Minimize, ChevronLeft, ChevronRight, X, Download, Share2, RotateCcw, Loader2, AlertTriangle, BookOpen } from 'lucide-react';
import { Booklet } from '../types';
import { recordView } from '../services/firebase';

// Ensure worker version matches the React-PDF version
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;

interface FlipbookViewerProps {
  booklet: Booklet;
  onClose: () => void;
  onShare: () => void;
  isPublic?: boolean; 
}

// 1. IMPROVED PAGE COMPONENT - Must use forwardRef for react-pageflip
const PageContent = React.forwardRef<HTMLDivElement, any>((props, ref) => {
    return (
        <div ref={ref} className="bg-white shadow-xl h-full w-full overflow-hidden" data-density="soft">
            <div className="w-full h-full flex items-center justify-center relative">
               {/* Show spinner while individual page renders */}
               <div className="absolute inset-0 flex items-center justify-center -z-10 bg-gray-50">
                    <Loader2 className="animate-spin text-gray-300" size={20} />
               </div>
               {props.children}
            </div>
        </div>
    );
});
PageContent.displayName = 'PageContent';

const FlipbookViewer: React.FC<FlipbookViewerProps> = ({ booklet, onClose, onShare, isPublic = false }) => {
  const [numPages, setNumPages] = useState<number>(0);
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
             requestAnimationFrame(() => {
                setWindowSize({ width: window.innerWidth, height: window.innerHeight });
             });
        }
    };

    handleResize();
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
    console.error("PDF Load Error:", error);
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

  // 2. DIMENSION CALCULATION - Fixed strict constraints
  const dims = useMemo(() => {
    if (!windowSize || windowSize.width <= 0 || windowSize.height <= 0) return null;

    // Available screen space minus interface elements
    const availableH = windowSize.height - 100; 
    const availableW = windowSize.width - 40; 
    const isPortrait = availableW < availableH;
    
    // Standard A4 Ratio (1.414)
    const ratio = 1.414;
    
    // Determine max possible height based on screen
    let h = Math.min(availableH, 1200);
    
    // Determine width: If single page (portrait), width is H/ratio. If spread, width is (H/ratio)
    // NOTE: HTMLFlipBook width/height props are for ONE PAGE
    let w = h / ratio;

    // Check if double spread fits in width
    if (!isPortrait && (w * 2) > availableW) {
        // If not, scale down based on width
        w = availableW / 2;
        h = w * ratio;
    } else if (isPortrait && w > availableW) {
        w = availableW;
        h = w * ratio;
    }
    
    return { 
      pageWidth: Math.floor(w), 
      pageHeight: Math.floor(h), 
      isPortrait 
    };
  }, [windowSize]);

  if (!windowSize || !dims) {
    return (
      <div className="fixed inset-0 z-[9999] bg-[#0d0d0d] flex items-center justify-center">
         <Loader2 className="animate-spin text-white/20" size={40} />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-[#0d0d0d] flex flex-col h-screen w-screen overflow-hidden select-none" ref={containerRef}>
        {/* Header */}
        <div className="h-16 bg-black/95 backdrop-blur-xl border-b border-white/10 flex items-center justify-between px-6 z-[100] flex-shrink-0">
            <div className="flex items-center gap-4">
                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-colors">
                    {isPublic ? <BookOpen size={20} /> : <X size={20} />}
                </button>
                <div className="flex flex-col cursor-pointer" onClick={onClose}>
                    <h1 className="font-serif text-sm font-bold text-white truncate max-w-[150px] uppercase tracking-wider">{booklet.title}</h1>
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

        {/* Viewer */}
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
                     <button onClick={onClose} className="px-8 py-2 border border-white/10 rounded-full text-white text-xs hover:bg-white/5">Close</button>
                 </div>
             )}

             {/* 
                 3. DOCUMENT LOADING STRATEGY
                 Load Document invisible first to get numPages, THEN render FlipBook.
                 Do not wrap FlipBook in Document as it causes re-renders on page change.
             */}
             <div className="hidden">
                 <Document 
                    file={booklet.url} 
                    onLoadSuccess={onDocumentLoadSuccess} 
                    onLoadError={onDocumentLoadError} 
                 />
             </div>

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
                            {/* 4. FLIPBOOK RENDERING */}
                            {loadStatus === 'success' && numPages > 0 && (
                                <div className="flex items-center justify-center py-10" style={{ maxWidth: '100vw', maxHeight: '100vh' }}>
                                    <HTMLFlipBook
                                        width={dims.pageWidth}
                                        height={dims.pageHeight}
                                        size="fixed"
                                        minWidth={dims.pageWidth} // Lock dimensions to prevent resize loop
                                        maxWidth={dims.pageWidth}
                                        minHeight={dims.pageHeight}
                                        maxHeight={dims.pageHeight}
                                        maxShadowOpacity={0.5}
                                        showCover={true}
                                        mobileScrollSupport={true}
                                        ref={bookRef}
                                        onFlip={(e) => setCurrentPage(e.data)}
                                        className="shadow-2xl"
                                        startPage={0}
                                        drawShadow={true}
                                        flippingTime={1000}
                                        usePortrait={dims.isPortrait}
                                        autoSize={true} // Allow it to calculate initially, then lock via props
                                        clickEventForward={true}
                                        useMouseEvents={true}
                                        swipeDistance={30}
                                        showPageCorners={true}
                                        disableFlipByClick={false}
                                        style={{ margin: '0 auto' }}
                                    >
                                        {/* Render pages explicitly using the Document context for each one */}
                                        {Array.from(new Array(numPages), (el, index) => (
                                            <PageContent key={`page_${index}`}>
                                                <Document file={booklet.url} loading={null}>
                                                    <Page 
                                                        pageNumber={index + 1} 
                                                        width={dims.pageWidth} // Match container exactly
                                                        renderTextLayer={false}
                                                        renderAnnotationLayer={false}
                                                        loading={null}
                                                        error="Failed to load page"
                                                    />
                                                </Document>
                                            </PageContent>
                                        ))}
                                    </HTMLFlipBook>
                                </div>
                            )}
                        </TransformComponent>

                        {/* Controls */}
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