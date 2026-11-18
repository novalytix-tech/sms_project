// ==========================================
// Messaging & Communication Center
// Developed by NTS Novalytix
// ==========================================

import React, { useState } from 'react';
import { messageService } from '../../services/messageService';
import { Message, UserRole } from '../../types';
import { Modal } from '../../components/common/Modal';
import { useERP } from '../../context/ERPContext';
import { Send, Mail, Inbox, PenSquare } from 'lucide-react';

export const MessagesPage: React.FC = () => {
  const { currentRole, currentUser, addToast } = useERP();
  const [messages, setMessages] = useState<Message[]>(() =>
    messageService.getForUser(currentUser.id, currentRole)
  );

  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  const [composeForm, setComposeForm] = useState({
    recipientName: 'Mrs. Ananya Sharma',
    recipientRole: 'teacher' as UserRole,
    recipientId: 'teach-1',
    subject: '',
    body: '',
  });

  const [replyText, setReplyText] = useState('');

  const refreshList = () => {
    setMessages(messageService.getForUser(currentUser.id, currentRole));
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeForm.subject.trim() || !composeForm.body.trim()) return;

    messageService.sendMessage({
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentRole,
      recipientId: composeForm.recipientId,
      recipientName: composeForm.recipientName,
      recipientRole: composeForm.recipientRole,
      subject: composeForm.subject,
      body: composeForm.body,
    });

    addToast('success', 'Message Sent', `Dispatched to ${composeForm.recipientName}.`);
    setIsComposeOpen(false);
    setComposeForm({
      recipientName: 'Mrs. Ananya Sharma',
      recipientRole: 'teacher',
      recipientId: 'teach-1',
      subject: '',
      body: '',
    });
    refreshList();
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMessage || !replyText.trim()) return;

    messageService.sendMessage({
      conversationId: selectedMessage.conversationId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentRole,
      recipientId: selectedMessage.senderId,
      recipientName: selectedMessage.senderName,
      recipientRole: selectedMessage.senderRole,
      subject: `Re: ${selectedMessage.subject}`,
      body: replyText.trim(),
    });

    addToast('success', 'Reply Sent', `Reply sent to ${selectedMessage.senderName}.`);
    setReplyText('');
    refreshList();
  };

  const handleSelectMessage = (msg: Message) => {
    setSelectedMessage(msg);
    if (!msg.isRead && msg.recipientId === currentUser.id) {
      messageService.markAsRead(msg.id);
      refreshList();
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <h1>Messages</h1>
          <p className="page-subtitle">
            Direct communication between parents, teachers, and staff
          </p>
        </div>

        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => setIsComposeOpen(true)}>
            <PenSquare size={16} />
            <span>New Message</span>
          </button>
        </div>
      </div>

      {/* 2-Pane Message Workspace */}
      <div className="dashboard-two-col" style={{ alignItems: 'start' }}>
        {/* Left Pane: Inbox Message List */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <Inbox size={18} color="#3B82F6" />
              Conversation Inbox ({messages.length})
            </h3>
          </div>
          <div className="card-body" style={{ padding: '0' }}>
            {messages.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
                Your messaging inbox is currently empty.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {messages.map(msg => {
                  const isSelected = selectedMessage?.id === msg.id;
                  const isIncoming = msg.recipientId === currentUser.id;

                  return (
                    <div
                      key={msg.id}
                      onClick={() => handleSelectMessage(msg)}
                      style={{
                        padding: '14px 18px',
                        borderBottom: '1px solid #E2E8F0',
                        cursor: 'pointer',
                        background: isSelected ? '#DBEAFE' : !msg.isRead && isIncoming ? '#F6F8FC' : '#FFFFFF',
                        borderLeft: isSelected ? '4px solid #3B82F6' : !msg.isRead && isIncoming ? '4px solid #b91c1c' : '4px solid transparent',
                        transition: 'background 150ms ease',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, fontSize: '13px', color: '#0F172A' }}>
                          {isIncoming ? msg.senderName : `To: ${msg.recipientName}`}
                        </span>
                        <span style={{ fontSize: '10px', color: '#94A3B8' }}>{msg.timestamp}</span>
                      </div>

                      <div style={{ fontWeight: 600, fontSize: '12px', color: '#3B82F6', margin: '2px 0' }}>
                        {msg.subject}
                      </div>

                      <p
                        style={{
                          fontSize: '11px',
                          color: '#64748B',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {msg.body}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Pane: Message Viewer & Reply Box */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <Mail size={18} color="#15803d" />
              Message Viewer
            </h3>
          </div>

          <div className="card-body">
            {selectedMessage ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: '12px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>
                    {selectedMessage.subject}
                  </h2>
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '6px' }}>
                    <strong>From:</strong> {selectedMessage.senderName} ({selectedMessage.senderRole.replace('_', ' ')}) • <strong>Date:</strong> {selectedMessage.timestamp}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>
                    <strong>To:</strong> {selectedMessage.recipientName} ({selectedMessage.recipientRole.replace('_', ' ')})
                  </div>
                </div>

                <div
                  style={{
                    background: '#fffaf9',
                    border: '1px solid #E2E8F0',
                    padding: '16px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    lineHeight: '1.6',
                    color: '#1E293B',
                  }}
                >
                  {selectedMessage.body}
                </div>

                {/* Reply Form */}
                <form onSubmit={handleSendReply} style={{ marginTop: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Write Direct Reply</label>
                    <textarea
                      className="form-textarea"
                      rows={3}
                      placeholder={`Reply to ${selectedMessage.senderName}...`}
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-primary btn-sm">
                    <Send size={13} />
                    <span>Send Reply</span>
                  </button>
                </form>
              </div>
            ) : (
              <div style={{ padding: '60px', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>
                Select a message thread from the left pane to read conversations or reply.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Compose Modal */}
      {isComposeOpen && (
        <Modal
          isOpen={isComposeOpen}
          onClose={() => setIsComposeOpen(false)}
          title="New Message"
          size="normal"
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setIsComposeOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSendMessage}>
                Send Message
              </button>
            </>
          }
        >
          <form onSubmit={handleSendMessage}>
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label required">Recipient Category</label>
                <select
                  className="form-select"
                  value={composeForm.recipientRole}
                  onChange={e => {
                    const role = e.target.value as UserRole;
                    let recipientName = 'Office of Principal';
                    let recipientId = 'user-school-admin';
                    if (role === 'teacher') {
                      recipientName = 'Mrs. Ananya Sharma';
                      recipientId = 'teach-1';
                    } else if (role === 'parent') {
                      recipientName = 'Mr. Vikram Patel';
                      recipientId = 'parent-patel';
                    } else if (role === 'supplier') {
                      recipientName = 'Apex Educational Supplies';
                      recipientId = 'supp-1';
                    }
                    setComposeForm({
                      ...composeForm,
                      recipientRole: role,
                      recipientName,
                      recipientId,
                    });
                  }}
                >
                  <option value="school_admin">School Administration / Principal</option>
                  <option value="teacher">Class / Subject Teacher</option>
                  <option value="parent">Parent / Guardian</option>
                  <option value="supplier">Vendor / Supplier</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label required">Recipient Contact</label>
                <input
                  type="text"
                  className="form-input"
                  value={composeForm.recipientName}
                  onChange={e => setComposeForm({ ...composeForm, recipientName: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label required">Subject Line</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Query regarding Mid-Term timetable"
                value={composeForm.subject}
                onChange={e => setComposeForm({ ...composeForm, subject: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label required">Message Content</label>
              <textarea
                className="form-textarea"
                rows={5}
                placeholder="Type your message..."
                value={composeForm.body}
                onChange={e => setComposeForm({ ...composeForm, body: e.target.value })}
                required
              />
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

