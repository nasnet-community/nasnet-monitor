interface NetworkHeroProps {
  deviceCount: number
  active?: boolean
}

export function NetworkHero({ deviceCount, active = false }: NetworkHeroProps) {
  return (
    <div className="relative flex h-[230px] items-center justify-center overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(58% 50% at 50% 38%, rgba(255,255,255,0.10), transparent 70%)',
        }}
      />

      <div className="animate-nas-float relative -translate-y-3" style={{ perspective: '820px' }}>
        <div className="absolute left-1/2 top-[80%] h-7 w-[150px] -translate-x-1/2 rounded-[50%] bg-black/45 blur-2xl" />

        <div
          aria-hidden="true"
          className="rounded-[16px]"
          style={{
            width: 148,
            height: 186,
            transform: 'rotateX(54deg) rotateZ(-34deg)',
            transformStyle: 'preserve-3d',
            background: 'linear-gradient(135deg, #ffffff 0%, #f2f2f4 52%, #d7d7dc 100%)',
            boxShadow: '0 26px 44px -8px rgba(0,0,0,0.6), inset 0 1px 2px rgba(255,255,255,0.9)',
          }}
        />
      </div>

      {active && deviceCount > 0 && (
        <div className="absolute bottom-3 left-1/2 flex max-w-[220px] -translate-x-1/2 flex-wrap justify-center gap-2">
          {Array.from({ length: deviceCount }).map((_, i) => (
            <span
              key={i}
              className="animate-nas-dot h-2 w-2 rounded-full bg-white"
              style={{ animationDelay: `${(i % 6) * 0.2}s`, boxShadow: '0 0 8px 2px rgba(255,255,255,0.7)' }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
