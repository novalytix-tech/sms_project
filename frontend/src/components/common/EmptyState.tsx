// ==========================================
// Empty State Component
// Developed by NTS Novalytix
// ==========================================

import React from 'react';
import { FolderOpen } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No records found',
  description = 'There are no items matching your criteria. Try adjusting your search or filters.',
  icon,
  action,
}) => {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        {icon || <FolderOpen size={28} />}
      </div>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-desc">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
};

