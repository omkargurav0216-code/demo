import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowRight, Bookmark, CalendarDays, ChevronRight, Clapperboard, MapPin, Play, Search, Ticket, UserRound } from 'lucide-react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const movies = [
  { title: 'Dune: Part Two', genre: 'SCI-FI · ADVENTURE', rating: '8.8', year: '2024', art: 'dune', tag: 'IMAX EXPERIENCE', description: 'The future is written in the sand.' },
  { title: 'The Batman', genre: 'ACTION · CRIME', rating: '8.1', year: '2022', art: 'batman', tag: 'DARK & GRITTY', description: 'Unmask the truth.' },
  { title: 'Interstellar', genre: 'SCI-FI · DRAMA', rating: '8.7', year: '2014', art: 'interstellar', tag: 'FAN FAVOURITE', description: 'Mankind was born on Earth. It was never meant to die here.' },
  { title: 'Oppenheimer', genre: 'DRAMA · HISTORY', rating: '8.3', year: '2023', art: 'oppenheimer', tag: 'AWARD WINNER', description: 'The world forever changes.' },
]
const upcoming = [
  { title: 'Beyond the Blue', date: 'COMING NOV 14', art: 'blue' },
  { title: 'The Last Signal', date: 'COMING NOV 21', art: 'signal' },
  { title: 'Neon Horizon', date: 'COMING DEC 05', art: 'neon' },
]

function MovieCard({ movie, upcomingMovie = false }) {
  return (
    <article className={`movie-card ${upcomingMovie ? 'upcoming-card' : ''}`}>
      <div className={`poster-art art-${movie.art}`}>
        <div className="poster-grain" />
        <span className="poster-kicker">{movie.tag || 'COMING SOON'}</span>
        <div className="poster-title">{movie.title}</div>
        <span className="poster-bottom">{movie.year || movie.date}</span>
        {!upcomingMovie && <button className="poster-play" aria-label={`Preview ${movie.title}`} onClick={() => window.alert(`Preview for ${movie.title} — demo interaction.`)}><Play size={16} fill="currentColor" /></button>}
      </div>
      <div className="movie-card-info">
        <div>
          <h3>{movie.title}</h3>
          <p>{upcomingMovie ? movie.date : movie.genre}</p>
        </div>
        {!upcomingMovie && <span className="rating">★ {movie.rating}</span>}
      </div>
    </article>
  )
}

function HomePage() {
  const [saved, setSaved] = useState(false)
  const [query, setQuery] = useState('')
  const filtered = movies.filter(m => m.title.toLowerCase().includes(query.toLowerCase()))
  return (
    <main className="home-page" id="home">
      <nav className="nav-shell">
        <a className="wordmark" href="#home" aria-label="MovieLanche home"><span className="logo-mark"><Clapperboard size={19} /></span>MOVIE<span>LANCHE</span></a>
        <div className="nav-links"><a className="active" href="#home">Home</a><a href="#now-showing">Movies</a><a href="#cinemas">Cinemas</a><a href="#coming-soon">Coming Soon</a></div>
        <div className="nav-actions">
          <label className="search-box"><Search size={16} /><input aria-label="Search movies" placeholder="Find a movie" value={query} onChange={e => setQuery(e.target.value)} /></label>
          <button className="icon-button" aria-label="Saved movies" onClick={() => setSaved(!saved)}><Bookmark size={18} fill={saved ? 'currentColor' : 'none'} /></button>
          <button className="sign-in" onClick={() => window.alert('Sign in is a placeholder in this demo.')}>Sign in <UserRound size={15} /></button>
        </div>
      </nav>

      <section className="home-hero">
        <div className="hero-backdrop" />
        <div className="hero-orb orb-one" /><div className="hero-orb orb-two" />
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-line" /> THE BIG SCREEN, REIMAGINED</div>
          <h1>Stories worth<br /><em>stepping into.</em></h1>
          <p>Find your next obsession. From edge-of-your-seat premieres to the stories that stay with you long after the credits roll.</p>
          <div className="hero-meta"><span>✦ CURATED FOR YOU</span><span className="meta-dot" /><span>NEW EXPERIENCES WEEKLY</span></div>
          <div className="hero-buttons"><a href="#now-showing" className="button-primary">Explore movies <ArrowRight size={17} /></a><button className="button-ghost" onClick={() => window.alert('Trailer playback is a demo placeholder.')}><Play size={15} /> Watch trailer</button></div>
        </div>
        <div className="hero-feature-card"><span className="feature-label">YOUR NEXT MOVIE NIGHT</span><div className="feature-icon"><Ticket size={20} /></div><strong>Make it a moment.</strong><span>Great stories. Better seats.</span><a href="#now-showing">Find a film <ChevronRight size={14} /></a></div>
        <div className="hero-index"><span>01</span><i /><span>04</span></div>
      </section>

      <section className="section movie-section" id="now-showing">
        <div className="section-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> THE LINEUP</div><h2>Now <em>showing.</em></h2><p>Big-screen stories. Handpicked for your next night out.</p></div><a className="text-link" href="#now-showing">View all films <ArrowRight size={16} /></a></div>
        {filtered.length ? <div className="movie-grid">{filtered.map(movie => <MovieCard key={movie.title} movie={movie} />)}</div> : <div className="empty-state">No demo movies match “{query}”. Try another title.</div>}
      </section>

      <section className="midnight-banner" id="cinemas">
        <div className="banner-glow" /><div className="banner-content"><span className="eyebrow"><span className="eyebrow-line" /> MORE THAN A MOVIE</span><h2>Make room for<br /><em>the extraordinary.</em></h2><p>Sound that surrounds you. Screens that pull you in. Moments that deserve the big screen.</p><button className="button-primary" onClick={() => window.alert('Cinema discovery is a demo placeholder.')}>Discover the experience <ArrowRight size={17} /></button></div><div className="banner-stamp"><Clapperboard size={29} /><span>YOUR SEAT<br />IS WAITING</span></div>
      </section>

      <section className="section coming-section" id="coming-soon">
        <div className="section-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> ON THE HORIZON</div><h2>Coming <em>soon.</em></h2><p>Keep these dates open. Something special is on its way.</p></div><span className="calendar-note"><CalendarDays size={16} /> YOUR WATCHLIST STARTS HERE</span></div>
        <div className="upcoming-grid">{upcoming.map(movie => <MovieCard key={movie.title} movie={movie} upcomingMovie />)}</div>
      </section>

      <footer className="footer"><a className="wordmark" href="#home"><span className="logo-mark"><Clapperboard size={18} /></span>MOVIE<span>LANCHE</span></a><p>For the love of the big screen.</p><div className="footer-links"><a href="#home">Home</a><a href="#now-showing">Movies</a><a href="#cinemas">Cinemas</a><a href="#coming-soon">Coming soon</a></div><small>© 2026 MOVIELANCHE. MADE FOR MOVIE PEOPLE.</small></footer>
    </main>
  )
}

function CinematicIntro({ homePageRef }) {
  const sectionRef = useRef(null)
  const sceneRef = useRef(null)
  const imageRef = useRef(null)
  const screenGlowRef = useRef(null)
  const indicatorRef = useRef(null)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(media.matches)
    const onChange = e => setReducedMotion(e.matches)
    media.addEventListener?.('change', onChange)
    return () => media.removeEventListener?.('change', onChange)
  }, [])

  useEffect(() => {
    const section = sectionRef.current
    const scene = sceneRef.current
    const image = imageRef.current
    const glow = screenGlowRef.current
    const indicator = indicatorRef.current
    const homePage = homePageRef?.current
    if (!section || !scene || !image || !glow || !homePage) return

    // Keep the homepage layered behind the theatre at viewport center during the intro.
    // At the end of the pinned sequence, hand it back to normal document flow without a vertical entrance.
    const showHomeInDocumentFlow = () => {
      const top = window.scrollY
      homePage.style.position = 'absolute'
      homePage.style.top = `${top}px`
      homePage.style.left = '0'
      homePage.style.right = '0'
      homePage.style.width = '100%'
      homePage.style.zIndex = '0'
      homePage.style.pointerEvents = 'auto'
    }
    const keepHomeCenteredBehindScene = () => {
      homePage.style.position = 'fixed'
      homePage.style.top = '0'
      homePage.style.left = '0'
      homePage.style.right = '0'
      homePage.style.width = '100%'
      homePage.style.zIndex = '0'
      homePage.style.pointerEvents = 'none'
    }

    const ctx = gsap.context(() => {
      if (reducedMotion) {
        gsap.set(scene, { autoAlpha: 0 })
        gsap.set(homePage, { autoAlpha: 1, clearProps: 'transform,filter,pointerEvents' })
        return
      }
      // Keep the homepage fully hidden until the theatre screen has expanded past the viewport.
      keepHomeCenteredBehindScene()
      gsap.set(homePage, {
        autoAlpha: 0,
        scale: 0.985,
        filter: 'blur(12px)',
        transformOrigin: '50% 50%',
        pointerEvents: 'none',
      })
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: '+=3800',
          scrub: 0.7,
          // Pin the whole section so its scroll spacer reliably holds the homepage below the scene.
          pin: section,
          pinSpacing: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onLeave: showHomeInDocumentFlow,
          onEnterBack: keepHomeCenteredBehindScene,
        },
      })
      tl.to(indicator, { autoAlpha: 0, y: 18, duration: 0.12 }, 0)
        .to(image, { scale: 1.16, duration: 0.20, transformOrigin: '50% 42%' }, 0)
        .to(image, { scale: 1.48, duration: 0.24, transformOrigin: '50% 42%' }, 0.20)
        .to(image, { scale: 3.35, duration: 0.39, transformOrigin: '50% 42%' }, 0.44)
        .to(glow, { opacity: 0.92, scale: 1.12, duration: 0.10 }, 0.78)
        // Hold the screen-filling moment, then dissolve the theatre and reveal the homepage from its center.
        .to(glow, { opacity: 0, duration: 0.08 }, 0.88)
        .to(scene, { autoAlpha: 0, duration: 0.08 }, 0.92)
        .to(homePage, {
          autoAlpha: 1,
          scale: 1,
          filter: 'blur(0px)',
          duration: 0.08,
          ease: 'power2.out',
          onStart: () => { homePage.style.pointerEvents = 'auto' },
          onReverseComplete: () => { homePage.style.pointerEvents = 'none' },
        }, 0.92)
    }, section)
    const refresh = () => ScrollTrigger.refresh()
    window.addEventListener('load', refresh, { once: true })
    const resizeObserver = new ResizeObserver(() => ScrollTrigger.refresh())
    resizeObserver.observe(section)
    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('load', refresh)
      ctx.revert()
      gsap.set(homePage, { clearProps: 'position,top,left,right,width,zIndex,pointerEvents,opacity,visibility,transform,filter' })
    }
  }, [reducedMotion, homePageRef])

  return (
    <section className={`cinematic-section ${reducedMotion ? 'motion-reduced' : ''}`} ref={sectionRef} aria-label="Cinematic entrance">
      <div className="cinematic-scene" ref={sceneRef}>
        <div className="scene-vignette" />
        <img ref={imageRef} className="theatre-image" src="/images/movielanche-theatre.png" alt="A modern cinema auditorium with a glowing blue MOVIELANCHE screen" fetchPriority="high" />
        <div className="scene-grain" />
        <div className="screen-entry-glow" ref={screenGlowRef} />
        <div className="intro-brand"><span className="intro-brand-line" /> A NEW WAY TO EXPERIENCE CINEMA <span className="intro-brand-line" /></div>
        <div className="scroll-cue" ref={indicatorRef}><span>SCROLL TO ENTER</span><div className="scroll-cue-icon"><ArrowDown size={15} /></div></div>
        {reducedMotion && <a className="reduced-enter" href="#home">Enter MovieLanche <ArrowRight size={16} /></a>}
      </div>
    </section>
  )
}

export default function App() {
  const homePageRef = useRef(null)
  return <><CinematicIntro homePageRef={homePageRef} /><div className="home-reveal" ref={homePageRef}><HomePage /></div></>
}