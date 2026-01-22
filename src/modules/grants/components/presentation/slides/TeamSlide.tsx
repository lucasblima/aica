/**
 * Copyright (c) 2024 - Present. Aica Engineering. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * TeamSlide - Equipe do projeto
 * Issue #117 - Presentation Generator
 */

import React from 'react';
import type { BaseSlideProps, TeamSlideContent } from '@/modules/grants/types/presentation';
import { EditableText } from '../canvas/EditableText';

export function TeamSlide({
  content,
  template,
  editMode = false,
  onChange,
}: BaseSlideProps<TeamSlideContent>) {
  const handleChange = (field: keyof TeamSlideContent, value: any) => {
    if (onChange) {
      onChange({ ...content, [field]: value });
    }
  };

  const handleMemberChange = (index: number, field: string, value: any) => {
    const newMembers = [...content.members];
    newMembers[index] = { ...newMembers[index], [field]: value };
    handleChange('members', newMembers);
  };

  return (
    <div className="w-full h-full p-24">
      {/* Header */}
      <div className="text-center mb-16">
        <EditableText
          value={content.title}
          onChange={(v) => handleChange('title', v)}
          tag="h1"
          editMode={editMode}
          placeholder="Nossa Equipe"
        />
      </div>

      {/* Team members grid */}
      <div className="grid grid-cols-4 gap-8">
        {content.members.map((member, index) => (
          <div key={index} className="team-member">
            {member.photoUrl ? (
              <img
                src={member.photoUrl}
                alt={member.name}
                className="team-photo"
              />
            ) : (
              <div className="team-photo bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                <span className="text-4xl font-bold text-gray-400">
                  {member.name.charAt(0)}
                </span>
              </div>
            )}
            <EditableText
              value={member.name}
              onChange={(v) => handleMemberChange(index, 'name', v)}
              tag="p"
              className="team-name"
              editMode={editMode}
              placeholder="Nome"
            />
            <EditableText
              value={member.role}
              onChange={(v) => handleMemberChange(index, 'role', v)}
              tag="p"
              className="team-role"
              editMode={editMode}
              placeholder="Cargo"
            />
            {(member.bio || editMode) && (
              <EditableText
                value={member.bio || ''}
                onChange={(v) => handleMemberChange(index, 'bio', v)}
                tag="p"
                className="mt-2 text-sm opacity-70"
                editMode={editMode}
                placeholder="Bio curta"
                multiline
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default TeamSlide;
