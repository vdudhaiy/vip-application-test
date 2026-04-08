import React, { ReactNode, useRef, useEffect } from "react";

interface StatAnalysisPageTemplateProps {
  title: string;
  children?: ReactNode;
}

const StatAnalysisPageTemplate: React.FC<StatAnalysisPageTemplateProps> = ({
  title,
  children
}) => {
  const contentRef = useRef<HTMLDivElement>(null);

  // Trigger layout recalculation on zoom or resize to ensure scrollbars update properly
  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      // Force a reflow to recalculate scrollbars
      if (contentRef.current) {
        contentRef.current.style.overflow = "hidden";
        // Trigger reflow
        void contentRef.current.offsetHeight;
        contentRef.current.style.overflow = "auto";
      }
    });

    if (contentRef.current) {
      resizeObserver.observe(contentRef.current);
    }

    // Also listen for resize events to handle zoom
    const handleZoom = () => {
      if (contentRef.current) {
        contentRef.current.style.overflow = "hidden";
        void contentRef.current.offsetHeight;
        contentRef.current.style.overflow = "auto";
      }
    };
    
    window.addEventListener("resize", handleZoom);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleZoom);
    };
  }, []);

  return (
    <div id="stat-analysis-page-template" style={{ 
      display: "flex", 
      height: "100vh", 
      backgroundColor: "#1e1e1e",
      color: "#ffffff",
      boxSizing: "border-box",
      minHeight: 0,
    }}>
      <div
        ref={contentRef}
        style={{ 
          textAlign: "center", 
          flex: 1, 
          padding: "20px", 
          backgroundColor: "#1e1e1e", 
          color: "white",
          overflow: "auto",
          minHeight: 0,
          minWidth: 0,
        }}
      > 
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
};

export default StatAnalysisPageTemplate;