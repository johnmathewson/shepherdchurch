'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import Nav from '@/components/Nav'

export default function Home() {
  const heroRef = useRef(null)
  const sectionsRef = useRef([])

  useEffect(() => {
    function handleScroll() {
      const scrollY = window.scrollY

      if (heroRef.current) {
        // Parallax on background image — moves slower than scroll
        const bgImg = heroRef.current.querySelector('.hero-bg-image')
        if (bgImg) {
          bgImg.style.transform = `translateY(${scrollY * 0.35}px)`
        }

        // Fade and drift hero content as user scrolls
        const content = heroRef.current.querySelector('.hero-content')
        if (content) {
          const opacity = Math.max(0, 1 - scrollY / 600)
          const translate = scrollY * 0.2
          content.style.opacity = opacity
          content.style.transform = `translateY(${translate}px)`
        }
      }

      // Reveal sections on scroll
      sectionsRef.current.forEach((el) => {
        if (!el) return
        const rect = el.getBoundingClientRect()
        const windowHeight = window.innerHeight
        if (rect.top < windowHeight * 0.85) {
          el.classList.add('revealed')
        }
      })
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll() // initial check
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* Hero with worship background + parallax */}
      <div ref={heroRef} className="hero-bg min-h-screen flex flex-col">
        {/* Background image + overlay */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/worship-bg.jpg" alt="" className="hero-bg-image" />
        <div className="hero-overlay" />

        <Nav>
          <Link href="/dashboard" className="text-text-secondary hover:text-text-primary transition-colors text-sm">
            My Dashboard
          </Link>
          <Link href="/team/login" className="text-text-secondary hover:text-text-primary transition-colors text-sm">
            Prayer Team
          </Link>
        </Nav>

        <main className="flex-1 flex flex-col items-center justify-center px-6 py-28 pb-36 hero-content">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="font-heading text-5xl md:text-7xl font-extrabold leading-tight mb-6 tracking-tight">
              Shepherd Church <br />
              <span className="text-sage">Prayer Wall</span>
            </h1>
            <p className="text-text-secondary text-lg md:text-xl leading-relaxed mb-10 max-w-2xl mx-auto">
              Share your prayer request with our dedicated team of intercessors.
              Your identity stays private while our team lifts your needs before God.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/submit"
                className="inline-flex items-center justify-center px-8 py-4 bg-sage hover:bg-sage-dark text-white font-heading font-semibold rounded-lg transition-all hover:scale-[1.02] shadow-lg shadow-sage/25"
              >
                Submit a Prayer Request
                <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center px-8 py-4 glass hover:border-sage text-text-secondary hover:text-text-primary font-heading font-semibold rounded-lg transition-all"
              >
                View My Dashboard
              </Link>
            </div>

            {/* Day/Night announcement */}
            <Link
              href="/prayer-week"
              className="mt-10 inline-flex items-center gap-3 px-5 py-3 rounded-full glass border border-gold/30 hover:border-gold transition-all group"
            >
              <span className="text-gold uppercase tracking-[0.25em] text-[10px] font-bold">Day/Night</span>
              <span className="text-text-secondary text-sm group-hover:text-text-primary">May 17–23 · A 24/7 Prayer Initiative</span>
              <svg className="w-4 h-4 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce opacity-40">
            <svg className="w-6 h-6 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </main>
      </div>

      {/* How it works section */}
      <div className="page-bg">
        <div
          ref={el => sectionsRef.current[0] = el}
          className="scroll-reveal max-w-4xl mx-auto px-6 pt-28 pb-16 w-full"
        >
          <h2 className="font-heading text-3xl font-bold text-center mb-4 text-text-primary">
            How It Works
          </h2>
          <p className="text-text-secondary text-center mb-14 max-w-xl mx-auto">
            Three simple steps to connect with our prayer team
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                title: 'Share Your Request',
                description: 'Create an account, then describe what you need prayer for. Choose a category that fits.',
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                ),
              },
              {
                step: '02',
                title: 'Team Prays For You',
                description: "Our prayer team picks up your request anonymously and intercedes. You'll be notified when someone begins praying.",
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                ),
              },
              {
                step: '03',
                title: 'Receive Updates',
                description: 'Get notified with prophetic words, encouragement, and updates as the team prays over your request.',
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                ),
              },
            ].map((item, i) => (
              <div
                key={item.step}
                ref={el => sectionsRef.current[i + 1] = el}
                className="scroll-reveal glass rounded-lg p-6 transition-all group"
                style={{ transitionDelay: `${i * 120}ms` }}
              >
                <div className="text-sage/50 text-sm font-mono mb-4">{item.step}</div>
                <div className="text-sage mb-3 group-hover:text-sage-light transition-colors">{item.icon}</div>
                <h3 className="font-heading font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-text-secondary text-sm leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Categories — unified color */}
        <div
          ref={el => sectionsRef.current[4] = el}
          className="scroll-reveal max-w-4xl mx-auto px-6 pt-12 pb-16 w-full"
        >
          <h2 className="font-heading text-3xl font-bold text-center mb-4 text-text-primary">
            Prayer Categories
          </h2>
          <p className="text-text-secondary text-center mb-10 max-w-xl mx-auto">
            Whatever you're going through, we're here to pray
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: 'Spiritual', desc: 'Faith & growth', icon: '✦' },
              { name: 'Emotional', desc: 'Peace & healing', icon: '◇' },
              { name: 'Physical', desc: 'Health & strength', icon: '○' },
              { name: 'Other', desc: 'Life & guidance', icon: '△' },
            ].map((cat, i) => (
              <div
                key={cat.name}
                ref={el => sectionsRef.current[i + 5] = el}
                className="scroll-reveal glass rounded-lg p-5 text-center transition-all group cursor-default"
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <div className="text-sage/40 text-xl mb-2">{cat.icon}</div>
                <div className="font-heading font-semibold text-text-primary">{cat.name}</div>
                <div className="text-text-muted text-xs mt-1">{cat.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA section */}
        <div
          ref={el => sectionsRef.current[9] = el}
          className="scroll-reveal max-w-3xl mx-auto px-6 pt-12 pb-24 text-center"
        >
          <div className="glass-strong rounded-lg p-10 md:p-14">
            <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">
              Let us pray <span className="text-sage">with you</span>
            </h2>
            <p className="text-text-secondary mb-8 max-w-lg mx-auto">
              You don't have to carry it alone. Our prayer team is ready to intercede on your behalf.
            </p>
            <Link
              href="/submit"
              className="inline-flex items-center justify-center px-10 py-4 bg-sage hover:bg-sage-dark text-white font-heading font-semibold rounded-lg transition-all hover:scale-[1.02] shadow-lg shadow-sage/25 text-lg"
            >
              Submit a Prayer Request
              <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-border/30 py-8 px-6 text-center text-text-muted text-sm">
          <p>Shepherd Church Prayer Ministry</p>
          <p className="mt-1">Your requests are handled with care and confidentiality.</p>
        </footer>
      </div>
    </div>
  )
}
