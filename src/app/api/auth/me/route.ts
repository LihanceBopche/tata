import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;

        if (!token) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        return NextResponse.json({ user: decoded }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
}
