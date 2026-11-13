import Link from 'next/link'
import { ArrowLeft, ShieldX } from 'lucide-react'

export default function ForbiddenPage() {
  return <main className="forbidden-page"><div className="forbidden-icon"><ShieldX size={26} /></div><span>403 · ACCESS RESTRICTED</span><h1>This space isn’t part of your role.</h1><p>Each Northstar workspace is tailored to its role. Head back to your own workspace to keep going.</p><Link href="/login"><ArrowLeft size={15} /> Return to sign in</Link></main>
}
