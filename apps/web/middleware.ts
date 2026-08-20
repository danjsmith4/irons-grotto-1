import { auth } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  const session = await auth();

  if (
    request.nextUrl.pathname.startsWith('/rank-calculator') ||
    request.nextUrl.pathname.startsWith('/dashboard') ||
    // Signing in is only the first gate on /admin — the page itself checks the
    // staff ladder, which the session's Discord permissions know nothing about.
    request.nextUrl.pathname.startsWith('/admin')
  ) {
    if (!session?.user?.id) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}
