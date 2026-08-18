'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function BingoPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(ellipse at center, rgb(var(--ig-surface-2)) 0%, rgb(var(--ig-bg)) 70%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'rgb(var(--ig-text))',
        padding: '2rem',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          textAlign: 'center',
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.75rem',
        }}
      >
        <Image src="/L1.png" alt="Irons Grotto Logo" width={180} height={180} />

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <h1
            style={{
              fontFamily: 'var(--font-display), ui-sans-serif, system-ui',
              fontSize: 'clamp(2.5rem, 8vw, 5rem)',
              fontWeight: 600,
              letterSpacing: '-0.01em',
              color: 'rgb(var(--ig-text))',
              margin: 0,
            }}
          >
            Bingo Events
          </h1>

          <span
            style={{
              fontFamily: 'var(--font-mono), ui-monospace, monospace',
              fontSize: '0.8125rem',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'rgb(var(--ig-secondary))',
            }}
          >
            Coming soon
          </span>

          <p
            style={{
              fontSize: '1.05rem',
              color: 'rgb(var(--ig-text-muted))',
              maxWidth: '560px',
              lineHeight: '1.6',
              margin: '0.25rem 0 0',
            }}
          >
            We&apos;re crafting an exciting bingo experience for the Irons Grotto
            community. Stay tuned for challenges, rewards, and clan-wide
            competitions.
          </p>
        </div>

        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '0.8rem 1.6rem',
            fontSize: '0.95rem',
            fontWeight: 600,
            color: 'rgb(var(--ig-on-accent))',
            background: 'rgb(var(--ig-secondary))',
            border: 'none',
            borderRadius: '10px',
            textDecoration: 'none',
          }}
        >
          Return to Grotto
        </Link>
      </div>
    </div>
  );
}
