'use client'

import Link from 'next/link'
import { setNavigationTarget } from '@/contexts/LoadingContext'
import { ComponentProps, MouseEvent } from 'react'

type NavLinkProps = ComponentProps<typeof Link>

export default function NavLink({ href, onClick, ...props }: NavLinkProps) {
  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    // Set the target URL for the loading overlay
    const targetUrl = typeof href === 'string' ? href : href.pathname || ''
    setNavigationTarget(targetUrl)
    onClick?.(e)
  }

  return <Link href={href} {...props} onClick={handleClick} />
}
