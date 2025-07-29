import { signOut } from '@/auth';
import { NextResponse } from 'next/server';

export async function GET() {
    // Call the server-side signOut function
    await signOut();
    // Redirect to homepage or login page after sign out
    return NextResponse.redirect('/');
}
