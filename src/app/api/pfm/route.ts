import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import PFMRecord from '@/models/PFMRecord';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

export async function GET() {
    try {
        await connectDB();

        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        jwt.verify(token, JWT_SECRET);

        const data = await PFMRecord.find({}).sort({ createdAt: 1 }).populate('createdBy', 'name email');
        return NextResponse.json({ data }, { status: 200 });
    } catch (error: any) {
        console.error('PFM GET Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        await connectDB();

        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const decoded: any = jwt.verify(token, JWT_SECRET);

        const body = await req.json();

        const newData = await PFMRecord.create({
            data: body,
            createdBy: decoded.userId
        });

        return NextResponse.json({ message: 'Data saved successfully', data: newData }, { status: 201 });
    } catch (error: any) {
        console.error('PFM POST Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
