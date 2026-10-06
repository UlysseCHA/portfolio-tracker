"use client";

import { useState, useEffect, useRef } from 'react';
import { PlusCircle, ArrowLeft, Search } from 'lucide-react';
import Link from 'next/link';

export default function AdminPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [type, setType] = useState('DEPOSIT');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [ticker, setTicker] = useState('');
  const [shares, setShares] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('EUR');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/transactions')
      .then(res => res.json())
      .then(data => setTransactions(data));
  }, []);

  // Handle outside click for search dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.trim().length > 1) {
        setIsSearching(true);
        fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`)
          .then(res => res.json())
          .then(data => {
            setSearchResults(data);
            setIsSearching(false);
            setShowResults(true);
          })
          .catch(() => setIsSearching(false));
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleSelectTicker = (result: any) => {
    setTicker(result.symbol);
    setSearchQuery(result.symbol);
    setShowResults(false);
  };

  const handleEdit = (tx: any) => {
    setEditingId(tx.id);
    setType(tx.type);
    setDate(tx.date);
    setAmount(tx.amount?.toString() || '');
    setTicker(tx.ticker || '');
    setSearchQuery(tx.ticker || '');
    setShares(tx.shares?.toString() || '');
    setPrice(tx.price?.toString() || '');
    setCurrency(tx.currency || 'EUR');
    window.scrollTo(0, 0);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Voulez-vous vraiment supprimer cette transaction ?")) return;
    await fetch(`/api/transactions?id=${id}`, { method: 'DELETE' });
    setTransactions(transactions.filter(t => t.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const txData = {
      id: editingId || undefined,
      type,
      date,
      amount: amount ? parseFloat(amount) : undefined,
      ticker: ticker ? ticker.toUpperCase() : undefined,
      shares: shares ? parseFloat(shares) : undefined,
      price: price ? parseFloat(price) : undefined,
      currency: (type === 'BUY' || type === 'SELL') ? currency : undefined,
    };

    const method = editingId ? 'PUT' : 'POST';
    const res = await fetch('/api/transactions', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(txData)
    });

    if (res.ok) {
      const savedTx = await res.json();
      if (editingId) {
        setTransactions(transactions.map(t => t.id === editingId ? savedTx : t));
        setEditingId(null);
      } else {
        setTransactions([...transactions, savedTx]);
      }
      
      // Reset form
      setAmount('');
      setTicker('');
      setSearchQuery('');
      setShares('');
      setPrice('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 text-gray-900">
      <div className="max-w-3xl mx-auto space-y-6">
        
        <header className="flex items-center space-x-4">
          <Link href="/" className="text-gray-500 hover:text-gray-900">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-2xl font-bold">Administration du Portefeuille</h1>
        </header>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold mb-4 flex items-center">
            <PlusCircle className="w-5 h-5 mr-2 text-blue-600" />
            Nouvelle Transaction
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type de mouvement</label>
                <select 
                  value={type} 
                  onChange={(e) => {
                    setType(e.target.value);
                    if (e.target.value === 'DEPOSIT' || e.target.value === 'WITHDRAWAL') {
                      setTicker('');
                      setSearchQuery('');
                    }
                  }}
                  className="w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-900"
                >
                  <option value="DEPOSIT">Dépôt d'argent</option>
                  <option value="WITHDRAWAL">Retrait d'argent</option>
                  <option value="BUY">Achat d'actions</option>
                  <option value="SELL">Vente d'actions</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input 
                  type="date" 
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-900"
                  required
                />
              </div>

              {(type === 'DEPOSIT' || type === 'WITHDRAWAL') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Montant (€)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-900"
                    placeholder="ex: 1000"
                    required
                  />
                </div>
              )}

              {(type === 'BUY' || type === 'SELL') && (
                <>
                  <div className="relative" ref={searchRef}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Recherche de l'Action (Ticker)</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setTicker(e.target.value.toUpperCase());
                        }}
                        onFocus={() => {
                          if (searchResults.length > 0) setShowResults(true);
                        }}
                        className="w-full border border-gray-300 rounded-lg p-2 pl-9 bg-white text-gray-900 uppercase"
                        placeholder="Rechercher une entreprise..."
                        required
                      />
                      <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                    </div>
                    
                    {/* Autocomplete Dropdown */}
                    {showResults && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {isSearching ? (
                          <div className="p-3 text-sm text-gray-500 text-center">Recherche...</div>
                        ) : searchResults.length > 0 ? (
                          searchResults.map((result, index) => (
                            <div 
                              key={index} 
                              className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-0 border-gray-100"
                              onClick={() => handleSelectTicker(result)}
                            >
                              <div className="font-bold text-sm">{result.symbol}</div>
                              <div className="text-xs text-gray-500 flex justify-between">
                                <span className="truncate pr-2">{result.shortname || result.longname}</span>
                                <span className="bg-gray-100 px-1.5 py-0.5 rounded">{result.exchange}</span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-3 text-sm text-gray-500 text-center">Aucun résultat</div>
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantité (Actions)</label>
                    <input 
                      type="number" 
                      step="0.0001"
                      value={shares}
                      onChange={(e) => setShares(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-900"
                      placeholder="ex: 5"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Prix unitaire</label>
                      <input 
                        type="number" 
                        step="0.01"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-900"
                        placeholder="ex: 150"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Devise</label>
                      <select 
                        value={currency} 
                        onChange={(e) => setCurrency(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-900"
                      >
                        <option value="EUR">EUR (€)</option>
                        <option value="USD">USD ($)</option>
                        <option value="GBP">GBP (£)</option>
                        <option value="CHF">CHF (₣)</option>
                        <option value="CAD">CAD ($)</option>
                      </select>
                    </div>
                  </div>
                </>
              )}
            </div>
            
            <button 
              type="submit"
              className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition flex items-center justify-center"
            >
              {editingId ? "Enregistrer les modifications" : "Enregistrer la transaction"}
            </button>
            {editingId && (
              <button 
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setAmount(''); setTicker(''); setSearchQuery(''); setShares(''); setPrice('');
                }}
                className="w-full mt-2 bg-gray-100 text-gray-700 font-bold py-2 px-4 rounded-lg hover:bg-gray-200 transition"
              >
                Annuler l'édition
              </button>
            )}
          </form>
        </div>

        {/* Historique */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold mb-4">Historique des Transactions</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="p-3">Date</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Détails</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td className="p-3">{tx.date}</td>
                    <td className="p-3 font-semibold">
                      {tx.type === 'DEPOSIT' && <span className="text-green-600">Dépôt</span>}
                      {tx.type === 'WITHDRAWAL' && <span className="text-red-600">Retrait</span>}
                      {tx.type === 'BUY' && <span className="text-blue-600">Achat</span>}
                      {tx.type === 'SELL' && <span className="text-orange-600">Vente</span>}
                    </td>
                    <td className="p-3">
                      {tx.type === 'DEPOSIT' || tx.type === 'WITHDRAWAL' 
                        ? `${tx.amount} €` 
                        : `${tx.shares} ${tx.ticker} à ${tx.price} ${tx.currency || '€'}`}
                    </td>
                    <td className="p-3 text-right space-x-2">
                      <button onClick={() => handleEdit(tx)} className="text-blue-500 hover:underline">Modifier</button>
                      <button onClick={() => handleDelete(tx.id)} className="text-red-500 hover:underline">Supprimer</button>
                    </td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-gray-500">Aucune transaction</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
