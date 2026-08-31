import { useCallback, useEffect, useState } from 'react';
import { CARS } from '../../../shared/constants';
import type { CarListing } from '../../../shared/types';
import { useGameStore } from '../store/gameStore';
import { apiFetch } from '../utils/api';

const Marketplace = () => {
  const { player, setPlayer } = useGameStore();
  const [listings, setListings] = useState<CarListing[]>([]);
  const [sortBy, setSortBy] = useState('price_asc');
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const response = await apiFetch(`/marketplace/listings?sortBy=${sortBy}&limit=100`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not load listings');
    setListings(data.listings || []);
  }, [sortBy]);

  useEffect(() => { load().catch((error) => setNotice(error.message)); }, [load]);
  if (!player) return null;

  const buy = async (listing: CarListing) => {
    setLoading(true); setNotice('');
    try {
      const response = await apiFetch('/marketplace/buy', { method: 'POST', body: JSON.stringify({ listingId: listing.id, expectedPrice: listing.price }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Purchase failed');
      if (data.player) setPlayer(data.player);
      setNotice(data.message); await load();
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Purchase failed'); }
    finally { setLoading(false); }
  };

  const listCar = async (carId: string) => {
    const price = Number.parseInt(prices[carId] || '', 10);
    if (!Number.isInteger(price) || price < 1) return;
    setLoading(true); setNotice('');
    try {
      const response = await apiFetch('/marketplace/list', { method: 'POST', body: JSON.stringify({ carId, price }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Listing failed');
      setNotice(data.message); setPrices((current) => ({ ...current, [carId]: '' })); await load();
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Listing failed'); }
    finally { setLoading(false); }
  };

  return <div className="max-w-7xl mx-auto px-4 py-8">
    <div className="mb-8"><h1 className="text-4xl font-bold text-mafia-red mb-2">🚘 Car Marketplace</h1><p className="text-mafia-gray-400 text-lg">Buy player cars or put a spare vehicle on the market.</p></div>
    {notice && <div className="mb-6 rounded-lg border border-mafia-gold/40 bg-mafia-gold/10 px-4 py-3 text-mafia-gold">{notice}</div>}
    <section className="card-mafia mb-8">
      <h2 className="text-2xl font-bold text-white mb-4">Sell a spare car</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {player.cars.filter((car) => car.id !== player.activeCar).map((car) => <div key={car.id} className="rounded-lg bg-mafia-gray-700 p-4">
          <div className="flex justify-between"><strong className="text-white">{CARS[car.carType]?.name || 'Unknown car'}</strong><span className="text-mafia-gray-400">{car.damage}% damage</span></div>
          <div className="mt-3 flex gap-2"><input type="number" min="1" value={prices[car.id] || ''} onChange={(event) => setPrices((current) => ({ ...current, [car.id]: event.target.value }))} placeholder="Listing price" className="min-w-0 flex-1 rounded bg-mafia-gray-600 px-3 py-2 text-white"/><button disabled={loading} onClick={() => listCar(car.id)} className="btn-mafia disabled:opacity-40">List</button></div>
        </div>)}
        {!player.cars.some((car) => car.id !== player.activeCar) && <p className="text-mafia-gray-400">You need a non-active car to create a listing.</p>}
      </div>
    </section>
    <section className="card-mafia">
      <div className="mb-5 flex items-center justify-between gap-4"><h2 className="text-2xl font-bold text-white">Live listings</h2><select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="rounded bg-mafia-gray-700 px-3 py-2 text-white"><option value="price_asc">Price: low first</option><option value="price_desc">Price: high first</option><option value="damage_asc">Best condition</option></select></div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{listings.map((listing) => <article key={listing.id} className="rounded-lg bg-mafia-gray-700 p-4"><h3 className="font-bold text-white">{CARS[listing.carType]?.name || 'Unknown car'}</h3><div className="mt-2 text-sm text-mafia-gray-400">Damage: {listing.damage}%</div><div className="my-4 text-2xl text-money">${listing.price.toLocaleString()}</div><button className="btn-mafia w-full disabled:opacity-40" disabled={loading || listing.sellerId === player.worldId || player.money < listing.price} onClick={() => buy(listing)}>{listing.sellerId === player.worldId ? 'Your listing' : 'Buy car'}</button></article>)}</div>
      {!listings.length && <p className="text-mafia-gray-400">No active listings right now.</p>}
    </section>
  </div>;
};

export default Marketplace;
