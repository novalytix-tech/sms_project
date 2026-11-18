// ==========================================
// Transport Management Service - Dynamic Commute & Access Boundary
// Developed by NTS Novalytix
// ==========================================

import { TransportRoute, Student, User, TransportTrip } from '../types';
import { ERPStorage } from './storage';
import { studentService } from './studentService';

export interface StudentCommuteDetails {
  student: Student;
  route: TransportRoute;
  assignedStop?: {
    stopName: string;
    pickupTime: string;
    dropTime: string;
    feePerTerm: number;
  };
  pickupTime: string;
  dropTime: string;
  feePerTerm: number;
}

export const transportService = {
  getAllRoutes: (): TransportRoute[] => {
    return ERPStorage.get().transportRoutes || [];
  },

  getRouteById: (id: string): TransportRoute | undefined => {
    return (ERPStorage.get().transportRoutes || []).find(r => r.id === id);
  },

  createRoute: (data: Omit<TransportRoute, 'id'>): TransportRoute => {
    const store = ERPStorage.get();
    if (!store.transportRoutes) {
      store.transportRoutes = [];
    }
    const newRoute: TransportRoute = {
      ...data,
      id: `route-${Date.now()}`,
    };
    store.transportRoutes.push(newRoute);
    ERPStorage.set(store);
    return newRoute;
  },

  updateRoute: (id: string, updates: Partial<TransportRoute>): TransportRoute | undefined => {
    const store = ERPStorage.get();
    if (!store.transportRoutes) return undefined;
    const index = store.transportRoutes.findIndex(r => r.id === id);
    if (index === -1) return undefined;

    const updated = { ...store.transportRoutes[index], ...updates };
    store.transportRoutes[index] = updated;
    ERPStorage.set(store);
    return updated;
  },

  deleteRoute: (id: string): boolean => {
    const store = ERPStorage.get();
    if (!store.transportRoutes) return false;
    const len = store.transportRoutes.length;
    store.transportRoutes = store.transportRoutes.filter(r => r.id !== id);
    if (store.transportRoutes.length !== len) {
      ERPStorage.set(store);
      return true;
    }
    return false;
  },

  /**
   * Verifies strictly whether a student has enrolled/opted into the school bus transport facility
   */
  hasStudentOpted: (studentOrId: string | Student): boolean => {
    let student: Student | undefined;
    if (typeof studentOrId === 'string') {
      student = studentService.getById(studentOrId);
    } else {
      student = studentOrId;
    }

    if (!student) return false;
    const routeId = student.transportRouteId?.trim();
    if (!routeId || routeId.toLowerCase() === 'none' || routeId === '') {
      return false;
    }

    // Verify the route actually exists in active routes
    const routes = transportService.getAllRoutes();
    return routes.some(r => r.id === routeId);
  },

  /**
   * Retrieves designated commute information (assigned bus, stop, timings) for an enrolled student
   */
  getStudentCommuteDetails: (studentOrId: string | Student): StudentCommuteDetails | null => {
    let student: Student | undefined;
    if (typeof studentOrId === 'string') {
      student = studentService.getById(studentOrId);
    } else {
      student = studentOrId;
    }

    if (!student || !transportService.hasStudentOpted(student)) {
      return null;
    }

    const route = transportService.getRouteById(student.transportRouteId!);
    if (!route) return null;

    // Find the student's designated stop or fallback to route's first stop
    const assignedStop =
      route.stops.find(
        s =>
          student?.busStop &&
          (s.stopName.toLowerCase().includes(student.busStop.toLowerCase()) ||
            student.busStop.toLowerCase().includes(s.stopName.toLowerCase()))
      ) ||
      route.stops.find(s => s.stopName.toLowerCase() === (student?.busStop || '').toLowerCase()) ||
      route.stops[0];

    return {
      student,
      route,
      assignedStop,
      pickupTime: assignedStop?.pickupTime || '07:30',
      dropTime: assignedStop?.dropTime || '15:30',
      feePerTerm: assignedStop?.feePerTerm || 0,
    };
  },

  /**
   * Verifies if a user role and identity is authorized to access transport information
   */
  canUserAccessTransport: (
    user: User,
    selectedChild?: Student
  ): { allowed: boolean; reason?: 'not_opted' | 'unauthorized_role'; student?: Student } => {
    if (user.role === 'school_admin' || user.role === 'super_admin') {
      return { allowed: true };
    }

    if (user.role === 'student') {
      const student =
        (user.referenceId ? studentService.getById(user.referenceId) : null) ||
        studentService.getAll().find(s => s.fullName.toLowerCase() === user.name.toLowerCase());

      if (!student || !transportService.hasStudentOpted(student)) {
        return { allowed: false, reason: 'not_opted', student };
      }
      return { allowed: true, student };
    }

    if (user.role === 'parent') {
      // Check selected child first
      if (selectedChild && transportService.hasStudentOpted(selectedChild)) {
        return { allowed: true, student: selectedChild };
      }

      // Check all linked children
      const parentId = user.referenceId || user.id;
      const linkedChildren = studentService
        .getAll()
        .filter(s => s.parentId === parentId || s.parentEmail?.toLowerCase() === user.email?.toLowerCase());

      const optedChild = linkedChildren.find(c => transportService.hasStudentOpted(c));
      if (optedChild) {
        return { allowed: true, student: optedChild };
      }

      return { allowed: false, reason: 'not_opted', student: selectedChild || linkedChildren[0] };
    }

    // Teachers, suppliers have no student transport route view
    return { allowed: false, reason: 'unauthorized_role' };
  },

  /**
   * Assigns or enrolls a student in a specific transport bus route
   */
  assignTransport: (
    studentId: string,
    routeId: string,
    busStop: string
  ): { success: boolean; error?: string } => {
    const route = transportService.getRouteById(routeId);
    if (!route) {
      return { success: false, error: 'Target transport route not found.' };
    }

    const student = studentService.getById(studentId);
    if (!student) {
      return { success: false, error: 'Student record not found.' };
    }

    const updateRes = studentService.update(studentId, {
      transportRouteId: routeId,
      busStop: busStop.trim() || route.stops[0]?.stopName || 'Main Campus Gate',
    });

    if (!updateRes.success) {
      return { success: false, error: updateRes.error };
    }

    // Increment route occupancy
    transportService.updateRoute(routeId, {
      assignedStudentsCount: (route.assignedStudentsCount || 0) + 1,
    });

    return { success: true };
  },

  /**
   * Opts out / unenrolls a student from school transport
   */
  optOutTransport: (studentId: string): { success: boolean; error?: string } => {
    const student = studentService.getById(studentId);
    if (!student) {
      return { success: false, error: 'Student record not found.' };
    }

    const prevRouteId = student.transportRouteId;
    const updateRes = studentService.update(studentId, {
      transportRouteId: '',
      busStop: '',
    });

    if (!updateRes.success) {
      return { success: false, error: updateRes.error };
    }

    // Decrement previous route occupancy
    if (prevRouteId) {
      const prevRoute = transportService.getRouteById(prevRouteId);
      if (prevRoute && prevRoute.assignedStudentsCount > 0) {
        transportService.updateRoute(prevRouteId, {
          assignedStudentsCount: prevRoute.assignedStudentsCount - 1,
        });
      }
    }

    return { success: true };
  },

  /**
   * Retrieves all trips in the ERP
   */
  getAllTrips: (): TransportTrip[] => {
    return ERPStorage.get().transportTrips || [];
  },

  /**
   * Retrieves trip by ID
   */
  getTripById: (id: string): TransportTrip | undefined => {
    return (ERPStorage.get().transportTrips || []).find(t => t.id === id);
  },

  /**
   * Retrieves active/scheduled trips for a specific route
   */
  getTripsByRoute: (routeId: string): TransportTrip[] => {
    return (ERPStorage.get().transportTrips || []).filter(t => t.routeId === routeId);
  },

  /**
   * Retrieves currently active trip for a route
   */
  getActiveTripForRoute: (routeId: string): TransportTrip | undefined => {
    return (ERPStorage.get().transportTrips || []).find(
      t => t.routeId === routeId && (t.status === 'in_transit' || t.status === 'scheduled' || t.status === 'arrived_at_school')
    );
  },

  /**
   * Returns all active enrolled students assigned to a specific route
   */
  getAssignedStudents: (routeId: string): Student[] => {
    return studentService.getAll().filter(s => s.transportRouteId === routeId);
  },

  /**
   * Starts a scheduled trip
   */
  startTrip: (tripId: string, _user: User): { success: boolean; trip?: TransportTrip; error?: string } => {
    const store = ERPStorage.get();
    const trips = store.transportTrips || [];
    const trip = trips.find(t => t.id === tripId);
    if (!trip) return { success: false, error: 'Trip not found.' };

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    trip.status = 'in_transit';
    trip.actualStartTime = timeStr;
    ERPStorage.set(store);

    return { success: true, trip };
  },

  /**
   * Ends an active trip
   */
  endTrip: (tripId: string, _user: User): { success: boolean; trip?: TransportTrip; error?: string } => {
    const store = ERPStorage.get();
    const trips = store.transportTrips || [];
    const trip = trips.find(t => t.id === tripId);
    if (!trip) return { success: false, error: 'Trip not found.' };

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    trip.status = 'completed';
    trip.actualEndTime = timeStr;
    if (trip.lastLocationUpdate) {
      trip.lastLocationUpdate.speedKmH = 0;
    }
    ERPStorage.set(store);

    return { success: true, trip };
  },
};
