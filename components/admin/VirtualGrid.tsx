import React from 'react';

type VirtualGridProps<T> = {
  items: T[];
  itemKey: (item: T, index: number) => React.Key;
  renderItem: (item: T, index: number) => React.ReactNode;
  rowHeight: number; // px, estimated/fixed
  gap?: number; // px between items
  overscanRows?: number;
};

export default function VirtualGrid<T>({ items, itemKey, renderItem, rowHeight, gap = 16, overscanRows = 2 }: VirtualGridProps<T>) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = React.useState<number>(0);
  const [viewportH, setViewportH] = React.useState<number>(0);
  const [scrollY, setScrollY] = React.useState<number>(0);
  const [containerTop, setContainerTop] = React.useState<number>(0);

  // Measure width via ResizeObserver
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setWidth(el.clientWidth || 0);
      const rect = el.getBoundingClientRect();
      setContainerTop(rect.top + window.scrollY);
    });
    ro.observe(el);
    setWidth(el.clientWidth || 0);
    const rect = el.getBoundingClientRect();
    setContainerTop(rect.top + window.scrollY);
    return () => ro.disconnect();
  }, []);

  // Track viewport height and window scroll
  React.useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY || 0);
    const onResize = () => setViewportH(window.innerHeight || 0);
    onResize();
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  // Responsive columns similar to SimpleGrid: base 1, sm 2, lg 3
  const columns = React.useMemo(() => {
    if (width >= 992) return 3;
    if (width >= 640) return 2;
    return 1;
  }, [width]);

  const rowCount = Math.max(1, Math.ceil(items.length / Math.max(1, columns)));
  const totalHeight = rowCount * rowHeight + Math.max(0, rowCount - 1) * gap;

  const relScrollTop = Math.max(0, scrollY - containerTop);
  const startRow = Math.max(0, Math.floor(relScrollTop / (rowHeight + gap)) - overscanRows);
  const endRow = Math.min(rowCount - 1, Math.ceil((relScrollTop + viewportH) / (rowHeight + gap)) + overscanRows);
  const startIndex = startRow * columns;
  const endIndex = Math.min(items.length, (endRow + 1) * columns);
  const offsetY = startRow * (rowHeight + gap);

  const slice = items.slice(startIndex, endIndex);

  return (
    <div ref={containerRef} style={{ position: 'relative', height: totalHeight }}>
      <div
        style={{
          position: 'absolute',
          insetInlineStart: 0,
          insetBlockStart: 0,
          transform: `translateY(${offsetY}px)`,
          width: '100%',
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          gap: `${gap}px`,
        }}
      >
        {slice.map((it, i) => {
          const idx = startIndex + i;
          return (
            <div key={itemKey(it, idx)} style={{ minHeight: rowHeight }}>
              {renderItem(it, idx)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

