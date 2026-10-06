"use client";

import { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownRight, TrendingUp } from "lucide-react";
import PortfolioChart from "@/components/PortfolioChart";
import Link from 'next/link';

export default function Home() {
  const [data, setData] = useState<any>({ portfolio: [], summary: { totalInvested: 0, currentValue: 0, totalGain: 0, totalGainPercent: 0 } });
  const [isLoading, setIsLoading] = useState(true);
  const [range, setRange] = useState('1mo');

  useEffect(() => {
    setIsLoading(true);
    fetch(`/api/portfolio?range=${range}`)
      .then(res => res.json())
      .then(d => {
        setData(d);
        setIsLoading(false);
      });
  }, [range]);

  const { portfolio, summary } = data;

  if (isLoading && !data.chartData) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Chargement de votre portefeuille...</div>;
  }

  const ranges = [
    { id: '1d', label: '1J' },
    { id: '5d', label: '5J' },
    { id: '1mo', label: '1M' },
    { id: '3mo', label: '3M' },
    { id: '6mo', label: '6M' },
    { id: '1y', label: '1A' },
  ];

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <TrendingUp className="text-white w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold">Mon Portefeuille d'Actions</h1>
          </div>
          <Link href="/admin" className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg font-medium transition">
            Gérer (Admin)
          </Link>
        </header>

        {/* Global Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500 font-medium">Valeur Totale (Actions)</p>
            <p className="text-3xl font-bold mt-2">{summary.currentValue.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</p>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500 font-medium">Capital Investi (Net)</p>
            <p className="text-3xl font-bold mt-2">{summary.totalInvested.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500 font-medium">Plus-Value / Moins-Value</p>
            <div className={`flex items-center space-x-2 mt-2 ${summary.totalGain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              <p className="text-3xl font-bold">
                {summary.totalGain >= 0 ? '+' : ''}{summary.totalGain.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
              </p>
              <div className={`flex items-center text-sm font-semibold px-2 py-1 rounded-full ${summary.totalGain >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                {summary.totalGain >= 0 ? <ArrowUpRight className="w-4 h-4 mr-1" /> : <ArrowDownRight className="w-4 h-4 mr-1" />}
                {summary.totalGainPercent.toFixed(2)}%
              </div>
            </div>
          </div>
        </div>

        {/* Portfolio Chart with Range Selectors */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">Évolution Globale</h2>
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
              {ranges.map(r => (
                <button
                  key={r.id}
                  onClick={() => setRange(r.id)}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition ${range === r.id ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          {isLoading && <div className="h-96 flex items-center justify-center text-gray-500">Chargement...</div>}
          {!isLoading && <PortfolioChart data={data.chartData} />}
        </div>

        {/* Portfolio Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="p-4 font-semibold text-gray-600">Action</th>
                  <th className="p-4 font-semibold text-gray-600 text-right">Qté</th>
                  <th className="p-4 font-semibold text-gray-600 text-right">PRU</th>
                  <th className="p-4 font-semibold text-gray-600 text-right">Prix Actuel</th>
                  <th className="p-4 font-semibold text-gray-600 text-right">Valeur Totale</th>
                  <th className="p-4 font-semibold text-gray-600 text-right">Performance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {portfolio.map((stock: any) => {
                  const isPositive = stock.gain >= 0;
                  const currencySymbol = stock.currency === 'USD' ? '$' : stock.currency === 'GBP' ? '£' : '€';

                  return (
                    <tr key={stock.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-gray-900">{stock.ticker}</div>
                        <div className="text-xs text-gray-500 truncate max-w-[150px]">{stock.name}</div>
                      </td>
                      <td className="p-4 text-right font-medium">{stock.shares}</td>
                      <td className="p-4 text-right">
                        {stock.entryPrice.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currencySymbol}
                      </td>
                      <td className="p-4 text-right font-medium">
                        {stock.currentPrice.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currencySymbol}
                      </td>
                      <td className="p-4 text-right font-medium">
                        {/* Note: In a real app we'd convert currency to base EUR here for total value, 
                            but keeping it simple for now and showing total in EUR for total calculations, 
                            and original currency for row values or assuming 1:1 if unhandled */}
                        {stock.totalValue.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                      </td>
                      <td className="p-4 text-right">
                        <div className={`inline-flex flex-col items-end ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                          <span className="font-bold">
                            {isPositive ? '+' : ''}{stock.gain.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                          </span>
                          <span className="text-xs flex items-center bg-gray-50 px-1 rounded mt-1">
                            {isPositive ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
                            {stock.gainPercent.toFixed(2)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {portfolio.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500">
                      Aucune position en cours. Cliquez sur "Gérer (Admin)" pour ajouter vos premières transactions !
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Closed Positions */}
        {data.closedPositions && data.closedPositions.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-8">
            <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-700">Positions Fermées (Historique)</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="p-4 font-semibold text-gray-600">Action</th>
                    <th className="p-4 font-semibold text-gray-600 text-right">Plus-Value Réalisée</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.closedPositions.map((stock: any) => {
                    const isPositive = stock.realizedGain >= 0;
                    return (
                      <tr key={stock.ticker} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4 font-bold text-gray-900">{stock.ticker}</td>
                        <td className="p-4 text-right">
                          <span className={`font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                            {isPositive ? '+' : ''}{stock.realizedGain.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
