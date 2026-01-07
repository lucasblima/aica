/**
 * Contact Profile View Component
 *
 * Displays detailed information about a contact including:
 * - Contact details and relationship status
 * - Interaction history (memories)
 * - Shared associations
 * - Relationship health score
 * - Tasks and work items associated with contact
 * - Suggested actions
 */

import React, { useState, useEffect } from 'react';
import { ContactNetwork } from '@/types/memoryTypes';
import { getContactById } from '@/services/contactNetworkService';
import { supabase } from '@/services/supabaseClient';
import './ContactProfileView.css';

interface ContactProfileProps {
  contactId: string;
  onClose: () => void;
}

interface Memory {
  id: string;
  sentiment: string;
  summary: string;
  created_at: string;
  triggers: string[];
}

interface SharedAssociation {
  id: string;
  name: string;
  type: string;
}

interface ContactTask {
  id: string;
  title: string;
  priority: string;
  state: string;
  due_date?: string;
}

export const ContactProfileView: React.FC<ContactProfileProps> = ({
  contactId,
  onClose,
}) => {
  const [contact, setContact] = useState<ContactNetwork | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [sharedAssociations, setSharedAssociations] = useState<SharedAssociation[]>([]);
  const [tasks, setTasks] = useState<ContactTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'memories' | 'associations' | 'tasks'>('overview');

  useEffect(() => {
    loadContactData();
  }, [contactId]);

  async function loadContactData() {
    try {
      setLoading(true);
      setError(null);

      // Load contact
      const contactData = await getContactById(contactId);
      if (!contactData) {
        setError('Contact not found');
        return;
      }
      setContact(contactData);

      // Load recent memories
      const { data: memoriesData } = await supabase
        .from('memories')
        .select('id, sentiment, summary, created_at, triggers')
        .eq('source_contact_id', contactId)
        .order('created_at', { ascending: false })
        .limit(10);

      setMemories(memoriesData || []);

      // Load shared associations (if contact is associated with associations)
      if (contactData.association_id) {
        const { data: associationData } = await supabase
          .from('associations')
          .select('id, name, type')
          .eq('id', contactData.association_id)
          .single();

        if (associationData) {
          setSharedAssociations([associationData]);
        }
      }

      // Load work items associated with contact (if applicable)
      // This is a placeholder - actual implementation depends on your data model
      setTasks([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load contact data');
      console.error('Error loading contact:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="contact-profile-modal">
        <div className="contact-profile-content">
          <div className="loading">Loading contact...</div>
        </div>
      </div>
    );
  }

  if (error || !contact) {
    return (
      <div className="contact-profile-modal">
        <div className="contact-profile-content">
          <div className="error">{error || 'Contact not found'}</div>
          <button onClick={onClose} className="close-button">Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="contact-profile-modal" onClick={onClose}>
      <div className="contact-profile-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="contact-profile-header">
          <button onClick={onClose} className="close-button">×</button>
          <h2>Contact Profile</h2>
        </div>

        {/* Contact Basic Info */}
        <div className="contact-profile-hero">
          {contact.avatar_url && (
            <img src={contact.avatar_url} alt={contact.name} className="contact-avatar" />
          )}
          <div className="contact-basic-info">
            <h3>{contact.name}</h3>
            <p className="relationship-type">{contact.relationship_type}</p>
            {contact.phone_number && (
              <p className="contact-detail">📱 {contact.phone_number}</p>
            )}
            {contact.email && (
              <p className="contact-detail">✉️ {contact.email}</p>
            )}
          </div>

          {/* Health Score Widget */}
          <div className="health-score-widget">
            <div className="health-score-circle">
              <svg viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" className="health-bg" />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  className="health-fill"
                  style={{
                    strokeDasharray: `${(contact.health_score || 50) * 2.827} 282.7`,
                  }}
                />
              </svg>
              <div className="health-score-value">{contact.health_score?.toFixed(0) || 50}</div>
            </div>
            <div className="health-score-label">
              {getHealthLabel(contact.health_score || 50)}
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="contact-stats">
          <div className="stat">
            <span className="stat-value">{contact.interaction_count || 0}</span>
            <span className="stat-label">Interactions</span>
          </div>
          <div className="stat">
            <span className="stat-value">{contact.engagement_level}</span>
            <span className="stat-label">Engagement</span>
          </div>
          <div className="stat">
            <span className="stat-value">{contact.sentiment_trend || 'Unknown'}</span>
            <span className="stat-label">Trend</span>
          </div>
          <div className="stat">
            <span className="stat-value">{contact.interaction_topics?.length || 0}</span>
            <span className="stat-label">Topics</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="contact-profile-tabs">
          <button
            className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`tab ${activeTab === 'memories' ? 'active' : ''}`}
            onClick={() => setActiveTab('memories')}
          >
            Memories ({memories.length})
          </button>
          <button
            className={`tab ${activeTab === 'associations' ? 'active' : ''}`}
            onClick={() => setActiveTab('associations')}
          >
            Associations
          </button>
          <button
            className={`tab ${activeTab === 'tasks' ? 'active' : ''}`}
            onClick={() => setActiveTab('tasks')}
          >
            Tasks
          </button>
        </div>

        {/* Tab Content */}
        <div className="contact-profile-tab-content">
          {activeTab === 'overview' && (
            <div className="tab-pane overview-pane">
              {/* Contact Details */}
              <section className="contact-section">
                <h4>Details</h4>
                {contact.notes && (
                  <div className="detail-item">
                    <span className="label">Notes:</span>
                    <span className="value">{contact.notes}</span>
                  </div>
                )}
                {contact.interaction_topics && contact.interaction_topics.length > 0 && (
                  <div className="detail-item">
                    <span className="label">Topics:</span>
                    <div className="tags">
                      {contact.interaction_topics.map((topic) => (
                        <span key={topic} className="tag">
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {contact.tags && contact.tags.length > 0 && (
                  <div className="detail-item">
                    <span className="label">Tags:</span>
                    <div className="tags">
                      {contact.tags.map((tag) => (
                        <span key={tag} className="tag secondary">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              {/* Interaction History */}
              <section className="contact-section">
                <h4>Last Interaction</h4>
                {contact.last_interaction_at ? (
                  <p className="interaction-date">
                    {formatDate(contact.last_interaction_at)}
                  </p>
                ) : (
                  <p className="no-data">No interactions recorded</p>
                )}
              </section>

              {/* Suggested Actions */}
              <section className="contact-section">
                <h4>Suggested Actions</h4>
                <div className="suggestions">
                  {getSuggestions(contact).map((suggestion, index) => (
                    <div key={index} className="suggestion">
                      {suggestion.icon} {suggestion.text}
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {activeTab === 'memories' && (
            <div className="tab-pane memories-pane">
              {memories.length > 0 ? (
                <div className="memories-list">
                  {memories.map((memory) => (
                    <div key={memory.id} className="memory-item">
                      <div className="memory-header">
                        <span className={`sentiment-badge ${memory.sentiment}`}>
                          {memory.sentiment}
                        </span>
                        <span className="memory-date">{formatDate(memory.created_at)}</span>
                      </div>
                      <p className="memory-summary">{memory.summary}</p>
                      {memory.triggers && memory.triggers.length > 0 && (
                        <div className="memory-triggers">
                          {memory.triggers.map((trigger) => (
                            <span key={trigger} className="trigger-badge">
                              {trigger}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-data">No memories recorded yet</p>
              )}
            </div>
          )}

          {activeTab === 'associations' && (
            <div className="tab-pane associations-pane">
              {sharedAssociations.length > 0 ? (
                <div className="associations-list">
                  {sharedAssociations.map((assoc) => (
                    <div key={assoc.id} className="association-item">
                      <h5>{assoc.name}</h5>
                      <p className="association-type">{assoc.type}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-data">No shared associations</p>
              )}
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="tab-pane tasks-pane">
              {tasks.length > 0 ? (
                <div className="tasks-list">
                  {tasks.map((task) => (
                    <div key={task.id} className="task-item">
                      <h5>{task.title}</h5>
                      <div className="task-meta">
                        <span className={`priority-badge ${task.priority}`}>
                          {task.priority}
                        </span>
                        <span className="task-state">{task.state}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-data">No tasks associated</p>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="contact-profile-actions">
          <button className="action-button primary">Send Message</button>
          <button className="action-button secondary">Edit Contact</button>
          <button className="action-button secondary">Archive</button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getHealthLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  if (score >= 20) return 'Poor';
  return 'Critical';
}

function getSuggestions(contact: ContactNetwork): Array<{ icon: string; text: string }> {
  const suggestions: Array<{ icon: string; text: string }> = [];

  // Based on engagement level
  if (contact.engagement_level === 'low' || contact.engagement_level === 'inactive') {
    suggestions.push({
      icon: '💬',
      text: 'Reach out - you haven\'t talked in a while',
    });
  }

  // Based on health score
  if ((contact.health_score || 50) < 30) {
    suggestions.push({
      icon: '⚠️',
      text: 'This relationship needs attention',
    });
  }

  // Based on sentiment trend
  if (contact.sentiment_trend === 'declining') {
    suggestions.push({
      icon: '📉',
      text: 'Recent interactions have been less positive - consider a positive conversation',
    });
  }

  // Default suggestions
  if (suggestions.length === 0) {
    suggestions.push({
      icon: '✨',
      text: 'Relationship is healthy',
    });
  }

  return suggestions;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}
