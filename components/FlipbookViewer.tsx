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

// Helper hook for debouncing resize
function useDebouncedResize(delay: number) {
  const [size, setSize] = useState<{ width: number, height: number } | null>(null);

  useEffect(() => {
    let timeoutId: any;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setSize({ width: window.innerWidth, height: window.innerHeight });
      }, delay);
    };

    // Initial set
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, [delay]);

  return size;
}

// 1. PAGE CONTENT COMPONENT
const PageContent = React.forwardRef<HTMLDivElement, any>((props, ref) => {
    // Logic: Page 0 is Cover (Right). Page 1 is Left. Page 2 is Right.
    // Even indices = Right Side Panel. Odd indices = Left Side Panel.
    const isRightPage = props.pageNumber % 2 === 0;

    return (
        <div 
            ref={ref} 
            style={{ 
                width: props.width, 
                height: props.height,
                padding: 0,
                margin: 0,
                backgroundColor: '#ffffff',
                backfaceVisibility: 'hidden', 
                WebkitBackfaceVisibility: 'hidden',
                overflow: 'hidden',
                position: 'relative',
                cursor: 'pointer',
                // Realistic Paper Shadow: Soft drop shadow around the page
                boxShadow: '0 4px 10px rgba(0,0,0,0.15)', 
            }}
            className="group"
            onClick={props.onPageClick} 
        >
               {/* Spinner BEHIND the PDF Page */}
               <div className="absolute inset-0 flex items-center justify-center z-0 bg-white">
                    <Loader2 className="animate-spin text-gray-200" size={32} />
               </div>
               
               {/* PDF Page Wrapper - Children passed here are now the rendered Page or a placeholder */}
               <div className="relative z-10 w-full h-full block pointer-events-none">
                   {props.children}
               </div>

               {/* Hover Effect: Very subtle dark overlay when hovering to indicate clickability */}
               <div className="absolute inset-0 bg-black/0 group-hover:bg-black/[0.02] transition-colors duration-300 pointer-events-none z-30" />

               {/* --- THE SPINE SHADOW (Booklet Effect) --- */}
               <div className="absolute top-0 bottom-0 pointer-events-none z-20" 
                    style={{ 
                        // If Right Page: Shadow is on Left edge.
                        // If Left Page: Shadow is on Right edge.
                        left: isRightPage ? 0 : undefined,
                        right: isRightPage ? undefined : 0,
                        width: '40px', // Width of the gradient
                        background: isRightPage
                            // Right Page: Dark on Left -> Transparent on Right
                            ? 'linear-gradient(to right, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.1) 20%, rgba(0,0,0,0) 100%)' 
                            // Left Page: Transparent on Left -> Dark on Right
                            : 'linear-gradient(to left, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.1) 20%, rgba(0,0,0,0) 100%)'
                    }} 
               />
               
               {/* --- THE BINDER CREASE (Thin dark line in the deep center) --- */}
               <div className="absolute top-0 bottom-0 pointer-events-none z-20"
                    style={{
                        left: isRightPage ? 0 : undefined,
                        right: isRightPage ? undefined : 0,
                        width: '1px',
                        backgroundColor: 'rgba(0,0,0,0.15)' 
                    }}
               />
        </div>
    );
});
PageContent.displayName = 'PageContent';

const FlipbookViewer: React.FC<FlipbookViewerProps> = ({ booklet, onClose, onShare, isPublic = false }) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pdfDimensions, setPdfDimensions] = useState<{width: number, height: number} | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loadStatus, setLoadStatus] = useState<'loading' | 'success' | 'error'>('loading');
  
  const windowSize = useDebouncedResize(150);
  
  const bookRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    recordView(booklet.id);
  }, [booklet.id]);

  const onDocumentLoadSuccess = async (pdf: any) => {
    setNumPages(pdf.numPages);
    try {
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1 });
        setPdfDimensions({ width: viewport.width, height: viewport.height });
        setLoadStatus('success');
    } catch (e) {
        console.error("Could not get page dimensions", e);
        setPdfDimensions({ width: 600, height: 800 }); 
        setLoadStatus('success');
    }
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

  const handlePageClick = useCallback((index: number) => {
      // 0 = Cover (Right)
      // 1 = Left, 2 = Right
      if (index === 0) {
          handleNext();
          return;
      }
      const isRightSide = index % 2 === 0;
      if (isRightSide) {
          handleNext();
      } else {
          handlePrev();
      }
  }, [handleNext, handlePrev]);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
        const response = await fetch(booklet.url);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${booklet.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    } catch (err) {
        console.error("Download failed", err);
        // Fallback
        window.open(booklet.url, '_blank');
    }
  };

  // 2. DIMENSIONS
  const dims = useMemo(() => {
    if (!windowSize || !pdfDimensions) return null;
    
    const ratio = pdfDimensions.width / pdfDimensions.height;
    const availableW = windowSize.width;
    const availableH = windowSize.height;

    const MAX_HEIGHT = availableH * 0.82; 
    
    const isLandscapeDoc = ratio > 1.2;
    const isMobile = windowSize.width < 768;

    const MAX_WIDTH_PER_PAGE = (isMobile || isLandscapeDoc) 
        ? (availableW * 0.90) 
        : (availableW * 0.42);

    let pageHeight = MAX_HEIGHT;
    let pageWidth = pageHeight * ratio;

    if (pageWidth > MAX_WIDTH_PER_PAGE) {
        pageWidth = MAX_WIDTH_PER_PAGE;
        pageHeight = pageWidth / ratio;
    }

    pageWidth = Math.floor(pageWidth);
    pageHeight = Math.floor(pageHeight);

    if (pageWidth % 2 !== 0) pageWidth -= 1;
    if (pageHeight % 2 !== 0) pageHeight -= 1;

    return { 
        pageWidth, 
        pageHeight, 
        usePortrait: isMobile || isLandscapeDoc,
        pixelRatio: isMobile ? 1.5 : 2 // CAP PIXEL RATIO FOR PERFORMANCE
    };
  }, [windowSize, pdfDimensions]);

  const transformKey = dims ? `${dims.pageWidth}-${dims.pageHeight}-${dims.usePortrait}` : 'loading';

  // 3. FLIPBOOK SETTINGS
  const flipBookProps: any = useMemo(() => ({
    width: dims?.pageWidth || 300,
    height: dims?.pageHeight || 400,
    size: "fixed",
    minWidth: dims?.pageWidth || 300,
    maxWidth: dims?.pageWidth || 300,
    minHeight: dims?.pageHeight || 400,
    maxHeight: dims?.pageHeight || 400,
    maxShadowOpacity: 0.5, 
    showCover: true,
    mobileScrollSupport: false,
    className: "shadow-2xl",
    startPage: 0,
    drawShadow: true,
    flippingTime: 1000, 
    usePortrait: dims?.usePortrait,
    startZIndex: 0,
    autoSize: false,
    
    // --- NO HOVER FOLDING ---
    showPageCorners: false,    // DISABLES the dog-ear effect on hover
    
    // --- CLICK INTERACTION ---
    clickEventForward: true,   
    useMouseEvents: false,     // Disable drag
    swipeDistance: 0,          
    disableFlipByClick: false, // Allow click to flip
    
    style: { margin: '0 auto' }
  }), [dims]);

  // VIRTUALIZATION HELPER
  // Only render pages that are close to the current page to save memory and CPU
  const shouldRenderPage = (pageIndex: number, current: number, total: number) => {
    // Always render first and last few pages to ensure book structure
    if (pageIndex < 2) return true;
    
    // Render current viewing area + buffer
    // Page 0 (Cover) counts as 1 in FlipBook logic sometimes depending on view
    // Generally, we check if index is within range [current - 2, current + 2]
    const range = 2;
    return (pageIndex >= current - range && pageIndex <= current + range + 1);
  };

  if (!windowSize) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-[#0d0d0d] flex flex-col h-screen w-screen overflow-hidden select-none" ref={containerRef}>
        
        {/* --- Header --- */}
        <div className="h-16 bg-black/95 backdrop-blur-xl border-b border-white/10 flex items-center justify-between px-6 z-[100] flex-shrink-0">
            <div className="flex items-center gap-4 flex-1 min-w-0">
                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-colors flex-shrink-0">
                    {isPublic ? <BookOpen size={20} /> : <X size={20} />}
                </button>
                <div className="flex flex-col cursor-pointer min-w-0" onClick={onClose}>
                    <h1 className="font-serif text-sm font-bold text-white uppercase tracking-wider whitespace-nowrap overflow-hidden text-ellipsis">
                        {booklet.title}
                    </h1>
                </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                 <button onClick={onShare} className="flex items-center gap-2 px-4 py-1.5 text-[10px] font-bold text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all uppercase tracking-widest">
                    <Share2 size={12} />
                    <span>Share</span>
                </button>
                <button 
                    onClick={handleDownload} 
                    className="flex items-center gap-2 px-4 py-1.5 text-[10px] font-bold text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all uppercase tracking-widest"
                >
                    <Download size={12} />
                    <span>Download</span>
                </button>
            </div>
        </div>

        {/* --- Main Viewer Area --- */}
        <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
             
             {(loadStatus === 'loading' || !dims) && (
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
                CRITICAL OPTIMIZATION: 
                The <Document> component is now WRAPPING the FlipBook.
                Previously, it was inside every PageContent, causing the PDF to be re-parsed 50 times.
             */}
             <Document 
                file={booklet.url} 
                onLoadSuccess={onDocumentLoadSuccess} 
                onLoadError={onDocumentLoadError} 
                loading={null}
                className="flex items-center justify-center"
             >
                 {dims && loadStatus === 'success' && (
                    <TransformWrapper
                        key={transformKey} 
                        initialScale={1}
                        minScale={0.5}
                        maxScale={4}
                        centerOnInit={true}
                        centerZoomedOut={true}
                        limitToBounds={false}
                        wheel={{ step: 0.1 }}
                        panning={{ excluded: ['flipbook-interactive-area'] }}
                    >
                        {({ zoomIn, zoomOut, resetTransform }) => (
                            <>
                                <TransformComponent 
                                    wrapperClass="!w-screen !h-full !overflow-visible" 
                                    contentClass="!w-full !h-full flex items-center justify-center !overflow-visible"
                                >
                                    {numPages > 0 && (
                                        // Wrapper with click handler exclusion
                                        <div 
                                            className="flipbook-interactive-area"
                                            style={{ width: 'auto', height: 'auto', padding: '20px' }}
                                        >
                                            <HTMLFlipBook
                                                {...flipBookProps}
                                                ref={bookRef}
                                                onFlip={(e: any) => setCurrentPage(e.data)}
                                            >
                                                {Array.from(new Array(numPages), (el, index) => (
                                                    <PageContent 
                                                        key={`page_${index}`} 
                                                        width={dims.pageWidth} 
                                                        height={dims.pageHeight}
                                                        pageNumber={index}
                                                        onPageClick={() => handlePageClick(index)}
                                                    >
                                                        {shouldRenderPage(index, currentPage, numPages) ? (
                                                            <Page 
                                                                key={`pdf_page_${index}_${dims.pageWidth}`}
                                                                pageNumber={index + 1} 
                                                                width={dims.pageWidth} 
                                                                height={dims.pageHeight}
                                                                renderTextLayer={false}
                                                                renderAnnotationLayer={false}
                                                                loading={<div className="w-full h-full bg-white" />}
                                                                error="Failed to load page"
                                                                className="bg-white"
                                                                devicePixelRatio={dims.pixelRatio} // Optimize resolution
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full bg-white flex items-center justify-center">
                                                                {/* Lightweight placeholder for off-screen pages */}
                                                                <div className="w-8 h-8 rounded-full border-2 border-gray-100" />
                                                            </div>
                                                        )}
                                                    </PageContent>
                                                ))}
                                            </HTMLFlipBook>
                                        </div>
                                    )}
                                </TransformComponent>

                                {/* Controls Overlay */}
                                <button 
                                    onClick={handlePrev}
                                    disabled={currentPage === 0}
                                    className="fixed left-4 lg:left-8 top-1/2 -translate-y-1/2 z-[150] p-4 rounded-full text-white/40 hover:text-white hover:bg-black/40 hover:backdrop-blur-sm transition-all duration-300 disabled:opacity-0 disabled:pointer-events-none group"
                                >
                                    <ChevronLeft size={48} strokeWidth={1} className="group-hover:-translate-x-1 transition-transform" />
                                </button>

                                <button 
                                    onClick={handleNext}
                                    disabled={currentPage >= numPages - 1}
                                    className="fixed right-4 lg:right-8 top-1/2 -translate-y-1/2 z-[150] p-4 rounded-full text-white/40 hover:text-white hover:bg-black/40 hover:backdrop-blur-sm transition-all duration-300 disabled:opacity-0 disabled:pointer-events-none group"
                                >
                                    <ChevronRight size={48} strokeWidth={1} className="group-hover:translate-x-1 transition-transform" />
                                </button>

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
                            </>
                        )}
                    </TransformWrapper>
                 )}
            </Document>
        </div>
    </div>
  );
};

export default FlipbookViewer;