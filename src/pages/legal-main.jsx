import '@fontsource/jost/300.css';
import '@fontsource/jost/400.css';
import '@fontsource/jost/500.css';
import { createRoot } from 'react-dom/client';
import LegalPage from './LegalPage.jsx';
import '../styles/base.css';
import '../styles/legal.css';

const page = document.getElementById('root').dataset.page;
createRoot(document.getElementById('root')).render(<LegalPage page={page} />);
