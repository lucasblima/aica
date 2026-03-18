/**
 * Copyright (c) 2024 - Present. Aica Engineering. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * ContactSlide - CTA e informações de contato
 * Issue #117 - Presentation Generator
 */

import React from 'react';
import type { BaseSlideProps, ContactSlideContent } from '@/modules/grants/types/presentation';
import { EditableText } from '../canvas/EditableText';
import { Mail, Phone, Globe, QrCode } from 'lucide-react';

export function ContactSlide({
  content,
  template,
  editMode = false,
  onChange,
}: BaseSlideProps<ContactSlideContent>) {
  const handleChange = (field: keyof ContactSlideContent, value: any) => {
    if (onChange) {
      onChange({ ...content, [field]: value });
    }
  };

  return (
    <div className="w-full h-full p-24">
      <div className="grid grid-cols-2 gap-16 h-full items-center">
        {/* Left side - CTA and contact info */}
        <div>
          {/* Organization name */}
          <EditableText
            value={content.organizationName}
            onChange={(v) => handleChange('organizationName', v)}
            tag="h2"
            className="mb-8"
            editMode={editMode}
            placeholder="Nome da Organizacao"
          />

          {/* Call to action */}
          <EditableText
            value={content.callToAction}
            onChange={(v) => handleChange('callToAction', v)}
            tag="h1"
            className="mb-12"
            editMode={editMode}
            placeholder="Vamos fazer acontecer juntos!"
            multiline
          />

          {/* Contact details */}
          <div className="space-y-6">
            {/* Contact person */}
            <div>
              <p className="text-sm opacity-70 mb-1">CONTATO</p>
              <EditableText
                value={content.contactName}
                onChange={(v) => handleChange('contactName', v)}
                tag="p"
                className="text-2xl font-semibold"
                editMode={editMode}
                placeholder="Nome do Contato"
              />
            </div>

            {/* Email */}
            <div className="flex items-center gap-4">
              <Mail className="w-6 h-6 flex-shrink-0 opacity-70" />
              <EditableText
                value={content.email}
                onChange={(v) => handleChange('email', v)}
                tag="p"
                className="text-xl"
                editMode={editMode}
                placeholder="email@organizacao.com"
              />
            </div>

            {/* Phone */}
            {(content.phone || editMode) && (
              <div className="flex items-center gap-4">
                <Phone className="w-6 h-6 flex-shrink-0 opacity-70" />
                <EditableText
                  value={content.phone || ''}
                  onChange={(v) => handleChange('phone', v)}
                  tag="p"
                  className="text-xl"
                  editMode={editMode}
                  placeholder="(00) 0000-0000"
                />
              </div>
            )}

            {/* Website */}
            {(content.website || editMode) && (
              <div className="flex items-center gap-4">
                <Globe className="w-6 h-6 flex-shrink-0 opacity-70" />
                <EditableText
                  value={content.website || ''}
                  onChange={(v) => handleChange('website', v)}
                  tag="p"
                  className="text-xl"
                  editMode={editMode}
                  placeholder="www.organizacao.com"
                />
              </div>
            )}

            {/* Social links */}
            {content.socialLinks && Object.keys(content.socialLinks).length > 0 && (
              <div className="mt-8">
                <p className="text-sm opacity-70 mb-3">REDES SOCIAIS</p>
                <div className="flex gap-4">
                  {Object.entries(content.socialLinks).map(([platform, url]) => (
                    <EditableText
                      key={platform}
                      value={url}
                      onChange={(v) => {
                        const newLinks = { ...content.socialLinks, [platform]: v };
                        handleChange('socialLinks', newLinks);
                      }}
                      tag="span"
                      className="text-lg accent hover:underline"
                      editMode={editMode}
                      placeholder={platform}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right side - QR Code */}
        <div className="flex items-center justify-center">
          {content.qrCodeUrl ? (
            <div className="text-center">
              <img
                src={content.qrCodeUrl}
                alt="QR Code"
                className="w-96 h-96 mx-auto mb-6"
              />
              <p className="text-xl opacity-70">Escaneie para mais informações</p>
            </div>
          ) : editMode ? (
            <div className="w-96 h-96 bg-ceramic-base rounded-lg flex items-center justify-center">
              <div className="text-center">
                <QrCode className="w-24 h-24 mx-auto mb-4 opacity-30" />
                <p className="text-ceramic-text-secondary">QR Code opcional</p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default ContactSlide;
