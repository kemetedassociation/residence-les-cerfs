import '@fontsource/jost/300.css';
import '@fontsource/jost/400.css';
import '@fontsource/jost/500.css';
import '@fontsource/cormorant-garamond/300-italic.css';
import '@fontsource/cormorant-garamond/400-italic.css';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { initScroll } from './lib/scroll.js';
import './styles/base.css';
import './styles/tour.css';
import './styles/sections.css';
import './styles/booking.css';

history.scrollRestoration = 'manual';
window.scrollTo(0, 0);
initScroll();
createRoot(document.getElementById('root')).render(<App />);
