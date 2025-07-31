import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { machineId } = body;

        const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/servo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'off',
                position: 0,
                machineId
            })
        });

        const data = await response.json();
        return NextResponse.json(data);

    } catch {
        return NextResponse.json(
            { error: 'Failed to turn servo off' },
            { status: 500 }
        );
    }
}