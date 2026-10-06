import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

export const dynamic = 'force-dynamic';

const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

export async function GET() {
  try {
    const transactions = await redis.get('transactions');
    return NextResponse.json(transactions || []);
  } catch (err) {
    console.error("Error reading from Redis", err);
    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    let transactions: any[] = (await redis.get('transactions')) || [];
    transactions.push(data);
    await redis.set('transactions', transactions);
    return NextResponse.json({ success: true, transaction: data });
  } catch (err) {
    console.error("Error writing to Redis", err);
    return NextResponse.json({ error: 'Failed to write data' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

    let transactions: any[] = (await redis.get('transactions')) || [];
    transactions = transactions.filter(t => t.id !== id);
    await redis.set('transactions', transactions);
    
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to delete data' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json();
    let transactions: any[] = (await redis.get('transactions')) || [];
    const index = transactions.findIndex(t => t.id === data.id);
    if (index >= 0) {
      transactions[index] = data;
      await redis.set('transactions', transactions);
      return NextResponse.json({ success: true, transaction: data });
    }
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update data' }, { status: 500 });
  }
}
