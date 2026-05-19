import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

interface Route {
  id: number;
  toCityId: number;
  transportType: string;
  baseCost: number;
}

interface City {
  id: number;
  name: string;
  lat: number;
  lng: number;
  routesFrom: Route[]; 
}

const Map = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]); 
  
  const [cities, setCities] = useState<City[]>([]);
  const [selectedCityId, setSelectedCityId] = useState<number | null>(null);

  useEffect(() => {
    fetch('http://localhost:3000/api/cities')
      .then(res => res.json())
      .then(data => {
        setCities(data);
      })
      .catch(err => console.error("Error when loading cities", err));
  }, []);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      center: [25.0, 45.8],
      zoom: 6,
      style: {
        version: 8,
        sources: {
          world: {
            type: 'geojson',
            data: 'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson'
          }
        },
        layers: [
          {
            id: 'background',
            type: 'background',
            paint: { 'background-color': '#0f172a' }
          },
          {
            id: 'countries',
            type: 'fill',
            source: 'world',
            paint: {
              'fill-color': '#1e293b', 
              'fill-outline-color': '#334155' 
            }
          }
        ]
      }
    });

    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
  }, []);

  useEffect(() => {
    if (!map.current || cities.length === 0) return;
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    const selectedCity = cities.find(c => c.id === selectedCityId);
    const reachableCityIds = selectedCity ? selectedCity.routesFrom.map(r => r.toCityId) : [];

    cities.forEach(city => {
      const el = document.createElement('div');
      el.className = 'city-marker';
      
      let backgroundColor = '#3b82f6'; 
      let scale = '1';

      if (city.id === selectedCityId) {
        backgroundColor = '#22c55e'; 
        scale = '1.3';
      } else if (reachableCityIds.includes(city.id)) {
        backgroundColor = '#eab308';
        scale = '1.2';
        el.style.boxShadow = '0 0 10px 2px #eab308';
      }

      el.style.backgroundColor = backgroundColor;
      el.style.width = '20px';
      el.style.height = '20px';
      el.style.borderRadius = '50%';
      el.style.border = '2px solid white';
      el.style.cursor = 'pointer';
      el.style.transform = `scale(${scale})`;
      el.style.transition = 'all 0.3s ease';

      el.addEventListener('click', () => {
        setSelectedCityId(city.id);
      });

      const popup = new maplibregl.Popup({ offset: 25 }).setText(city.name);
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([city.lng, city.lat])
        .setPopup(popup)
        .addTo(map.current!);

      markersRef.current.push(marker);
    });

  }, [cities, selectedCityId]);

  return (
    <div>
      {}
      <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 10, background: 'rgba(15, 23, 42, 0.9)', padding: '20px', borderRadius: '10px', color: 'white', border: '1px solid #334155' }}>
        <h2 style={{ margin: '0 0 10px 0' }}>Transit Racer</h2>
        <p>1. Click on a point to select your location.</p>
        <p>2. <span style={{color: '#eab308', fontWeight: 'bold'}}>Yellow</span> points represent available routes.</p>
        {selectedCityId && (
          <div style={{ marginTop: '20px', padding: '10px', background: '#1e293b', borderRadius: '5px' }}>
            Selected city: <strong>{cities.find(c => c.id === selectedCityId)?.name}</strong>
          </div>
        )}
      </div>

      <div ref={mapContainer} style={{ width: '100vw', height: '100vh', position: 'absolute', top: 0, left: 0 }} />
    </div>
  );
};

export default Map;