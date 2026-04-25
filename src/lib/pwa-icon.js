import { ImageResponse } from 'next/og';

export function renderPwaIcon(size) {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background:
            'radial-gradient(circle at top, #312e81 0%, #18181b 48%, #09090b 100%)',
          color: '#f4f4f5',
          fontSize: size * 0.34,
          fontWeight: 800,
          letterSpacing: size * 0.04,
          borderRadius: size * 0.22,
          border: `${Math.max(4, Math.round(size * 0.035))}px solid rgba(244, 244, 245, 0.12)`,
        }}
      >
        TF
      </div>
    ),
    {
      width: size,
      height: size,
    }
  );
}
