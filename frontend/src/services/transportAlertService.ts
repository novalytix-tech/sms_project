// ==========================================
// School Bus Safety Alert & Incident Service
// Developed by NTS Novalytix
// ==========================================

import { TransportAlert, User } from '../types';
import { ERPStorage } from './storage';
import { studentService } from './studentService';

export interface CreateTransportAlertInput {
  tripId: string;
  routeId: string;
  busNumber: string;
  studentId?: string;
  alertType:
    | 'approaching_stop'
    | 'arrived_at_school'
    | 'student_boarded'
    | 'student_dropped'
    | 'trip_delayed'
    | 'route_deviation'
    | 'gps_offline'
    | 'safety_incident';
  severity: 'info' | 'warning' | 'urgent';
  title: string;
  message: string;
  isSimulated?: boolean;
}

export const transportAlertService = {
  /**
   * Alert cooldowns to avoid duplicate spam (in milliseconds)
   */
  ALERT_COOLDOWN_MS: 5 * 60 * 1000, // 5 minutes cooldown per alert key

  /**
   * Retrieves all transport alerts
   */
  getAllAlerts: (): TransportAlert[] => {
    return ERPStorage.get().transportAlerts || [];
  },

  /**
   * Retrieves alerts for parents (scoped strictly to their linked children and their child's route)
   */
  getAlertsForParent: (parentUser: User): TransportAlert[] => {
    const parentId = parentUser.referenceId || parentUser.id;
    const linkedStudents = studentService
      .getAll()
      .filter(s => s.parentId === parentId || s.parentEmail?.toLowerCase() === parentUser.email?.toLowerCase());

    const studentIds = new Set(linkedStudents.map(s => s.id));
    const childRouteIds = new Set(linkedStudents.map(s => s.transportRouteId).filter(Boolean));

    return transportAlertService
      .getAllAlerts()
      .filter(a => {
        if (a.studentId) {
          return studentIds.has(a.studentId);
        }
        return childRouteIds.has(a.routeId);
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },

  /**
   * Creates a new transport safety alert with cooldown protection
   */
  createAlert: (
    input: CreateTransportAlertInput
  ): { success: boolean; alert?: TransportAlert; isThrottled?: boolean; error?: string } => {
    const store = ERPStorage.get();
    const alerts = store.transportAlerts || [];

    // Check cooldown for identical alert type on same trip/route within cooldown window
    const now = Date.now();
    const recentDuplicate = alerts.find(a => {
      const isSameTarget = a.tripId === input.tripId && a.alertType === input.alertType;
      const isSameStudent = input.studentId ? a.studentId === input.studentId : true;
      const ageMs = now - new Date(a.timestamp).getTime();
      return isSameTarget && isSameStudent && ageMs < transportAlertService.ALERT_COOLDOWN_MS;
    });

    if (recentDuplicate) {
      return { success: false, isThrottled: true, error: 'Alert throttled by cooldown engine.' };
    }

    const nowDate = new Date();
    const formattedTimestamp = `${nowDate.toISOString().split('T')[0]} ${String(nowDate.getHours()).padStart(2, '0')}:${String(nowDate.getMinutes()).padStart(2, '0')}`;

    const newAlert: TransportAlert = {
      id: `t-alt-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      tripId: input.tripId,
      routeId: input.routeId,
      busNumber: input.busNumber,
      studentId: input.studentId,
      alertType: input.alertType,
      severity: input.severity,
      title: input.title,
      message: input.message,
      timestamp: formattedTimestamp,
      isSimulated: input.isSimulated ?? true,
      acknowledgedBy: [],
    };

    store.transportAlerts = [newAlert, ...alerts];
    ERPStorage.set(store);

    return { success: true, alert: newAlert };
  },

  /**
   * Acknowledges an alert by a user
   */
  acknowledgeAlert: (
    alertId: string,
    userOrId: string | User
  ): { success: boolean; alert?: TransportAlert } => {
    const store = ERPStorage.get();
    const alerts = store.transportAlerts || [];
    const alert = alerts.find(a => a.id === alertId);
    if (!alert) return { success: false };

    const userName = typeof userOrId === 'string' ? userOrId : userOrId.name;
    alert.acknowledgedBy = userName;
    ERPStorage.set(store);

    return { success: true, alert };
  },
};
