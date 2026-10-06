import { NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');
  
  if (!q) return NextResponse.json([]);

  try {
    const results = await yahooFinance.search(q);
    return NextResponse.json((results as any).quotes || []);
  } catch (error) {
    console.error("Error searching via yahoo-finance2", error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
