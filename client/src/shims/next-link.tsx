import React from 'react'
import { Link as RouterLink } from 'react-router-dom'

export interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string
  children?: React.ReactNode
}

export default function Link({ href, children, ...rest }: LinkProps) {
  if (!href || href.startsWith('#') || href.startsWith('http://') || href.startsWith('https://')) {
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    )
  }
  return (
    <RouterLink to={href} {...rest}>
      {children}
    </RouterLink>
  )
}
