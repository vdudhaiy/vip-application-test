import React, { ReactNode, useRef, useEffect } from "react";
import type { PlotResponse } from "./FilterOptions";

interface TransformationPageTemplateProps {
  title: string;
  children?: ReactNode;
  onFilterUpdate?: (data: PlotResponse) => void;
}

const TransformationPageTemplate: React.FC<TransformationPageTemplateProps> = ({
  title,
  children
}) => {
  const contentRef = useRef<HTMLDivElement>(null);

  // Trigger layout recalculation on zoom or resize
  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      if (contentRef.current) {
        contentRef.current.style.overflow = "hidden";
        void contentRef.current.offsetHeight;
        contentRef.current.style.overflow = "auto";
      }
    });

    if (contentRef.current) {
      resizeObserver.observe(contentRef.current);
    }

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
    <div id="transformation-page-template" style={{ display: "flex", height: "100vh", backgroundColor: "#1e1e1e", overflow: "hidden", minHeight: 0 }}>
      <div ref={contentRef} style={{ textAlign: "center", flex: 1, padding: "20px", backgroundColor: "#1e1e1e", color:"white", overflow: "auto", overflowX: "hidden", minHeight: 0, minWidth: 0 }}> 
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
};

export default TransformationPageTemplate;