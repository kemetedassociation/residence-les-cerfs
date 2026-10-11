import '@fontsource/jost/300.css';
import '@fontsource/jost/400.css';
import '@fontsource/jost/500.css';
import { createRoot } from 'react-dom/client';
import AdminApp from './AdminApp.jsx';
import '../styles/base.css';
import '../styles/admin.css';

createRoot(document.getElementById('root')).render(<AdminApp />);
