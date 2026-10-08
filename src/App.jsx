import { useEffect, useMemo, useState } from 'react';
import Loader from './components/Loader.jsx';
import Header from './components/Header.jsx';
import CustomCursor from './components/CustomCursor.jsx';
import Tour, { firstAssets } from './engine/Tour.jsx';
import Apartment from './sections/Apartment.jsx';
import Experience from './sections/Experience.jsx';
import Chatel from './sections/Chatel.jsx';
import Booking from './sections/Booking.jsx';
import Footer from './sections/Footer.jsx';
import BookingDrawer from './components/booking/BookingDrawer.jsx';
import { useParallax, useReveal } from './animations/reveal.js';
import { lockScroll } from './lib/scroll.js';

export default function App() {
  const [ready, setReady] = useState(false);
  const assets = useMemo(() => firstAssets(), []);
  useReveal();
  useParallax();
  // no scrolling (= no navigating) until the loader is gone
  useEffect(() => lockScroll(!ready), [ready]);

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
      <BookingDrawer />
    </>
  );
}
