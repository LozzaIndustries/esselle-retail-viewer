import React, { useState, useEffect, useRef, useCallback } from 'react';
import HTMLFlipBook from 'react-pageflip';
import { Document, Page, pdfjs } from 'react-pdf';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { ZoomIn, ZoomOut, Maximize, Minimize, ChevronLeft, ChevronRight, X, Download, Share2 } from 'lucide-react';
import { Booklet } from '../types';
import { recordView } from '../services/firebase';

// Set worker logic for react-pdf
// Using unpkg specific to the version defined in importmap
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;

interface FlipbookViewerProps {
  booklet: Booklet;
  onClose: () => void;
  onShare: () => void;
}

interface PageProps {
    number: number;
    width: number;
    height: number;
}

// Forward ref component for HTMLFlipBook pages
const PageCover = React.forwardRef<HTMLDivElement, any>((props, ref) => {
    return (
        <div ref={ref} className="bg-white shadow-sm h-full w-full overflow-hidden" data-density="hard">
            {props.children}
        </div>
    );
});

const PageInner = React.forwardRef<HTMLDivElement, any>((props, ref) => {
    return (
        <div ref={ref} className="bg-white shadow-sm h-full w-full overflow-hidden" data-density="soft">
            {props.children}
        </div>
    );
});

const FlipbookViewer: React.FC<FlipbookViewerProps> = ({ booklet, onClose, onShare }) => {
  const [numPages, setNumPages] = useState<number>(0);
  // Default to window size to prevent "Loading Layout" stuck state
  const [containerSize, setContainerSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [currentPage, setCurrentPage] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const bookRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Record View on Mount
  useEffect(() => {
    recordView(booklet.id);
  }, [booklet.id]);

  // Resize observer to keep the flipbook responsive
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        
        // Ensure we don't set 0 dimensions if something is temporarily hidden
        if (width > 0 && height > 0) {
            setContainerSize({ width, height });
        }
      }
    };

    window.addEventListener('resize', handleResize);
    
    // Immediate check
    handleResize();
    
    // Delayed check for safety in case of animations
    const timer = setTimeout(handleResize, 500);

    return () => {
        window.removeEventListener('resize', handleResize);
        clearTimeout(timer);
    };
  }, []);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const handleNext = useCallback(() => {
    if (bookRef.current) {
        bookRef.current.pageFlip().flipNext();
    }
  }, []);

  const handlePrev = useCallback(() => {
    if (bookRef.current) {
        bookRef.current.pageFlip().flipPrev();
    }
  }, []);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Dimensions for the flipbook based on container
  // Keep standard A4 ratio approx 1:1.41
  const bookHeight = Math.min(containerSize.height - 100, 800);
  const bookWidth = (bookHeight * 0.707) * 2; // width for 2 pages

  // Fallback if dimensions are still calculating
  if (containerSize.width === 0 || containerSize.height === 0) {
      return (
        <div className="fixed inset-0 z-50 bg-[#e5e5e5] flex flex-col items-center justify-center">
             <div className="text-dark font-serif animate-pulse">Initializing Viewer...</div>
        </div>
      );
  }

  const pageWidth = bookWidth / 2;
  const pageHeight = bookHeight;

  return (
    <div className="fixed inset-0 z-50 bg-[#e5e5e5] flex flex-col h-screen w-screen overflow-hidden">
        
        {/* Top Bar */}
        <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-10 shadow-sm flex-shrink-0">
            <div className="flex items-center gap-4 overflow-hidden">
                <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-cool transition-colors">
                    <X size={20} />
                </button>
                <div className="flex flex-col">
                    <h1 className="font-serif text-lg font-bold text-dark truncate max-w-xs md:max-w-md">{booklet.title}</h1>
                    <span className="text-xs text-cool uppercase tracking-wide">Read Mode</span>
                </div>
            </div>
            
            <div className="flex items-center gap-2">
                 <button onClick={onShare} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-dark hover:bg-warm/10 rounded-full transition-colors">
                    <Share2 size={16} />
                    <span className="hidden sm:inline">Share / QR</span>
                </button>
                <a 
                    href={booklet.url} 
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-cool hover:text-dark hover:bg-gray-100 rounded-full transition-colors"
                    title="Download PDF"
                >
                    <Download size={20} />
                </a>
            </div>
        </div>

        {/* Viewer Area */}
        <div className="flex-grow relative bg-[#333333] overflow-hidden flex items-center justify-center w-full h-full" ref={containerRef}>
             <TransformWrapper
                initialScale={1}
                minScale={0.8}
                maxScale={3}
                centerOnInit
                wheel={{ disabled: false }} // Allow pinch zoom
                pinch={{ disabled: false }}
                doubleClick={{ disabled: true }}
             >
                {({ zoomIn, zoomOut, resetTransform }) => (
                    <>
                        <TransformComponent wrapperClass="!w-full !h-full flex items-center justify-center">
                            <Document
                                file={booklet.url}
                                onLoadSuccess={onDocumentLoadSuccess}
                                className="shadow-2xl"
                                loading={
                                    <div className="text-white font-serif text-xl animate-pulse">Loading Document...</div>
                                }
                            >
                                <HTMLFlipBook
                                    width={pageWidth}
                                    height={pageHeight}
                                    size="fixed"
                                    minWidth={300}
                                    maxWidth={1000}
                                    minHeight={400}
                                    maxHeight={1414} // A4 ratio
                                    maxShadowOpacity={0.5}
                                    showCover={true}
                                    mobileScrollSupport={true}
                                    className="shadow-2xl"
                                    ref={bookRef}
                                    onFlip={(e) => setCurrentPage(e.data)}
                                    // Hack to fix react-pageflip ts errors
                                    style={{ margin: '0 auto' }} 
                                    startPage={0}
                                    drawShadow={true}
                                    flippingTime={1000}
                                    usePortrait={false}
                                    startZIndex={0}
                                    autoSize={true}
                                    clickEventForward={true}
                                    useMouseEvents={true}
                                    swipeDistance={30}
                                    showPageCorners={true}
                                    disableFlipByClick={false}
                                >
                                    {/* Pages generator */}
                                    {Array.from(new Array(numPages), (el, index) => {
                                        const PageComponent = index === 0 || index === numPages - 1 ? PageCover : PageInner;
                                        return (
                                            <PageComponent key={`page_${index + 1}`}>
                                                 <Page 
                                                    pageNumber={index + 1} 
                                                    width={pageWidth}
                                                    renderTextLayer={false}
                                                    renderAnnotationLayer={false}
                                                 />
                                            </PageComponent>
                                        );
                                    })}
                                </HTMLFlipBook>
                            </Document>
                        </TransformComponent>

                        {/* Floating Controls */}
                        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-dark/90 backdrop-blur-md text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-6 z-50 border border-white/10">
                             {/* Navigation */}
                             <div className="flex items-center gap-2 border-r border-white/20 pr-4">
                                <button onClick={handlePrev} className="hover:text-warm transition-colors disabled:opacity-30" disabled={currentPage === 0}>
                                    <ChevronLeft size={24} />
                                </button>
                                <span className="font-mono text-sm w-16 text-center">
                                    {currentPage} / {numPages - 1}
                                </span>
                                <button onClick={handleNext} className="hover:text-warm transition-colors disabled:opacity-30" disabled={currentPage >= numPages - 1}>
                                    <ChevronRight size={24} />
                                </button>
                             </div>

                             {/* Zoom */}
                             <div className="flex items-center gap-4">
                                <button onClick={() => zoomOut()} className="hover:text-warm transition-colors">
                                    <ZoomOut size={20} />
                                </button>
                                <button onClick={() => zoomIn()} className="hover:text-warm transition-colors">
                                    <ZoomIn size={20} />
                                </button>
                             </div>

                             {/* Fullscreen */}
                             <div className="pl-4 border-l border-white/20">
                                <button onClick={toggleFullScreen} className="hover:text-warm transition-colors">
                                    {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                                </button>
                             </div>
                        </div>
                    </>
                )}
             </TransformWrapper>
        </div>
    </div>
  );
};

export default FlipbookViewer;