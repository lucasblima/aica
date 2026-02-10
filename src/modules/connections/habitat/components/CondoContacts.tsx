/**
 * CONDO CONTACTS
 * Quick access to property-related contacts
 */

import React from 'react';
import type { HabitatProperty } from '../types';

interface CondoContactsProps {
  property: HabitatProperty;
}

interface Contact {
  name: string;
  role: string;
  phone?: string;
  email?: string;
  icon: string;
}

export const CondoContacts: React.FC<CondoContactsProps> = ({ property }) => {
  const contacts: Contact[] = [];

  // Build contacts list
  if (property.portaria_phone) {
    contacts.push({
      name: 'Portaria',
      role: 'Portaria do condomínio',
      phone: property.portaria_phone,
      icon: '🏢',
    });
  }

  if (property.sindico_name) {
    contacts.push({
      name: property.sindico_name,
      role: 'Síndico',
      phone: property.sindico_phone,
      icon: '👤',
    });
  }

  if (property.administradora_name) {
    contacts.push({
      name: property.administradora_name,
      role: 'Administradora',
      phone: property.administradora_phone,
      email: property.administradora_email,
      icon: '🏛️',
    });
  }

  if (contacts.length === 0) {
    return null;
  }

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const handleEmail = (email: string) => {
    window.location.href = `mailto:${email}`;
  };

  return (
    <div className="bg-ceramic-base border-2 border-ceramic-border rounded-lg p-6">
      <h3 className="text-lg font-bold text-ceramic-text-primary mb-4">Contatos</h3>

      <div className="space-y-3">
        {contacts.map((contact, index) => (
          <div
            key={index}
            className="p-4 bg-amber-50 border-2 border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
          >
            <div className="flex items-start gap-3">
              <span className="text-3xl">{contact.icon}</span>
              <div className="flex-1">
                <div className="font-semibold text-ceramic-text-primary">{contact.name}</div>
                <div className="text-sm text-ceramic-text-secondary mb-2">{contact.role}</div>

                <div className="flex flex-wrap gap-2">
                  {contact.phone && (
                    <button
                      onClick={() => handleCall(contact.phone!)}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-ceramic-success text-white text-sm font-medium rounded-lg hover:bg-ceramic-success/90 transition-colors"
                    >
                      <span>📞</span>
                      <span>{contact.phone}</span>
                    </button>
                  )}
                  {contact.email && (
                    <button
                      onClick={() => handleEmail(contact.email!)}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-ceramic-info text-white text-sm font-medium rounded-lg hover:bg-ceramic-info/90 transition-colors"
                    >
                      <span>✉️</span>
                      <span>{contact.email}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
