'use client'

import Link from 'next/link'
import Image from 'next/image'

export default function Nav({ variant = 'public', children }) {
  return (
    <nav className="glass-nav px-6 py-3 flex items-center justify-between sticky top-0 z-50">
      <Link href={variant === 'team' ? '/team' : '/'} className="font-heading text-lg font-bold text-text-primary flex items-center gap-2.5">
        <Image src="/shepherd-logo.png" alt="Shepherd Church" width={32} height={32} className="rounded" />
        <span className="hidden sm:inline">Shepherd Church</span>
      </Link>
      <div className="flex gap-4 items-center">
        {children}
      </div>
    </nav>
  )
}
