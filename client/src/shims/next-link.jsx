import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
export default function Link({ href, children, ...rest }) {
    if (!href || href.startsWith('#') || href.startsWith('http://') || href.startsWith('https://')) {
        return (<a href={href} {...rest}>
        {children}
      </a>);
    }
    return (<RouterLink to={href} {...rest}>
      {children}
    </RouterLink>);
}
