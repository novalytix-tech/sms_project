// ==========================================
// Transport & School Bus Management
// Developed by NTS Novalytix
// ==========================================

import React, { useState, useMemo } from 'react';
import { transportService, StudentCommuteDetails } from '../../services/transportService';
import { studentService } from '../../services/studentService';
import { gpsService } from '../../services/gpsService';
import { safetyEventService } from '../../services/safetyEventService';
import { transportAlertService } from '../../services/transportAlertService';
import { TransportRoute, Student, TransportTrip, TransportSafetyEvent, TransportAlert } from '../../types';
import { Modal } from '../../components/common/Modal';
import { useERP } from '../../context/ERPContext';
import './transport.css';

// Subcomponents
import { FleetMapTab } from './FleetMapTab';
import { RouteMasterTab } from './RouteMasterTab';
import { DailyTripsTab } from './DailyTripsTab';
import { SafetyEventsTab } from './SafetyEventsTab';
import { AlertsCenterTab } from './AlertsCenterTab';
import { ParentTransportView } from './ParentTransportView';
import { NotOptedBanner } from './NotOptedBanner';
import { CheckInManifestModal } from './CheckInManifestModal';

import { Bus, Plus, Users, Bell, AlertTriangle, Navigation, Clock, FileText, ShieldCheck } from 'lucide-react';

export const TransportPage: React.FC = () => {
  const {
    currentRole,
    currentUser,
    selectedChild,
    parentChildren,
    setSelectedChildId,
    addToast,
  } = useERP();

  // Active Tab for School Admin / Super Admin
  const [activeTab, setActiveTab] = useState<'map' | 'routes' | 'trips' | 'events' | 'alerts'>('map');

  // Core Fleet & Trips State
  const [routes, setRoutes] = useState<TransportRoute[]>(() => transportService.getAllRoutes());
  const [selectedRouteId, setSelectedRouteId] = useState<string>(() => routes[0]?.id || '');
  const [searchTerm, setSearchTerm] = useState('');

  const [trips, setTrips] = useState<TransportTrip[]>(() => transportService.getAllTrips());
  const [safetyEvents, setSafetyEvents] = useState<TransportSafetyEvent[]>(() => safetyEventService.getAllEvents());
  const [alerts, setAlerts] = useState<TransportAlert[]>(() => transportAlertService.getAllAlerts());

  // Filter States
  const [eventFilterType, setEventFilterType] = useState<string>('all');
  const [alertFilterSeverity, setAlertFilterSeverity] = useState<string>('all');

  // Modals State
  const [isAddRouteModalOpen, setIsAddRouteModalOpen] = useState(false);
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  const [checkInTrip, setCheckInTrip] = useState<TransportTrip | null>(null);
  const [checkInStop, setCheckInStop] = useState<string>('');
  const [checkInVerificationMethod, setCheckInVerificationMethod] = useState<'manual_attendant' | 'qr_code' | 'rfid_card' | 'emergency_override'>('manual_attendant');

  // Audit Correction Modal
  const [correctingEvent, setCorrectingEvent] = useState<TransportSafetyEvent | null>(null);
  const [correctionTargetType, setCorrectionTargetType] = useState<'boarded' | 'dropped_off' | 'not_boarded' | 'exception'>('boarded');
  const [correctionReason, setCorrectionReason] = useState('');

  // Broadcast Alert Modal
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [broadcastRouteId, setBroadcastRouteId] = useState<string>('');
  const [broadcastSeverity, setBroadcastSeverity] = useState<'info' | 'warning' | 'urgent'>('warning');
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');

  // Add Route Form State
  const [formRoute, setFormRoute] = useState({
    routeNumber: 'ROUTE-04',
    routeName: 'Koramangala - Ejipura Express',
    vehicleNo: 'KA-01-FA-9901',
    vehicleType: 'Bus' as 'Bus' | 'Mini-Bus' | 'Van',
    driverName: 'Mr. Suresh Reddy',
    driverPhone: '+91 98450 11223',
    attendantName: 'Ms. Meena K',
    attendantPhone: '+91 98450 11224',
    capacity: 45,
    status: 'active' as 'active' | 'maintenance',
  });

  const refreshAllData = () => {
    setRoutes([...transportService.getAllRoutes()]);
    setTrips([...transportService.getAllTrips()]);
    setSafetyEvents([...safetyEventService.getAllEvents()]);
    setAlerts([...transportAlertService.getAllAlerts()]);
  };

  // Determine target student identity for student or parent role
  const targetStudent: Student | null = useMemo(() => {
    if (currentRole === 'student') {
      return (
        (currentUser.referenceId ? studentService.getById(currentUser.referenceId) : null) ||
        studentService.getAll().find(s => s.fullName.toLowerCase() === currentUser.name.toLowerCase()) ||
        null
      );
    }
    if (currentRole === 'parent') {
      return selectedChild || null;
    }
    return null;
  }, [currentRole, currentUser, selectedChild]);

  // Check if student has opted for the school bus transport facility
  const hasOpted = useMemo(() => {
    if (currentRole === 'school_admin' || currentRole === 'super_admin') return true;
    if (!targetStudent) return false;
    return transportService.hasStudentOpted(targetStudent);
  }, [currentRole, targetStudent]);

  // Assigned commute details for opted student
  const commuteDetails: StudentCommuteDetails | null = useMemo(() => {
    if (!targetStudent || !hasOpted) return null;
    return transportService.getStudentCommuteDetails(targetStudent.id);
  }, [targetStudent, hasOpted]);

  // Active route for Map tab
  const activeRoute = useMemo(() => {
    return routes.find(r => r.id === selectedRouteId) || routes[0] || null;
  }, [routes, selectedRouteId]);

  // Active trip for selected route
  const activeTripForRoute = useMemo(() => {
    if (!activeRoute) return null;
    return transportService.getActiveTripForRoute(activeRoute.id) || trips.find(t => t.routeId === activeRoute.id) || null;
  }, [activeRoute, trips]);

  // Parent/Student specific active trip
  const studentActiveTrip = useMemo(() => {
    if (!commuteDetails?.route) return null;
    return transportService.getActiveTripForRoute(commuteDetails.route.id) || trips.find(t => t.routeId === commuteDetails.route.id) || null;
  }, [commuteDetails, trips]);

  // Parent/Student specific safety events
  const studentSafetyEvents = useMemo(() => {
    if (!targetStudent) return [];
    return safetyEvents
      .filter(e => e.studentId === targetStudent.id)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [safetyEvents, targetStudent]);

  // Parent/Student specific alerts
  const studentAlerts = useMemo(() => {
    if (currentRole === 'parent') {
      return transportAlertService.getAlertsForParent(currentUser);
    }
    if (targetStudent && commuteDetails?.route) {
      return alerts.filter(a => a.studentId === targetStudent.id || a.routeId === commuteDetails.route.id);
    }
    return [];
  }, [alerts, currentRole, currentUser, targetStudent, commuteDetails]);

  // --- Actions ---

  const handleCreateRoute = (e: React.FormEvent) => {
    e.preventDefault();
    transportService.createRoute({
      ...formRoute,
      assignedStudentsCount: 0,
      stops: [
        {
          id: 'stop-k1',
          stopName: 'Koramangala BDA Complex',
          pickupTime: '07:15',
          dropTime: '15:45',
          feePerTerm: 18000,
          latitude: 12.9345,
          longitude: 77.6185,
          sequenceOrder: 1,
        },
        {
          id: 'stop-k2',
          stopName: 'Sony World Junction',
          pickupTime: '07:30',
          dropTime: '15:30',
          feePerTerm: 17000,
          latitude: 12.936,
          longitude: 77.625,
          sequenceOrder: 2,
        },
        {
          id: 'stop-k3',
          stopName: 'School Main Campus Arrival',
          pickupTime: '08:15',
          dropTime: '14:45',
          feePerTerm: 0,
          latitude: 12.9352,
          longitude: 77.6245,
          sequenceOrder: 3,
        },
      ],
      schoolLatitude: 12.9352,
      schoolLongitude: 77.6245,
    });

    addToast('success', 'Route Added', `${formRoute.routeNumber} was successfully added.`);
    setIsAddRouteModalOpen(false);
    refreshAllData();
  };

  const handleSimulateStep = (tripId?: string) => {
    const tId = tripId || activeTripForRoute?.id;
    if (!tId) {
      addToast('warning', 'No Active Trip', 'Please select or start a trip before simulating location.');
      return;
    }
    const res = gpsService.simulateStepAlongRoute(tId, 0.35);
    if (res.success && res.update) {
      addToast('info', 'Bus Moved', `Bus is at ${res.update.latitude.toFixed(4)}, ${res.update.longitude.toFixed(4)} • Speed: ${res.update.speedKmH} km/h`);
      refreshAllData();
    } else {
      addToast('error', 'Simulation Error', res.error || 'Failed to move bus');
    }
  };

  const handleStartTrip = (tripId: string) => {
    const res = transportService.startTrip(tripId, currentUser);
    if (res.success) {
      addToast('success', 'Trip Started', 'Bus has departed. Live tracking is active.');
      refreshAllData();
    } else {
      addToast('error', 'Could Not Start Trip', res.error || 'Unknown error');
    }
  };

  const handleEndTrip = (tripId: string) => {
    const res = transportService.endTrip(tripId, currentUser);
    if (res.success) {
      addToast('success', 'Trip Completed', 'Bus has arrived safely and completed this route.');
      refreshAllData();
    } else {
      addToast('error', 'Could Not End Trip', res.error || 'Unknown error');
    }
  };

  const openCheckInModal = (trip: TransportTrip) => {
    setCheckInTrip(trip);
    const r = routes.find(rt => rt.id === trip.routeId);
    setCheckInStop(r?.stops[0]?.stopName || 'First Stop');
    setIsCheckInModalOpen(true);
  };

  const handleRecordStudentEvent = (studentId: string, eventType: 'boarded' | 'dropped_off' | 'not_boarded' | 'exception') => {
    if (!checkInTrip) return;

    const r = routes.find(rt => rt.id === checkInTrip.routeId);
    const stopObj = r?.stops.find(s => s.stopName === checkInStop);

    const res = safetyEventService.recordSafetyEvent(
      {
        studentId,
        tripId: checkInTrip.id,
        routeId: checkInTrip.routeId,
        eventType,
        stopId: stopObj?.id,
        stopName: checkInStop,
        verificationMethod: checkInVerificationMethod,
        notes: `Recorded at ${checkInStop}`,
      },
      currentUser
    );

    if (res.success) {
      addToast(
        eventType === 'dropped_off' ? 'success' : 'info',
        'Attendance Updated',
        `Student marked as ${eventType === 'boarded' ? 'Boarded' : eventType === 'dropped_off' ? 'Dropped Off' : 'Absent'}`
      );
      refreshAllData();
    } else {
      addToast('warning', 'Action Blocked', res.error || 'Could not record event.');
    }
  };

  const handleSaveCorrection = () => {
    if (!correctingEvent) return;
    if (!correctionReason.trim()) {
      addToast('error', 'Reason Required', 'Please provide a brief reason for changing this attendance record.');
      return;
    }

    const res = safetyEventService.correctSafetyEvent(
      correctingEvent.id,
      correctionTargetType,
      correctionReason.trim(),
      currentUser
    );

    if (res.success) {
      addToast('success', 'Record Corrected', 'Student attendance record has been updated.');
      setCorrectingEvent(null);
      setCorrectionReason('');
      refreshAllData();
    } else {
      addToast('error', 'Correction Failed', res.error || 'Failed to update record');
    }
  };

  const handleAcknowledgeAlert = (alertId: string) => {
    const res = transportAlertService.acknowledgeAlert(alertId, currentUser);
    if (res.success) {
      addToast('success', 'Alert Acknowledged', 'Marked as reviewed.');
      refreshAllData();
    }
  };

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
      addToast('error', 'Required Fields Missing', 'Please enter a title and message.');
      return;
    }

    const targetRoute = routes.find(r => r.id === broadcastRouteId) || routes[0];
    const trip = transportService.getActiveTripForRoute(targetRoute.id) || trips[0];

    const res = transportAlertService.createAlert({
      tripId: trip?.id || 'manual-broadcast',
      routeId: targetRoute.id,
      busNumber: targetRoute.routeNumber,
      alertType: 'trip_delayed',
      severity: broadcastSeverity,
      title: broadcastTitle,
      message: broadcastMessage,
    });

    if (res.success) {
      addToast('success', 'Alert Sent', 'Notification delivered to parents on this route.');
      setIsBroadcastModalOpen(false);
      setBroadcastTitle('');
      setBroadcastMessage('');
      refreshAllData();
    } else {
      addToast('warning', 'Could Not Send', res.error || 'Alert not sent.');
    }
  };

  // Filtered Collections
  const filteredRoutes = useMemo(() => {
    if (!searchTerm.trim()) return routes;
    const term = searchTerm.toLowerCase();
    return routes.filter(
      r =>
        r.routeNumber.toLowerCase().includes(term) ||
        r.routeName.toLowerCase().includes(term) ||
        r.driverName.toLowerCase().includes(term) ||
        r.vehicleNo.toLowerCase().includes(term) ||
        r.stops.some(s => s.stopName.toLowerCase().includes(term))
    );
  }, [routes, searchTerm]);

  const filteredEvents = useMemo(() => {
    if (eventFilterType === 'all') return safetyEvents;
    return safetyEvents.filter(e => e.eventType === eventFilterType);
  }, [safetyEvents, eventFilterType]);

  const filteredAlerts = useMemo(() => {
    if (alertFilterSeverity === 'all') return alerts;
    return alerts.filter(a => a.severity === alertFilterSeverity);
  }, [alerts, alertFilterSeverity]);

  const assignedStudentsForTrip = useMemo(() => {
    if (!checkInTrip) return [];
    return transportService.getAssignedStudents(checkInTrip.routeId);
  }, [checkInTrip]);

  // ==========================================
  // CASE 1: STUDENT / PARENT WHO HAS NOT OPTED OR NO COMMUTE DETAILS ASSIGNED
  // ==========================================
  if ((currentRole === 'student' || currentRole === 'parent') && (!hasOpted || !commuteDetails)) {
    return (
      <NotOptedBanner
        currentRole={currentRole}
        targetStudent={targetStudent}
        parentChildren={parentChildren}
        selectedChild={selectedChild || null}
        onSelectChild={setSelectedChildId}
        hasStudentOpted={s => transportService.hasStudentOpted(s)}
      />
    );
  }

  // ==========================================
  // CASE 2: STUDENT / PARENT WHO HAS OPTED (ASSIGNED BUS & LIVE GPS)
  // ==========================================
  if ((currentRole === 'student' || currentRole === 'parent') && hasOpted && commuteDetails) {
    return (
      <ParentTransportView
        currentRole={currentRole}
        targetStudent={targetStudent}
        parentChildren={parentChildren}
        selectedChild={selectedChild || null}
        onSelectChild={setSelectedChildId}
        hasStudentOpted={s => transportService.hasStudentOpted(s)}
        commuteDetails={commuteDetails}
        activeTrip={studentActiveTrip}
        latestEvent={studentSafetyEvents[0]}
        alerts={studentAlerts}
        onSimulateStep={() => handleSimulateStep(studentActiveTrip?.id)}
      />
    );
  }

  // ==========================================
  // CASE 3: ADMINISTRATOR & FLEET CONSOLE
  // ==========================================
  const activeTripsCount = trips.filter(
    t => t.status === 'in_transit' || t.status === 'arrived_at_school'
  ).length;

  const totalCommuters = routes.reduce(
    (acc, r) => acc + (r.assignedStudentsCount || 0),
    0
  );

  const pendingAlertsCount = alerts.filter(
    a => !a.acknowledgedBy || (Array.isArray(a.acknowledgedBy) && a.acknowledgedBy.length === 0)
  ).length;

  return (
    <div className="transport-container">
      {/* Professional Fleet Operations Header */}
      <div className="transport-mission-header">
        <div className="transport-mission-title">
          <div className="transport-breadcrumb-row">
            <span className="transport-breadcrumb-item">Operations</span>
            <span className="transport-breadcrumb-separator">/</span>
            <span className="transport-breadcrumb-item active">Transport & Fleet Management</span>
          </div>
          <h1>School Transport & Fleet Operations</h1>
          <p>
            Live vehicle tracking, student route manifests, and transport safety for St. Xavier's Senior Secondary School
          </p>
        </div>

        <div className="transport-header-right-col">
          <div className="transport-shift-card">
            <div className="transport-shift-indicator">
              <span className="transport-shift-pulse" />
            </div>
            <div className="transport-shift-details">
              <span className="transport-shift-name">Morning Shift (06:30 – 08:30 AM)</span>
              <span className="transport-shift-status">All Routes Active • GPS Synchronized</span>
            </div>
          </div>

          <div className="transport-header-actions">
            <button className="btn btn-outline btn-sm" onClick={() => setIsBroadcastModalOpen(true)}>
              <AlertTriangle size={14} />
              <span>Send Route Alert</span>
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => setIsAddRouteModalOpen(true)}>
              <Plus size={14} />
              <span>Add Bus Route</span>
            </button>
          </div>
        </div>
      </div>

      {/* Fleet Operations Telemetry KPI Strip */}
      <div className="transport-operations-grid">
        <div className="transport-op-card">
          <div className="transport-op-header">
            <span className="transport-op-label">Buses in Transit</span>
            <div className="transport-op-icon-wrap">
              <Bus size={16} />
            </div>
          </div>
          <div className="transport-op-value">
            {activeTripsCount} <span className="transport-op-subtext">/ {routes.length} Active</span>
          </div>
          <div className="transport-op-footer">
            {routes.length - activeTripsCount} Standby at Campus Depot • Live GPS lock
          </div>
        </div>

        <div className="transport-op-card">
          <div className="transport-op-header">
            <span className="transport-op-label">Assigned Students</span>
            <div className="transport-op-icon-wrap">
              <Users size={16} />
            </div>
          </div>
          <div className="transport-op-value">
            {totalCommuters} <span className="transport-op-subtext">Students</span>
          </div>
          <div className="transport-op-footer">
            Across {routes.length} morning & afternoon bus routes
          </div>
        </div>

        <div className="transport-op-card">
          <div className="transport-op-header">
            <span className="transport-op-label">Speed & Route Compliance</span>
            <div className="transport-op-icon-wrap">
              <ShieldCheck size={16} />
            </div>
          </div>
          <div className="transport-op-value">
            100% <span className="transport-op-subtext">Enforced</span>
          </div>
          <div className="transport-op-footer">
            Speed limit 40 km/h • Geofence active
          </div>
        </div>

        <div className="transport-op-card">
          <div className="transport-op-header">
            <span className="transport-op-label">Active Advisories</span>
            <div className="transport-op-icon-wrap">
              <Bell size={16} />
            </div>
          </div>
          <div className="transport-op-value">
            {pendingAlertsCount} <span className="transport-op-subtext">Pending</span>
          </div>
          <div className="transport-op-footer">
            {alerts.length} Total system alerts and traffic notices logged today
          </div>
        </div>
      </div>

      {/* Operations Navigation Tabs */}
      <div className="transport-tabs-nav">
        <button
          className={`transport-tab-item ${activeTab === 'map' ? 'active' : ''}`}
          onClick={() => setActiveTab('map')}
        >
          <Navigation size={14} />
          <span>Live Fleet Tracking</span>
        </button>

        <button
          className={`transport-tab-item ${activeTab === 'routes' ? 'active' : ''}`}
          onClick={() => setActiveTab('routes')}
        >
          <Bus size={14} />
          <span>Routes & Stops</span>
          <span className="transport-tab-count">{routes.length}</span>
        </button>

        <button
          className={`transport-tab-item ${activeTab === 'trips' ? 'active' : ''}`}
          onClick={() => setActiveTab('trips')}
        >
          <Clock size={14} />
          <span>Trip Logs</span>
          <span className="transport-tab-count">{trips.length}</span>
        </button>

        <button
          className={`transport-tab-item ${activeTab === 'events' ? 'active' : ''}`}
          onClick={() => setActiveTab('events')}
        >
          <FileText size={14} />
          <span>Student Attendance</span>
          <span className="transport-tab-count">{safetyEvents.length}</span>
        </button>

        <button
          className={`transport-tab-item ${activeTab === 'alerts' ? 'active' : ''}`}
          onClick={() => setActiveTab('alerts')}
        >
          <Bell size={14} />
          <span>Alerts & Notices</span>
          {pendingAlertsCount > 0 && (
            <span className="transport-tab-count transport-tab-count-alert">
              {pendingAlertsCount}
            </span>
          )}
        </button>
      </div>

      {/* Tab Content Views */}
      {activeTab === 'map' && (
        <FleetMapTab
          routes={routes}
          selectedRouteId={selectedRouteId}
          onSelectRouteId={setSelectedRouteId}
          activeRoute={activeRoute}
          activeTrip={activeTripForRoute}
          onSimulateStep={() => handleSimulateStep(activeTripForRoute?.id)}
          onStartTrip={handleStartTrip}
          onEndTrip={handleEndTrip}
          onOpenCheckIn={openCheckInModal}
        />
      )}

      {activeTab === 'routes' && (
        <RouteMasterTab
          routes={filteredRoutes}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
        />
      )}

      {activeTab === 'trips' && (
        <DailyTripsTab
          trips={trips}
          routes={routes}
          onOpenCheckIn={openCheckInModal}
          onStartTrip={handleStartTrip}
          onEndTrip={handleEndTrip}
        />
      )}

      {activeTab === 'events' && (
        <SafetyEventsTab
          events={filteredEvents}
          filterType={eventFilterType}
          onFilterChange={setEventFilterType}
          onRefresh={refreshAllData}
          onOpenCorrection={evt => {
            setCorrectingEvent(evt);
            setCorrectionTargetType(evt.eventType);
          }}
        />
      )}

      {activeTab === 'alerts' && (
        <AlertsCenterTab
          alerts={filteredAlerts}
          severityFilter={alertFilterSeverity}
          onSeverityFilterChange={setAlertFilterSeverity}
          onOpenBroadcast={() => setIsBroadcastModalOpen(true)}
          onAcknowledgeAlert={handleAcknowledgeAlert}
        />
      )}

      {/* Modal 1: Student Boarding Check-in Manifest */}
      {isCheckInModalOpen && checkInTrip && (
        <CheckInManifestModal
          isOpen={isCheckInModalOpen}
          onClose={() => setIsCheckInModalOpen(false)}
          trip={checkInTrip}
          route={routes.find(r => r.id === checkInTrip.routeId)}
          assignedStudents={assignedStudentsForTrip}
          safetyEvents={safetyEvents}
          checkInStop={checkInStop}
          onCheckInStopChange={setCheckInStop}
          verificationMethod={checkInVerificationMethod}
          onVerificationMethodChange={setCheckInVerificationMethod}
          onRecordStudentEvent={handleRecordStudentEvent}
        />
      )}

      {/* Modal 2: Attendance Record Correction Modal */}
      {correctingEvent && (
        <Modal
          isOpen={!!correctingEvent}
          onClose={() => setCorrectingEvent(null)}
          title={`Edit Attendance — ${correctingEvent.studentName}`}
          size="normal"
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setCorrectingEvent(null)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSaveCorrection}>
                Save Changes
              </button>
            </>
          }
        >
          <div>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
              Updating this record will save an audit note with your name and timestamp.
            </p>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label">Recorded Status</label>
              <input
                type="text"
                className="form-input"
                disabled
                value={`${correctingEvent.eventType.replace('_', ' ').toUpperCase()} at ${correctingEvent.timestamp.split('T')[1]?.substring(0, 5) || correctingEvent.timestamp}`}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label required">Change Status To</label>
              <select
                className="form-select"
                value={correctionTargetType}
                onChange={e => setCorrectionTargetType(e.target.value as any)}
              >
                <option value="boarded">Boarded</option>
                <option value="dropped_off">Dropped Off</option>
                <option value="not_boarded">Absent</option>
                <option value="exception">Flagged Exception</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label required">Reason for Edit</label>
              <textarea
                className="form-input"
                rows={3}
                placeholder="e.g. Student boarded at next stop; attendant corrected attendance."
                value={correctionReason}
                onChange={e => setCorrectionReason(e.target.value)}
                required
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Modal 3: Send Bus Alert */}
      {isBroadcastModalOpen && (
        <Modal
          isOpen={isBroadcastModalOpen}
          onClose={() => setIsBroadcastModalOpen(false)}
          title="Send Route Alert"
          size="normal"
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setIsBroadcastModalOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSendBroadcast}>
                Send Notification
              </button>
            </>
          }
        >
          <form onSubmit={handleSendBroadcast}>
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label required">Select Bus Route</label>
              <select
                className="form-select"
                value={broadcastRouteId}
                onChange={e => setBroadcastRouteId(e.target.value)}
              >
                {routes.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.routeNumber} — {r.routeName}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label required">Priority</label>
              <select
                className="form-select"
                value={broadcastSeverity}
                onChange={e => setBroadcastSeverity(e.target.value as any)}
              >
                <option value="info">Info (Schedule update, minor delay)</option>
                <option value="warning">Warning (Traffic delay, weather)</option>
                <option value="urgent">Urgent (Breakdown, route change)</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label required">Title</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 15-Minute Traffic Delay on Old Airport Road"
                value={broadcastTitle}
                onChange={e => setBroadcastTitle(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label required">Message for Parents</label>
              <textarea
                className="form-input"
                rows={3}
                placeholder="Explain the delay and updated arrival time..."
                value={broadcastMessage}
                onChange={e => setBroadcastMessage(e.target.value)}
                required
              />
            </div>
          </form>
        </Modal>
      )}

      {/* Modal 4: Add Route */}
      {isAddRouteModalOpen && (
        <Modal
          isOpen={isAddRouteModalOpen}
          onClose={() => setIsAddRouteModalOpen(false)}
          title="Add Bus Route"
          size="normal"
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setIsAddRouteModalOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleCreateRoute}>
                Save Route
              </button>
            </>
          }
        >
          <form onSubmit={handleCreateRoute}>
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label required">Route Number</label>
                <input
                  type="text"
                  className="form-input"
                  value={formRoute.routeNumber}
                  onChange={e => setFormRoute({ ...formRoute, routeNumber: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label required">Route Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={formRoute.routeName}
                  onChange={e => setFormRoute({ ...formRoute, routeName: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label required">Vehicle Number</label>
                <input
                  type="text"
                  className="form-input"
                  value={formRoute.vehicleNo}
                  onChange={e => setFormRoute({ ...formRoute, vehicleNo: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label required">Vehicle Type</label>
                <select
                  className="form-select"
                  value={formRoute.vehicleType}
                  onChange={e => setFormRoute({ ...formRoute, vehicleType: e.target.value as any })}
                >
                  <option value="Bus">Standard School Bus (45-50 Seats)</option>
                  <option value="Mini-Bus">Mini-Bus (25-30 Seats)</option>
                  <option value="Van">Van / Shuttle (12-15 Seats)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label required">Driver Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={formRoute.driverName}
                  onChange={e => setFormRoute({ ...formRoute, driverName: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label required">Driver Phone</label>
                <input
                  type="tel"
                  className="form-input"
                  value={formRoute.driverPhone}
                  onChange={e => setFormRoute({ ...formRoute, driverPhone: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Attendant Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={formRoute.attendantName}
                  onChange={e => setFormRoute({ ...formRoute, attendantName: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Attendant Phone</label>
                <input
                  type="tel"
                  className="form-input"
                  value={formRoute.attendantPhone}
                  onChange={e => setFormRoute({ ...formRoute, attendantPhone: e.target.value })}
                />
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
