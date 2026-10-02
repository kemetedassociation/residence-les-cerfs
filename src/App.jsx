import { useMemo, useState } from 'react';
import Loader from './components/Loader.jsx';
import Header from './components/Header.jsx';
import CustomCursor from './components/CustomCursor.jsx';
import Tour, { firstAssets } from './engine/Tour.jsx';
import Apartment from './sections/Apartment.jsx';
import Experience from './sections/Experience.jsx';
import Chatel from './sections/Chatel.jsx';
import Booking from './sections/Booking.jsx';
import Footer from './sections/Footer.jsx';
import { useParallax, useReveal } from './animations/reveal.js';

export default function App() {
  const [ready, setReady] = useState(false);
  const assets = useMemo(() => firstAssets(), []);
  useReveal();
  useParallax();

  return (
    <>
      {!ready && <Loader assets={assets} onDone={() => setReady(true)} />}
      <CustomCursor />
      <Header />
      <main>
        <Tour ready={ready} />
        <Apartment />
        <Experience />
        <Chatel />
        <Booking />
      </main>
      <Footer />
    </>
  );
}
