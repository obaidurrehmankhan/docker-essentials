'use client';

import { useState } from 'react';
import { addVisit, fetchVisits, pingApi } from '../lib/api';

export default function Home() {
  const [status, setStatus] = useState('Idle');
  const [count, setCount] = useState<number | null>(null);

  const handlePing = async () => {
    setStatus('Pinging API...');
    try {
      const res = await pingApi();
      setStatus(`Ping success: ${JSON.stringify(res)}`);
    } catch (err) {
      setStatus(`Ping failed: ${(err as Error).message}`);
    }
  };

  const handleAddVisit = async () => {
    setStatus('Adding visit...');
    try {
      const res = await addVisit();
      setCount(res.count);
      setStatus('Visit added');
    } catch (err) {
      setStatus(`Add visit failed: ${(err as Error).message}`);
    }
  };

  const handleLoadCount = async () => {
    setStatus('Loading visits...');
    try {
      const res = await fetchVisits();
      setCount(res.count);
      setStatus('Count loaded');
    } catch (err) {
      setStatus(`Load failed: ${(err as Error).message}`);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-6 font-mono">
      <h1>Docker 15 Concepts Demo</h1>
      <p>Container DNS lets this UI talk to the Express API via `/backend/*`.</p>
      <div className="flex gap-4">
        <button onClick={handlePing}>Ping API</button>
        <button onClick={handleAddVisit}>Add Visit</button>
        <button onClick={handleLoadCount}>Get Count</button>
      </div>
      <p>Visit count: {count === null ? 'unknown' : count}</p>
      <p>Status: {status}</p>
    </main>
  );
}
