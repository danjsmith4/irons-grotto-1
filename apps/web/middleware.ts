import { auth } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  const session = await auth();

  if (
    request.nextUrl.pathname.startsWith('/player') ||
    request.nextUrl.pathname.startsWith('/submissions') ||
    // Onboarding writes a player row against the signed-in Discord account, so
    // it needs a session just as much as the calculator it hands off to.
    request.nextUrl.pathname.startsWith('/join') ||
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
