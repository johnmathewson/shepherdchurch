import Link from 'next/link'

const variants = {
  primary: 'bg-sage hover:bg-sage-dark text-white shadow-lg shadow-sage/20',
  secondary: 'border border-border hover:border-sage text-text-secondary hover:text-text-primary',
  ghost: 'text-text-secondary hover:text-text-primary',
  team: 'bg-purple hover:bg-purple-light text-white shadow-lg shadow-purple/20',
}

export default function Button({ variant = 'primary', href, className = '', children, ...props }) {
  const classes = `inline-flex items-center justify-center px-6 py-3 font-heading font-semibold rounded-lg transition-all disabled:opacity-50 ${variants[variant]} ${className}`

  if (href) {
    return <Link href={href} className={classes} {...props}>{children}</Link>
  }

  return <button className={classes} {...props}>{children}</button>
}
