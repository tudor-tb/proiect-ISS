import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

interface Route { id: number; toCityId: number; transportType: string; baseCost: number; }
interface City { id: number; name: string; lat: number; lng: number; routesFrom: Route[]; }
interface Player { id: number; username: string; budget: number; currentCityId: number; }

const Map = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  
  const [cities, setCities] = useState<City[]>([]);
  const [player, setPlayer] = useState<Player | null>(null);
  const [selectedCityId, setSelectedCityId] = useState<number | null>(null);
  const [gameWon, setGameWon] = useState(false);

  const FINAL_DESTINATION_ID = 3; 

  const fetchData = async () => {
    const resCities = await fetch('http://localhost:3000/api/cities');
    setCities(await resCities.json());

    const resPlayer = await fetch('http://localhost:3000/api/player/1');
    const playerData = await resPlayer.json();
    setPlayer(playerData);
    
    if (playerData.currentCityId === FINAL_DESTINATION_ID) {
      setGameWon(true);
    }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      center: [25.0, 45.8],
      zoom: 6,
      style: {
        version: 8,
        sources: { world: { type: 'geojson', data: 'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson' } },
        layers: [
          { id: 'background', type: 'background', paint: { 'background-color': '#0f172a' } },
          { id: 'countries', type: 'fill', source: 'world', paint: { 'fill-color': '#1e293b', 'fill-outline-color': '#334155' } }
        ]
      }
    });
    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
  }, []);

  useEffect(() => {
    if (!map.current || cities.length === 0 || !player) return;

    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    const currentCity = cities.find(c => c.id === player.currentCityId);
    const reachableRoutes = currentCity ? currentCity.routesFrom : [];
    const reachableCityIds = reachableRoutes.map(r => r.toCityId);

    cities.forEach(city => {
      const el = document.createElement('div');
      let backgroundColor = '#3b82f6'; 
      let scale = '1';

      if (city.id === player.currentCityId) {
        backgroundColor = '#22c55e';
        scale = '1.3';
      } else if (reachableCityIds.includes(city.id)) {
        backgroundColor = '#eab308';
        scale = '1.2';
        el.style.boxShadow = '0 0 10px 2px #eab308';
      } else if (city.id === FINAL_DESTINATION_ID) {
        backgroundColor = '#ef4444';
      }

      if (city.id === selectedCityId) {
        el.style.border = '3px solid #ec4899';
      } else {
        el.style.border = '2px solid white';
      }

      el.style.backgroundColor = backgroundColor;
      el.style.width = '20px';
      el.style.height = '20px';
      el.style.borderRadius = '50%';
      el.style.cursor = 'pointer';
      el.style.transform = `scale(${scale})`;
      el.style.transition = 'all 0.3s ease';

      el.addEventListener('click', () => setSelectedCityId(city.id));

      const popup = new maplibregl.Popup({ offset: 25 }).setText(city.name);
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([city.lng, city.lat])
        .setPopup(popup)
        .addTo(map.current!);

      markersRef.current.push(marker);
    });
  }, [cities, player, selectedCityId]);

  const handleTravel = async (route: Route) => {
    if (!player) return;
    
    const res = await fetch('http://localhost:3000/api/travel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId: player.id, toCityId: route.toCityId, cost: route.baseCost })
    });

    const data = await res.json();
    if (data.error) {
      alert(data.error);
    } else {
      setSelectedCityId(null);
      fetchData();
    }
  };

  const renderTravelOptions = () => {
    if (!selectedCityId || !player) return null;
    const currentCity = cities.find(c => c.id === player.currentCityId);
    const targetRoute = currentCity?.routesFrom.find(r => r.toCityId === selectedCityId);

    if (targetRoute) {
      return (
        <div style={{ marginTop: '15px', padding: '15px', background: '#334155', borderRadius: '5px' }}>
          <p style={{ margin: '0 0 10px 0' }}>Route to <strong>{cities.find(c => c.id === selectedCityId)?.name}</strong></p>
          <p style={{ margin: '0 0 10px 0', fontSize: '14px' }}>Transport: {targetRoute.transportType}</p>
          <button 
            onClick={() => handleTravel(targetRoute)}
            style={{ width: '100%', padding: '10px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
            Travel (-${targetRoute.baseCost})
          </button>
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 10, background: 'rgba(15, 23, 42, 0.9)', padding: '20px', borderRadius: '10px', color: 'white', border: '1px solid #334155', minWidth: '250px' }}>
        <h2 style={{ margin: '0 0 10px 0' }}>Transit Racer</h2>
        
        {player && (
          <div style={{ padding: '10px', background: '#1e293b', borderRadius: '5px', marginBottom: '15px' }}>
            <h3 style={{ margin: 0, color: '#22c55e' }}>Budget: ${player.budget}</h3>
            <p style={{ margin: '5px 0 0 0', fontSize: '14px' }}>Current location: <strong>{cities.find(c => c.id === player.currentCityId)?.name}</strong></p>
          </div>
        )}

        {gameWon ? (
          <div style={{ background: '#eab308', color: 'black', padding: '15px', borderRadius: '5px', textAlign: 'center', fontWeight: 'bold' }}>
            🎉 YOU REACHED THE DESTINATION! 🎉<br/>Final Score: ${player?.budget}
          </div>
        ) : (
          <>
            <p style={{ fontSize: '14px' }}><span style={{color: '#22c55e', fontWeight: 'bold'}}>Green</span> = You are here.</p>
            <p style={{ fontSize: '14px' }}><span style={{color: '#eab308', fontWeight: 'bold'}}>Yellow</span> = Available routes.</p>
            {renderTravelOptions()}
          </>
        )}
      </div>

      <div ref={mapContainer} style={{ width: '100vw', height: '100vh', position: 'absolute', top: 0, left: 0 }} />
    </div>
  );
};

export default Map;