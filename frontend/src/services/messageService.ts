// ==========================================
// Messaging & Notification Service - Mock Implementation
// Developed by NTS Novalytix
// ==========================================

import { Message, UserRole } from '../types';
import { ERPStorage } from './storage';

export const messageService = {
  getAll: (): Message[] => {
    return ERPStorage.get().messages;
  },

  getForUser: (userId: string, role?: UserRole): Message[] => {
    return ERPStorage.get().messages.filter(m => {
      const isRecipient = m.recipientId === userId || (role && m.recipientRole === role);
      const isSender = m.senderId === userId;
      return isRecipient || isSender;
    });
  },

  sendMessage: (
    data: Omit<Message, 'id' | 'timestamp' | 'isRead' | 'conversationId'> & { conversationId?: string }
  ): Message => {
    const store = ERPStorage.get();
    const now = new Date();
    const timeFormatted = `${now.toISOString().split('T')[0]} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newMsg: Message = {
      ...data,
      id: `msg-${Date.now()}`,
      conversationId: data.conversationId || `conv-${Date.now()}`,
      timestamp: timeFormatted,
      isRead: false,
    };

    store.messages = [newMsg, ...store.messages];
    ERPStorage.set(store);
    return newMsg;
  },

  markAsRead: (id: string): void => {
    const store = ERPStorage.get();
    const msg = store.messages.find(m => m.id === id);
    if (msg) {
      msg.isRead = true;
      ERPStorage.set(store);
    }
  },
};

