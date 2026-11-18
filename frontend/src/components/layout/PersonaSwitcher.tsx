// ==========================================
// Custom Professional Persona Switcher Component
// Developed by NTS Novalytix
// ==========================================

import React, { useState, useRef, useEffect } from 'react';
import { useERP } from '../../context/ERPContext';
import { UserRole } from '../../types';
import {
  ShieldCheck,
  Users,
  GraduationCap,
  Building2,
  Package,
  Check,
  ChevronsUpDown,
  UserCheck,
  Sparkles,
} from 'lucide-react';

interface RoleOption {
  role: UserRole;
  label: string;
  persona: string;
  icon: React.ComponentType<{ size?: number; className?: string; color?: string }>;
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    role: 'school_admin',
    label: 'School Admin',
    persona: 'Dr. Swaminathan • Principal',
    icon: ShieldCheck,
  },
  {
    role: 'teacher',
    label: 'Teacher',
    persona: 'Mrs. Ananya Sharma • PGT',
    icon: Users,
  },
  {
    role: 'parent',
    label: 'Parent',
    persona: 'Mr. Vikram Patel • Guardian',
    icon: UserCheck,
  },
  {
    role: 'student',
    label: 'Student',
    persona: 'Aarav Patel • Class 10-A',
    icon: GraduationCap,
  },
  {
    role: 'super_admin',
    label: 'Super Admin',
    persona: 'Vikramaditya Rao • System Admin',
    icon: Building2,
  },
  {
    role: 'supplier',
    label: 'Supplier',
    persona: 'Apex Supplies • Vendor',
    icon: Package,
  },
];

interface PersonaSwitcherProps {
  collapsed?: boolean;
}

export const PersonaSwitcher: React.FC<PersonaSwitcherProps> = ({ collapsed = false }) => {
  const { currentRole, switchRole, addToast } = useERP();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Active option
  const activeOption = ROLE_OPTIONS.find(r => r.role === currentRole) || ROLE_OPTIONS[0];
  const ActiveIcon = activeOption.icon;

  // Click outside and Escape key handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelectRole = (role: UserRole, label: string) => {
    if (role !== currentRole) {
      switchRole(role);
      addToast('info', 'Persona Switched', `Workspace updated for ${label}`);
    }
    setIsOpen(false);
  };

  return (
    <div className="persona-switcher-container" ref={containerRef}>
      {/* Trigger Button */}
      {!collapsed ? (
        <button
          type="button"
          className={`persona-trigger-btn ${isOpen ? 'active' : ''}`}
          onClick={() => setIsOpen(!isOpen)}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          title="Switch Demo Role Persona"
        >
          <div className="persona-avatar-badge">
            <ActiveIcon size={16} color="#3B82F6" />
          </div>

          <div className="persona-text-content">
            <span className="persona-role-title">{activeOption.label}</span>
            <span className="persona-subtext">{activeOption.persona.split('•')[0].trim()}</span>
          </div>

          <ChevronsUpDown size={14} className="persona-chevron" />
        </button>
      ) : (
        <button
          type="button"
          className={`persona-trigger-collapsed ${isOpen ? 'active' : ''}`}
          onClick={() => setIsOpen(!isOpen)}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          title={`Active Persona: ${activeOption.label} (Click to switch)`}
        >
          <ActiveIcon size={18} color="#3B82F6" />
        </button>
      )}

      {/* Upward Custom Popover Menu */}
      {isOpen && (
        <div
          className={`persona-popover-menu ${collapsed ? 'popover-collapsed' : ''}`}
          role="listbox"
          aria-label="Available Role Personas"
        >
          <div className="persona-popover-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={13} color="#3B82F6" />
              <span className="persona-popover-heading">DEMO ROLE PERSONAS</span>
            </div>
            <span className="persona-popover-hint">Instant Workspace Switch</span>
          </div>

          <div className="persona-options-list">
            {ROLE_OPTIONS.map(option => {
              const Icon = option.icon;
              const isSelected = option.role === currentRole;

              return (
                <button
                  key={option.role}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`persona-option-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelectRole(option.role, option.label)}
                >
                  <div className={`persona-option-icon ${isSelected ? 'selected' : ''}`}>
                    <Icon size={16} />
                  </div>

                  <div className="persona-option-info">
                    <span className="persona-option-label">{option.label}</span>
                    <span className="persona-option-persona">{option.persona}</span>
                  </div>

                  {isSelected && (
                    <div className="persona-selected-check">
                      <Check size={14} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

