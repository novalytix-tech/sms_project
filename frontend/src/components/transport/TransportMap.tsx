// ==========================================
// Interactive Leaflet GPS Transport & Route Map
// Developed by NTS Novalytix
// ==========================================

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { TransportRoute, TransportTrip, BusStop } from '../../types';
import {
  Bus,
  Maximize2,
} from 'lucide-react';

interface TransportMapProps {
  route: TransportRoute;
  trip?: TransportTrip | null;
  assignedStopName?: string;
  height?: string | number;
  interactive?: boolean;
  onSelectStop?: (stop: BusStop) => void;
  showSimControls?: boolean;
  onSimulateStep?: () => void;
}

export const TransportMap: React.FC<TransportMapProps> = ({
  route,
  trip,
  assignedStopName,
  height = '480px',
  interactive = true,
  onSelectStop,
  showSimControls: _showSimControls = false,
  onSimulateStep: _onSimulateStep,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const [mapError, setMapError] = useState<string | null>(null);
  const [gpsAgeSec, setGpsAgeSec] = useState<number>(0);

  // Monitor location update freshness age every second
  useEffect(() => {
    const updateAge = () => {
      const ts = trip?.lastLocationUpdate?.timestamp;
      if (ts) {
        const age = Math.max(0, Math.round((Date.now() - new Date(ts).getTime()) / 1000));
        setGpsAgeSec(age);
      }
    };
    updateAge();
    const interval = setInterval(updateAge, 1000);
    return () => clearInterval(interval);
  }, [trip?.lastLocationUpdate?.timestamp]);

  // Initialise Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    try {
      const defaultLat = route.schoolLatitude || 12.9352;
      const defaultLng = route.schoolLongitude || 77.6245;

      const map = L.map(mapContainerRef.current, {
        center: [defaultLat, defaultLng],
        zoom: 13,
        zoomControl: false,
        dragging: interactive,
        scrollWheelZoom: interactive ? 'center' : false,
        touchZoom: interactive,
      });

      if (interactive) {
        L.control.zoom({ position: 'bottomright' }).addTo(map);
      }

      mapInstanceRef.current = map;

      // Production-grade standard OpenStreetMap tiles
      const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      });
      tileLayer.addTo(map);

      // Layer group for route polylines and markers
      const markersLayer = L.layerGroup().addTo(map);
      markersLayerRef.current = markersLayer;

      setTimeout(() => {
        map.invalidateSize();
      }, 200);

      return () => {
        map.remove();
        mapInstanceRef.current = null;
      };
    } catch (err: any) {
      console.warn('Map initialization error:', err);
      setMapError('Interactive map tiles could not be loaded in offline environment.');
    }
  }, []);

  // Update Route Polyline, Stops, Campus & Bus Marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    const schoolLat = route.schoolLatitude || 12.9352;
    const schoolLng = route.schoolLongitude || 77.6245;

    const validStops = route.stops.filter(s => s.latitude !== undefined && s.longitude !== undefined);
    const latLngs: [number, number][] = [];

    // 1. Add Route Stops
    validStops.forEach((stop, idx) => {
      const lat = stop.latitude!;
      const lng = stop.longitude!;
      latLngs.push([lat, lng]);

      const isMyStop =
        assignedStopName &&
        (stop.stopName.toLowerCase().includes(assignedStopName.toLowerCase()) ||
          assignedStopName.toLowerCase().includes(stop.stopName.toLowerCase()));

      const stopIconHtml = `
        <div style="
          width: ${isMyStop ? '30px' : '24px'};
          height: ${isMyStop ? '30px' : '24px'};
          border-radius: 50%;
          background: ${isMyStop ? '#3B82F6' : '#334155'};
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: ${isMyStop ? '13px' : '11px'};
          border: 2px solid #ffffff;
          box-shadow: 0 2px 6px rgba(0,0,0,0.25);
          cursor: pointer;
        ">
          ${isMyStop ? '★' : idx + 1}
        </div>
      `;

      const stopIcon = L.divIcon({
        html: stopIconHtml,
        className: 'custom-stop-marker',
        iconSize: [isMyStop ? 30 : 24, isMyStop ? 30 : 24],
        iconAnchor: [isMyStop ? 15 : 12, isMyStop ? 15 : 12],
      });

      const marker = L.marker([lat, lng], { icon: stopIcon }).addTo(layer);
      marker.bindPopup(`
        <div style="font-family: inherit; font-size: 13px; line-height: 1.4; padding: 2px;">
          <strong style="color: ${isMyStop ? '#3B82F6' : '#0f172a'}; font-size: 13px;">
            ${isMyStop ? '★ Assigned Commute Stop' : `Stop #${idx + 1}`}
          </strong>
          <div style="font-weight: 700; margin: 3px 0 2px; color: #1e293b;">${stop.stopName}</div>
          <div style="color: #64748b; font-size: 12px;">
            Pickup: <strong>${stop.pickupTime}</strong> • Drop: <strong>${stop.dropTime}</strong>
          </div>
        </div>
      `);

      if (onSelectStop) {
        marker.on('click', () => onSelectStop(stop));
      }
    });

    // 2. Add School Destination Marker
    latLngs.push([schoolLat, schoolLng]);
    const schoolIconHtml = `
      <div style="
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: #15803d;
        color: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 15px;
        border: 2.5px solid #ffffff;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      ">
        🏫
      </div>
    `;

    const schoolIcon = L.divIcon({
      html: schoolIconHtml,
      className: 'custom-school-marker',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    const schoolMarker = L.marker([schoolLat, schoolLng], { icon: schoolIcon }).addTo(layer);
    schoolMarker.bindPopup(`
      <div style="font-family: inherit; font-size: 13px;">
        <strong style="color: #15803d; font-size: 13px;">🏫 St. Xavier's International Academy</strong>
        <div style="color: #475569; margin-top: 2px; font-size: 12px;">Main Campus & Bus Dispersal Yard</div>
      </div>
    `);

    // 3. Planned Route Polyline
    if (latLngs.length > 1) {
      L.polyline(latLngs, {
        color: '#3B82F6',
        weight: 3.5,
        opacity: 0.85,
        dashArray: '7, 5',
      }).addTo(layer);
    }

    // 4. Draw Live Bus Marker if Trip has location coordinates
    const lastLoc = trip?.lastLocationUpdate;
    if (lastLoc && lastLoc.latitude && lastLoc.longitude) {
      const isLive = lastLoc.freshnessStatus === 'live';
      const isStale = lastLoc.freshnessStatus === 'stale';
      const statusColor = isLive ? '#16a34a' : isStale ? '#ea580c' : '#64748b';

      const busIconHtml = `
        <div style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
          ${
            isLive
              ? `<div style="
                  position: absolute;
                  width: 38px;
                  height: 38px;
                  border-radius: 50%;
                  background: rgba(22, 163, 74, 0.2);
                  animation: pulse-ring 2s infinite ease-out;
                "></div>`
              : ''
          }
          <div style="
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: #881337;
            color: #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 15px;
            border: 2.5px solid ${statusColor};
            box-shadow: 0 3px 8px rgba(0,0,0,0.35);
            transform: rotate(${lastLoc.headingDegrees || 0}deg);
            transition: transform 0.4s ease;
          ">
            🚌
          </div>
        </div>
      `;

      const busIcon = L.divIcon({
        html: busIconHtml,
        className: 'custom-bus-marker',
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      const busMarker = L.marker([lastLoc.latitude, lastLoc.longitude], { icon: busIcon }).addTo(layer);
      busMarker.bindPopup(`
        <div style="font-family: inherit; font-size: 13px; line-height: 1.4;">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
            <strong style="color: #881337; font-size: 13px;">${route.routeNumber}</strong>
            <span style="
              padding: 2px 7px;
              border-radius: 4px;
              font-size: 12px;
              font-weight: 700;
              text-transform: uppercase;
              background: ${isLive ? '#dcfce7' : isStale ? '#ffedd5' : '#f1f5f9'};
              color: ${isLive ? '#15803d' : isStale ? '#c2410c' : '#475569'};
            ">
              ${isLive ? '● Live GPS' : isStale ? '▲ Stale' : '■ Offline'}
            </span>
          </div>
          <div style="font-weight: 600; color: #1e293b;">${route.routeName}</div>
          <div style="color: #64748b; font-size: 12px; margin-top: 4px;">
            Vehicle: <strong>${route.vehicleNo}</strong><br/>
            Speed: <strong>${lastLoc.speedKmH ?? 0} km/h</strong><br/>
            Driver: <strong>${route.driverName}</strong> (${route.driverPhone})<br/>
            Last Ping: <strong>${new Date(lastLoc.timestamp).toLocaleTimeString()}</strong>
          </div>
        </div>
      `);
    }

    // Fit map bounds
    if (latLngs.length > 0) {
      const bounds = L.latLngBounds(latLngs);
      if (lastLoc && lastLoc.latitude && lastLoc.longitude) {
        bounds.extend([lastLoc.latitude, lastLoc.longitude]);
      }
      map.fitBounds(bounds, { padding: [35, 35], maxZoom: 15 });
    }
  }, [route, trip, assignedStopName]);

  const fitRouteBounds = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const validStops = route.stops.filter(s => s.latitude && s.longitude);
    const coords: [number, number][] = validStops.map(s => [s.latitude!, s.longitude!]);
    coords.push([route.schoolLatitude || 12.9352, route.schoolLongitude || 77.6245]);
    if (trip?.lastLocationUpdate?.latitude && trip.lastLocationUpdate.longitude) {
      coords.push([trip.lastLocationUpdate.latitude, trip.lastLocationUpdate.longitude]);
    }
    map.fitBounds(coords, { padding: [35, 35] });
  };

  const centerOnBus = () => {
    const map = mapInstanceRef.current;
    const loc = trip?.lastLocationUpdate;
    if (map && loc && loc.latitude && loc.longitude) {
      map.setView([loc.latitude, loc.longitude], 15, { animate: true });
    }
  };

  const freshness = trip?.lastLocationUpdate?.freshnessStatus || 'offline';
  const isLive = freshness === 'live';
  const isStale = freshness === 'stale';

  return (
    <div style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
      {/* Sleek Floating Map Controls (Top Right) */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        {/* GPS Live Indicator Pill */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.96)',
            backdropFilter: 'blur(6px)',
            borderRadius: '20px',
            padding: '5px 12px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            fontWeight: 700,
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: isLive ? '#16a34a' : isStale ? '#ea580c' : '#94a3b8',
            }}
            className={isLive ? 'pulse-dot' : ''}
          />
          <span style={{ color: isLive ? '#15803d' : isStale ? '#c2410c' : '#64748b' }}>
            {isLive ? 'Live GPS' : isStale ? 'Signal Stale' : 'GPS Offline'}
          </span>
          <span style={{ color: '#94a3b8', fontWeight: 500, fontSize: '12px' }}>
            {trip?.lastLocationUpdate ? `${gpsAgeSec}s ago` : 'no transponder'}
          </span>
        </div>

        {/* Center Bus Action */}
        {trip?.lastLocationUpdate && (
          <button
            className="btn btn-sm"
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              padding: '6px 10px',
              borderRadius: '8px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
            }}
            onClick={centerOnBus}
            title="Center View on Bus"
          >
            <Bus size={13} color="#3B82F6" />
            <span>Bus</span>
          </button>
        )}

        {/* Reset / Fit Bounds */}
        <button
          className="btn btn-sm"
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            padding: '6px 10px',
            borderRadius: '8px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '12px',
          }}
          onClick={fitRouteBounds}
          title="Fit Full Route Bounds"
        >
          <Maximize2 size={13} />
          <span>Fit</span>
        </button>
      </div>

      {/* Actual Leaflet Map Canvas */}
      {mapError && (
        <div style={{ padding: '8px 14px', background: '#fef2f2', borderBottom: '1px solid #fee2e2', color: '#b91c1c', fontSize: '12px' }}>
          {mapError}
        </div>
      )}
      <div
        ref={mapContainerRef}
        style={{
          width: '100%',
          height,
          background: '#f8fafc',
          minHeight: '340px',
        }}
      />

      {/* Map Legend Footer */}
      <div
        style={{
          padding: '8px 16px',
          background: '#fafaf9',
          borderTop: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          fontSize: '12px',
          color: '#64748b',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: '#334155' }} />
            <span>Bus Stop</span>
          </div>
          {assignedStopName && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', background: '#3B82F6', color: '#fff', fontSize: '8px', textAlign: 'center', lineHeight: '12px', fontWeight: 800 }}>★</span>
              <strong style={{ color: '#3B82F6' }}>Assigned Stop</strong>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span>🏫</span>
            <span>School Campus</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span>🚌</span>
            <span>Bus Position</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ display: 'inline-block', width: '18px', height: '2px', background: '#3B82F6', borderTop: '2px dashed #3B82F6' }} />
            <span>Planned Path</span>
          </div>
        </div>

        <div style={{ fontSize: '12px', color: '#94a3b8' }}>
          OpenStreetMap Cartography • St. Xavier's Academy
        </div>
      </div>
    </div>
  );
};
