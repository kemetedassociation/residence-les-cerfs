// Fine line icons (stroke = currentColor)
const PATHS = {
  arrow: 'M4 12h15M13 6l6 6-6 6',
  arrowLeft: 'M20 12H5M11 6l-6 6 6 6',
  chevron: 'M9 6l6 6-6 6',
  down: 'M12 5v13M6 12l6 6 6-6',
  close: 'M6 6l12 12M18 6L6 18',
  plus: 'M12 5v14M5 12h14',
  sofa: 'M4 11V8.5A2.5 2.5 0 0 1 6.5 6h11A2.5 2.5 0 0 1 20 8.5V11M2.5 12.5A1.5 1.5 0 0 1 5.5 12.5V14h13v-1.5a1.5 1.5 0 0 1 3 0V17H2.5zM5 17v2M19 17v2',
  bed: 'M3 18V6M3 13h18v5M21 18v-5a3 3 0 0 0-3-3h-7v3M6.5 10.5a1.5 1.5 0 1 0 0 .01',
  shower: 'M5 21V7a4 4 0 0 1 8 0M9 7h8M10 10v1M13 10v1M16 10v1M11.5 13v1M14.5 13v1M13 16v1',
  bunk: 'M4 3v18M20 3v18M4 7h16M4 10h16M4 15h16M4 18h16M8 4.5h4',
  dining: 'M7 3v7a2 2 0 0 0 4 0V3M9 3v18M17 21V3c-2 1-3 4-3 7s1 3 3 3',
  ski: 'M14 4.5a1.5 1.5 0 1 0 0 .01M3 20l18-6M8 13l3-5 4 2 2 3M11 8l-2 6 4 2',
  hike: 'M13 4.5a1.5 1.5 0 1 0 0 .01M10 21l2-6 3 3v3M8 12l2-4h3l2 4 2 1M18 10v11',
  village: 'M3 21h18M5 21V11l7-6 7 6v10M10 21v-5h4v5M12 5V2',
  tree: 'M12 2l5 7h-3l4 6h-4l3 4H7l3-4H6l4-6H7zM12 19v3',
  fork: 'M7 3v7a2 2 0 0 0 4 0V3M9 3v18M17 21V3c-2 1-3 4-3 7s1 3 3 3',
  leaf: 'M5 19C5 10 10 5 20 4c-1 10-6 15-15 15zM5 19l8-8',
};

export default function Icon({ name, size = 24, stroke = 1.2, className = '' }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}
