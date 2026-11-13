import Link from 'next/link'
import { ArrowLeft, SearchX } from 'lucide-react'

export default function NotFound() {
  return <main className="forbidden-page"><div className="forbidden-icon"><SearchX size={25} /></div><span>404 · PAGE NOT FOUND</span><h1>We couldn’t find that page.</h1><p>The link may have moved, or you may not have access to this part of the school workspace.</p><Link href="/"><ArrowLeft size={15} /> Back to Northstar</Link></main>
}
