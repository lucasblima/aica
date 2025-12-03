/**
 * Daily Summary View Component
 *
 * Displays end-of-day insights including:
 * - Productivity metrics (tasks completed, time spent)
 * - Mood and energy levels
 * - Key memories and interactions
 * - AI-generated insights and patterns
 * - Recommendations for next day
 * - Streak counters and gamification
 */

import React, { useState, useEffect } from 'react';
import { DailyReport } from '../types/memoryTypes';
import { supabase } from '../services/supabaseClient';
import './DailySummaryView.css';

interface DailySummaryProps {
  userId: string;
  reportDate?: string; // ISO date, defaults to today
  onClose?: () => void;
}

export const DailySummaryView: React.FC<DailySummaryProps> = ({
  userId,
  reportDate,
  onClose,
}) => {
  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview']));

  const date = reportDate || new Date().toISOString().split('T')[0];

  useEffect(() => {
    loadDailyReport();
  }, [userId, date]);

  async function loadDailyReport() {
    try {
      setLoading(true);
      setError(null);

      const { data, error: queryError } = await supabase
        .from('daily_reports')
        .select('*')
        .eq('user_id', userId)
        .eq('report_date', date)
        .single();

      if (queryError?.code === 'PGRST116') {
        // No report for this date
        setReport(null);
        return;
      }

      if (queryError) throw queryError;
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load daily report');
      console.error('Error loading daily report:', err);
    } finally {
      setLoading(false);
    }
  }

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  if (loading) {
    return (
      <div className="daily-summary-container loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading daily summary...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="daily-summary-container error">
        <div className="error-message">
          <p>⚠️ {error}</p>
          {onClose && <button onClick={onClose}>Close</button>}
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="daily-summary-container">
        <div className="no-report">
          <h2>No Report for {formatDate(date)}</h2>
          <p>Your daily report will be generated at the end of the day.</p>
          {onClose && <button onClick={onClose} className="btn-secondary">Close</button>}
        </div>
      </div>
    );
  }

  return (
    <div className="daily-summary-container">
      <div className="daily-summary-header">
        <div className="header-content">
          <h1>Daily Summary</h1>
          <p className="date">{formatDate(date)}</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="close-btn">×</button>
        )}
      </div>

      {/* Mood & Energy Overview */}
      <section className="summary-section mood-section">
        <div className="section-header" onClick={() => toggleSection('mood')}>
          <h3>How was your day?</h3>
          <span className={`toggle ${expandedSections.has('mood') ? 'open' : ''}`}>▼</span>
        </div>

        {expandedSections.has('mood') && (
          <div className="section-content mood-content">
            <div className="mood-grid">
              {/* Mood */}
              <div className="mood-card">
                <div className="mood-label">Mood</div>
                <div className="mood-indicator">
                  <span className={`mood-emoji ${report.mood || 'neutral'}`}>
                    {getMoodEmoji(report.mood)}
                  </span>
                  <span className="mood-text">{report.mood || 'Not recorded'}</span>
                </div>
              </div>

              {/* Energy Level */}
              <div className="mood-card">
                <div className="mood-label">Energy</div>
                <div className="energy-bar">
                  <div className="energy-fill" style={{width: `${report.energy_level || 0}%`}}></div>
                </div>
                <span className="energy-value">{report.energy_level || 0}%</span>
              </div>

              {/* Stress Level */}
              <div className="mood-card">
                <div className="mood-label">Stress</div>
                <div className="stress-bar">
                  <div className="stress-fill" style={{width: `${report.stress_level || 0}%`}}></div>
                </div>
                <span className="stress-value">{report.stress_level || 0}%</span>
              </div>

              {/* Mood Score */}
              <div className="mood-card">
                <div className="mood-label">Mood Score</div>
                <div className="score-display">
                  <span className="score-value">
                    {((report.mood_score || 0) * 5).toFixed(1)}/5
                  </span>
                  <div className="stars">
                    {renderStars(report.mood_score || 0)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Productivity Metrics */}
      <section className="summary-section productivity-section">
        <div className="section-header" onClick={() => toggleSection('productivity')}>
          <h3>Productivity</h3>
          <span className={`toggle ${expandedSections.has('productivity') ? 'open' : ''}`}>▼</span>
        </div>

        {expandedSections.has('productivity') && (
          <div className="section-content productivity-content">
            <div className="productivity-grid">
              {/* Tasks Completed */}
              <div className="metric-card">
                <div className="metric-number">
                  {report.tasks_completed}/{report.tasks_total}
                </div>
                <div className="metric-label">Tasks Completed</div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${report.tasks_total > 0 ? (report.tasks_completed / report.tasks_total) * 100 : 0}%`,
                    }}
                  ></div>
                </div>
              </div>

              {/* Productivity Score */}
              <div className="metric-card">
                <div className="metric-number">
                  {report.productivity_score?.toFixed(0) || 0}%
                </div>
                <div className="metric-label">Productivity Score</div>
                <div className={`score-badge ${getProductivityLevel(report.productivity_score || 0)}`}>
                  {getProductivityLabel(report.productivity_score || 0)}
                </div>
              </div>

              {/* Time vs Estimate */}
              {report.estimated_vs_actual && (
                <div className="metric-card">
                  <div className="metric-number">
                    {(report.estimated_vs_actual * 100).toFixed(0)}%
                  </div>
                  <div className="metric-label">vs. Estimated</div>
                  <div className="estimate-indicator">
                    {report.estimated_vs_actual > 1 ? '⏱️ Over' : '✅ On time'}
                  </div>
                </div>
              )}

              {/* Active Modules */}
              {report.active_modules && report.active_modules.length > 0 && (
                <div className="metric-card">
                  <div className="metric-number">{report.active_modules.length}</div>
                  <div className="metric-label">Life Areas Worked On</div>
                  <div className="modules-list">
                    {report.active_modules.map((module) => (
                      <span key={module} className="module-badge">
                        {module}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Key Insights */}
      {report.key_insights && report.key_insights.length > 0 && (
        <section className="summary-section insights-section">
          <div className="section-header" onClick={() => toggleSection('insights')}>
            <h3>Key Insights</h3>
            <span className={`toggle ${expandedSections.has('insights') ? 'open' : ''}`}>▼</span>
          </div>

          {expandedSections.has('insights') && (
            <div className="section-content insights-content">
              <div className="insights-list">
                {report.key_insights.map((insight, index) => (
                  <div key={index} className="insight-item">
                    <span className="insight-icon">💡</span>
                    <p>{insight}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Patterns Detected */}
      {report.patterns_detected && report.patterns_detected.length > 0 && (
        <section className="summary-section patterns-section">
          <div className="section-header" onClick={() => toggleSection('patterns')}>
            <h3>Patterns Detected</h3>
            <span className={`toggle ${expandedSections.has('patterns') ? 'open' : ''}`}>▼</span>
          </div>

          {expandedSections.has('patterns') && (
            <div className="section-content patterns-content">
              <div className="patterns-list">
                {report.patterns_detected.map((pattern, index) => (
                  <div key={index} className="pattern-item">
                    <span className="pattern-icon">📊</span>
                    <p>{pattern}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Summary Text */}
      {report.summary && (
        <section className="summary-section summary-text-section">
          <div className="section-header" onClick={() => toggleSection('summary')}>
            <h3>Day Summary</h3>
            <span className={`toggle ${expandedSections.has('summary') ? 'open' : ''}`}>▼</span>
          </div>

          {expandedSections.has('summary') && (
            <div className="section-content summary-text-content">
              <p className="summary-text">{report.summary}</p>
            </div>
          )}
        </section>
      )}

      {/* Recommendations */}
      {report.ai_recommendations && report.ai_recommendations.length > 0 && (
        <section className="summary-section recommendations-section">
          <div className="section-header" onClick={() => toggleSection('recommendations')}>
            <h3>Recommendations for Tomorrow</h3>
            <span className={`toggle ${expandedSections.has('recommendations') ? 'open' : ''}`}>▼</span>
          </div>

          {expandedSections.has('recommendations') && (
            <div className="section-content recommendations-content">
              <div className="recommendations-list">
                {report.ai_recommendations.map((rec, index) => (
                  <div key={index} className="recommendation-item">
                    <span className="rec-number">{index + 1}</span>
                    <p>{rec}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Focus Areas */}
      {report.suggested_focus_areas && report.suggested_focus_areas.length > 0 && (
        <section className="summary-section focus-section">
          <div className="section-header" onClick={() => toggleSection('focus')}>
            <h3>Focus Areas for Tomorrow</h3>
            <span className={`toggle ${expandedSections.has('focus') ? 'open' : ''}`}>▼</span>
          </div>

          {expandedSections.has('focus') && (
            <div className="section-content focus-content">
              <div className="focus-areas-grid">
                {report.suggested_focus_areas.map((area, index) => (
                  <div key={index} className="focus-area-card">
                    <div className="focus-icon">🎯</div>
                    <p>{area}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Interactions Summary */}
      {report.top_interactions && report.top_interactions.length > 0 && (
        <section className="summary-section interactions-section">
          <div className="section-header" onClick={() => toggleSection('interactions')}>
            <h3>Key Interactions</h3>
            <span className={`toggle ${expandedSections.has('interactions') ? 'open' : ''}`}>▼</span>
          </div>

          {expandedSections.has('interactions') && (
            <div className="section-content interactions-content">
              <div className="interactions-list">
                {report.top_interactions.map((contact, index) => (
                  <div key={index} className="interaction-item">
                    <span className="contact-badge">👤</span>
                    <span className="contact-name">{contact}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Footer Actions */}
      <div className="daily-summary-footer">
        <button className="btn-primary" onClick={() => onClose?.()}>Done</button>
        <button className="btn-secondary">Save as Template</button>
      </div>
    </div>
  );
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getMoodEmoji(mood?: string): string {
  const moods: Record<string, string> = {
    excellent: '😄',
    good: '😊',
    neutral: '😐',
    bad: '😕',
    terrible: '😞',
  };
  return moods[mood || 'neutral'] || '😐';
}

function renderStars(score: number): React.ReactNode {
  const stars = [];
  const rating = Math.round(score * 5);

  for (let i = 0; i < 5; i++) {
    stars.push(
      <span key={i} className={i < rating ? 'star filled' : 'star'}>
        ★
      </span>
    );
  }

  return stars;
}

function getProductivityLevel(score: number): string {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'fair';
  if (score >= 20) return 'poor';
  return 'critical';
}

function getProductivityLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  if (score >= 20) return 'Poor';
  return 'Critical';
}

function formatDate(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00');
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  return date.toLocaleDateString('en-US', options);
}
