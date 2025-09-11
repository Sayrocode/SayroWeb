import { useEffect, useRef } from 'react';
import { Box, Text } from '@chakra-ui/react';

interface MapComponentProps {
  property: {
    public_id: string;
    title?: string;
  };
  coordinates: [number, number] | null;
  locationText: string;
}

export default function MapComponent({ property, coordinates, locationText }: MapComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // Flag para evitar condiciones de carrera con Strict Mode
    let disposed = false;

    // Si ya existe un mapa previo, eliminarlo antes de crear uno nuevo
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Importar Leaflet dinámicamente y crear el mapa
    const initMap = async () => {
      const L = await import('leaflet');

      if (disposed || !mapRef.current) return;

      // Coordenadas por defecto (Mérida, Yucatán)
      const defaultCoordinates: [number, number] = [20.9674, -89.5926];
      const mapCenter = coordinates || defaultCoordinates;

      // En algunos casos (StrictMode/Hot Reload) el contenedor queda marcado
      // como inicializado por Leaflet. Borramos esa marca de ser necesario.
      const container = mapRef.current as any;
      if (container && container._leaflet_id) {
        try {
          delete container._leaflet_id;
        } catch {}
      }

      // Crear el mapa
      const map = L.map(mapRef.current!, {
        center: mapCenter,
        zoom: coordinates ? 15 : 12,
      });

      // Agregar capa de tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);

      // Agregar marcador si hay coordenadas
      if (coordinates) {
        const marker = L.marker(coordinates).addTo(map);
        marker.bindPopup(`
          <div style="padding: 8px;">
            <strong>${property.title || `Propiedad ${property.public_id}`}</strong><br>
            <small style="color: #666;">${locationText}</small>
          </div>
        `);
      }

      mapInstanceRef.current = map;
    };

    initMap();

    // Cleanup al desmontar o cambio de dependencias
    return () => {
      disposed = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [coordinates, property.public_id, property.title, locationText]);

  return <Box ref={mapRef} h="100%" w="100%" />;
}
