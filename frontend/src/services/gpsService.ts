// ==========================================
// GPS School Bus Telematics & Location Engine
// Developed by NTS Novalytix
// ==========================================

import { BusLocationUpdate, BusStop } from '../types';
import { ERPStorage } from './storage';

export interface RawGpsUpdate {
  busId: string;
  tripId?: string;
  routeId?: string;
  latitude: number;
  longitude: number;
  timestamp: string; // ISO 8601
  speedKmH?: number;
  headingDegrees?: number;
  accuracyMeters?: number;
  sourceDeviceId?: string;
  isSimulated?: boolean;
}

export interface LocationValidationResult {
  isValid: boolean;
  error?: string;
}

export const gpsService = {
  /**
   * Freshness thresholds (in milliseconds)
   */
  FRESHNESS_THRESHOLDS: {
    LIVE_MS: 90 * 1000, // < 90 seconds is LIVE
    STALE_MS: 10 * 60 * 1000, // 90s to 10 mins is STALE
    // > 10 mins is OFFLINE
  },

  /**
   * Evaluates freshness status based on timestamp age
   */
  getFreshnessStatus: (timestamp: string): 'live' | 'stale' | 'offline' => {
    const time = new Date(timestamp).getTime();
    if (isNaN(time)) return 'offline';
    const ageMs = Date.now() - time;

    if (ageMs < gpsService.FRESHNESS_THRESHOLDS.LIVE_MS) {
      return 'live';
    } else if (ageMs < gpsService.FRESHNESS_THRESHOLDS.STALE_MS) {
      return 'stale';
    } else {
      return 'offline';
    }
  },

  /**
   * Alias for getFreshnessStatus
   */
  evaluateFreshness: (timestamp: string): 'live' | 'stale' | 'offline' => {
    return gpsService.getFreshnessStatus(timestamp);
  },

  /**
   * Validates raw incoming GPS update
   */
  validateGpsUpdate: (
    update: RawGpsUpdate,
    lastRecordedTimestamp?: string
  ): LocationValidationResult => {
    // 1. Latitude range validation (-90 to +90)
    if (typeof update.latitude !== 'number' || isNaN(update.latitude) || update.latitude < -90 || update.latitude > 90) {
      return { isValid: false, error: `Invalid latitude coordinate: ${update.latitude}. Must be between -90 and 90.` };
    }

    // 2. Longitude range validation (-180 to +180)
    if (typeof update.longitude !== 'number' || isNaN(update.longitude) || update.longitude < -180 || update.longitude > 180) {
      return { isValid: false, error: `Invalid longitude coordinate: ${update.longitude}. Must be between -180 and 180.` };
    }

    // 3. Timestamp validity
    const updateTime = new Date(update.timestamp).getTime();
    if (isNaN(updateTime)) {
      return { isValid: false, error: 'Malformed timestamp format. Must be a valid ISO-8601 string.' };
    }

    // 4. Reject future timestamps (> 5 minutes in future)
    if (updateTime > Date.now() + 5 * 60 * 1000) {
      return { isValid: false, error: 'Timestamp is in the future. Clock synchronization error detected.' };
    }

    // 5. Out-of-order rejection (chronological order protection)
    if (lastRecordedTimestamp) {
      const lastTime = new Date(lastRecordedTimestamp).getTime();
      if (!isNaN(lastTime) && updateTime < lastTime) {
        return {
          isValid: false,
          error: `Out-of-order location packet. Packet timestamp (${update.timestamp}) is older than last recorded update (${lastRecordedTimestamp}).`,
        };
      }
    }

    // 6. Accuracy validation
    if (update.accuracyMeters !== undefined && (typeof update.accuracyMeters !== 'number' || update.accuracyMeters < 0)) {
      return { isValid: false, error: 'Accuracy meters must be a non-negative number.' };
    }

    return { isValid: true };
  },

  /**
   * Computes Great-Circle distance in meters between two lat/lng points using Haversine formula
   */
  calculateDistanceMeters: (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371e3; // Earth radius in meters
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },

  /**
   * Checks whether a coordinate is inside a geofence radius
   */
  isWithinGeofence: (
    pointLat: number,
    pointLng: number,
    centerLat: number,
    centerLng: number,
    radiusMeters: number = 100
  ): boolean => {
    const dist = gpsService.calculateDistanceMeters(pointLat, pointLng, centerLat, centerLng);
    return dist <= radiusMeters;
  },

  /**
   * Calculates minimum distance from a point to a route segment (for route deviation detection)
   */
  calculateDistanceFromRouteMeters: (
    pointLat: number,
    pointLng: number,
    stops: BusStop[]
  ): number => {
    const validStops = stops.filter(s => s.latitude !== undefined && s.longitude !== undefined);
    if (validStops.length === 0) return 0;

    let minDistance = Infinity;
    for (const stop of validStops) {
      const dist = gpsService.calculateDistanceMeters(pointLat, pointLng, stop.latitude!, stop.longitude!);
      if (dist < minDistance) {
        minDistance = dist;
      }
    }
    return minDistance;
  },

  /**
   * Estimates arrival time in minutes to target stop
   */
  estimateEtaMinutes: (
    currentLat: number,
    currentLng: number,
    targetLat: number,
    targetLng: number,
    currentSpeedKmH: number = 30
  ): number => {
    const distanceM = gpsService.calculateDistanceMeters(currentLat, currentLng, targetLat, targetLng);
    const effectiveSpeed = Math.max(15, currentSpeedKmH); // Urban school bus average speed clamp (15-40 km/h)
    const speedMps = (effectiveSpeed * 1000) / 3600;
    const seconds = distanceM / speedMps;
    return Math.max(1, Math.round(seconds / 60));
  },

  /**
   * Ingests a new GPS packet into a trip, performing validation, freshness calculation, and storage
   */
  ingestLocationUpdate: (
    update: RawGpsUpdate
  ): { success: boolean; update?: BusLocationUpdate; error?: string } => {
    const store = ERPStorage.get();
    const trips = store.transportTrips || [];
    const trip = trips.find(t => t.id === update.tripId || t.routeId === update.busId || t.routeNumber === update.busId);

    const lastTimestamp = trip?.lastLocationUpdate?.timestamp;
    const validation = gpsService.validateGpsUpdate(update, lastTimestamp);
    if (!validation.isValid) {
      return { success: false, error: validation.error };
    }

    const freshnessStatus = gpsService.getFreshnessStatus(update.timestamp);

    const locationUpdate: BusLocationUpdate = {
      busId: update.busId,
      tripId: update.tripId || trip?.id,
      routeId: update.routeId || trip?.routeId,
      latitude: update.latitude,
      longitude: update.longitude,
      timestamp: update.timestamp,
      speedKmH: update.speedKmH,
      headingDegrees: update.headingDegrees,
      accuracyMeters: update.accuracyMeters,
      sourceDeviceId: update.sourceDeviceId,
      freshnessStatus,
      isSimulated: update.isSimulated ?? true,
    };

    if (trip) {
      trip.lastLocationUpdate = locationUpdate;
      if (freshnessStatus === 'offline') {
        trip.status = 'offline';
      } else if (trip.status === 'offline') {
        trip.status = 'in_transit';
      }

      // Check route deviation (tolerance threshold: 450 meters)
      const route = (store.transportRoutes || []).find(r => r.id === trip.routeId);
      if (route && route.stops.length > 0) {
        const deviationDist = gpsService.calculateDistanceFromRouteMeters(
          update.latitude,
          update.longitude,
          route.stops
        );
        trip.hasDeviationAlert = deviationDist > 450;
      }
    }

    // Save location update history
    store.transportLocations = [locationUpdate, ...(store.transportLocations || []).slice(0, 100)];
    ERPStorage.set(store);

    return { success: true, update: locationUpdate };
  },

  /**
   * Generates next position along route stops for DEMO simulation
   */
  simulateStepAlongRoute: (
    tripId: string,
    stepFraction: number = 0.25
  ): { success: boolean; update?: BusLocationUpdate; error?: string } => {
    const store = ERPStorage.get();
    const trip = (store.transportTrips || []).find(t => t.id === tripId);
    if (!trip) return { success: false, error: 'Trip not found' };

    const route = (store.transportRoutes || []).find(r => r.id === trip.routeId);
    if (!route || route.stops.length < 2) return { success: false, error: 'Route stops not found' };

    const stopsWithCoords = route.stops.filter(s => s.latitude && s.longitude);
    if (stopsWithCoords.length < 2) return { success: false, error: 'Insufficient stop coordinates' };

    const last = trip.lastLocationUpdate;
    let nextLat = stopsWithCoords[0].latitude!;
    let nextLng = stopsWithCoords[0].longitude!;
    let nextStopName = stopsWithCoords[1]?.stopName;

    if (last) {
      // Find current stop index
      let nearestIdx = 0;
      let minD = Infinity;
      stopsWithCoords.forEach((s, idx) => {
        const d = gpsService.calculateDistanceMeters(last.latitude, last.longitude, s.latitude!, s.longitude!);
        if (d < minD) {
          minD = d;
          nearestIdx = idx;
        }
      });

      const targetIdx = (nearestIdx + 1) % stopsWithCoords.length;
      const currentStop = stopsWithCoords[nearestIdx];
      const targetStop = stopsWithCoords[targetIdx];

      // Interpolate
      nextLat = currentStop.latitude! + (targetStop.latitude! - currentStop.latitude!) * stepFraction;
      nextLng = currentStop.longitude! + (targetStop.longitude! - currentStop.longitude!) * stepFraction;
      nextStopName = targetStop.stopName;
    }

    if (trip && nextStopName) {
      trip.nextStopName = nextStopName;
    }

    const now = new Date().toISOString();
    return gpsService.ingestLocationUpdate({
      busId: route.id,
      tripId: trip.id,
      routeId: route.id,
      latitude: Number(nextLat.toFixed(5)),
      longitude: Number(nextLng.toFixed(5)),
      timestamp: now,
      speedKmH: 34,
      headingDegrees: 180,
      accuracyMeters: 5.0,
      sourceDeviceId: 'DEMO-SIM-01',
      isSimulated: true,
    });
  },
};
