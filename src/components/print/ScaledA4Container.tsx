import React, { useEffect, useRef, useState } from 'react';

interface ScaledA4ContainerProps {
  children: React.ReactNode;
  paperWidthPx?: number;
}

export const ScaledA4Container: React.FC<ScaledA4ContainerProps> = ({
  children,
  paperWidthPx = 794, // 210mm at 96dpi
}) => {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [innerHeight, setInnerHeight] = useState<number | null>(null);

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    const updateMetrics = () => {
      const availW = outer.clientWidth;
      if (availW > 0) {
        const nextScale = Math.min(1, availW / paperWidthPx);
        setScale(nextScale);
      }
      setInnerHeight(inner.scrollHeight);
    };

    updateMetrics();

    const ro = new ResizeObserver(() => updateMetrics());
    ro.observe(outer);
    ro.observe(inner);

    return () => ro.disconnect();
  }, [paperWidthPx, children]);

  return (
    <div
      ref={outerRef}
      className="w-full overflow-hidden"
      style={
        innerHeight !== null
          ? { height: `${Math.ceil(innerHeight * scale)}px` }
          : undefined
      }
    >
      <div
        ref={innerRef}
        style={{
          width: `${paperWidthPx}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        {children}
      </div>
    </div>
  );
};
