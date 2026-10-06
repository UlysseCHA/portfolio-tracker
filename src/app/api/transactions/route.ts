import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const dataFilePath = path.join(process.cwd(), 'data.json');

function initDataFile() {
  if (!fs.existsSync(dataFilePath)) {
    fs.writeFileSync(dataFilePath, JSON.stringify([]));
  }
}

function getTransactions() {
  initDataFile();
  return JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));
}

function saveTransactions(transactions: any[]) {
  fs.writeFileSync(dataFilePath, JSON.stringify(transactions, null, 2));
}

export async function GET() {
  return NextResponse.json(getTransactions());
}

export async function POST(request: Request) {
  const transaction = await request.json();
  const transactions = getTransactions();
  
  transaction.id = Date.now().toString();
  transactions.push(transaction);
  
  saveTransactions(transactions);
  return NextResponse.json(transaction, { status: 201 });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  
  let transactions = getTransactions();
  transactions = transactions.filter((t: any) => t.id !== id);
  saveTransactions(transactions);
  
  return NextResponse.json({ success: true });
}

export async function PUT(request: Request) {
  const updatedTx = await request.json();
  let transactions = getTransactions();
  
  transactions = transactions.map((t: any) => t.id === updatedTx.id ? updatedTx : t);
  saveTransactions(transactions);
  
  return NextResponse.json(updatedTx);
}
