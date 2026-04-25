import { renderPwaIcon } from '@/lib/pwa-icon';

export const runtime = 'nodejs';

export async function GET() {
  return renderPwaIcon(180);
}
