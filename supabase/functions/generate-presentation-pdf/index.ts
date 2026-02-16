/**
 * Copyright (c) 2024 - Present. Aica Engineering. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Generate Presentation PDF Edge Function
 * Issue #117 - Gerador de Apresentações HTML/PDF com RAG
 *
 * Generates high-quality PDF presentations from HTML slides using Puppeteer.
 * Converts 12 different slide types into a professional PDF output at 1920x1080
 * resolution with customizable templates (professional, creative, institutional).
 *
 * @module supabase/functions/generate-presentation-pdf
 */

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import puppeteer from 'https://deno.land/x/puppeteer@16.2.0/mod.ts'
import { PDFDocument } from 'https://cdn.skypack.dev/pdf-lib@^1.17.1'
import { getCorsHeaders } from '../_shared/cors.ts'

// =============================================================================
// ENVIRONMENT & CONFIGURATION
// =============================================================================

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Slide dimensions (Full HD landscape)
const SLIDE_WIDTH = 1920
const SLIDE_HEIGHT = 1080

// =============================================================================
// TYPES
// =============================================================================

interface GeneratePDFRequest {
  deck_id: string
  user_id: string
}

interface DeckSlide {
  id: string
  slide_type: string
  content: Record<string, any>
  sort_order: number
}

interface DeckData {
  id: string
  title: string
  template: 'professional' | 'creative' | 'institutional'
  deck_slides: DeckSlide[]
}

type TemplateType = 'professional' | 'creative' | 'institutional'

// CORS headers are initialized per-request via getCorsHeaders(req)

// =============================================================================
// TEMPLATE CSS DEFINITIONS
// =============================================================================

function getTemplateCSS(template: TemplateType): string {
  const templates = {
    professional: `
      :root {
        --deck-primary: #1e3a5f;
        --deck-secondary: #f4a261;
        --deck-accent: #ed8936;
        --deck-bg: #ffffff;
        --deck-text: #1a1a1a;
        --deck-font-title: 'Montserrat', 'Arial', sans-serif;
        --deck-font-body: 'Open Sans', 'Calibri', sans-serif;
      }
    `,
    creative: `
      :root {
        --deck-primary: #6366f1;
        --deck-secondary: #ec4899;
        --deck-accent: #14b8a6;
        --deck-bg: #f8fafc;
        --deck-text: #0f172a;
        --deck-font-title: 'Poppins', 'Trebuchet MS', sans-serif;
        --deck-font-body: 'Inter', 'Segoe UI', sans-serif;
      }
    `,
    institutional: `
      :root {
        --deck-primary: #1e40af;
        --deck-secondary: #059669;
        --deck-accent: #f59e0b;
        --deck-bg: #ffffff;
        --deck-text: #111827;
        --deck-font-title: 'Roboto', 'Georgia', sans-serif;
        --deck-font-body: 'Source Sans Pro', 'Calibri', sans-serif;
      }
    `,
  }

  return templates[template] || templates.professional
}

// =============================================================================
// SLIDE RENDERERS
// =============================================================================

function renderCoverSlide(content: Record<string, any>, template: TemplateType): string {
  const { title, subtitle, tagline, logoUrl, approvalNumber } = content

  return `
    <div class="slide slide-cover">
      ${logoUrl ? `<img src="${logoUrl}" class="logo" alt="Logo" />` : ''}
      <h1 class="slide-title">${title || 'Untitled Project'}</h1>
      ${subtitle ? `<p class="slide-subtitle">${subtitle}</p>` : ''}
      ${tagline ? `<p class="tagline">${tagline}</p>` : ''}
      ${approvalNumber ? `
        <div class="approval-badge">
          <span>${approvalNumber}</span>
        </div>
      ` : ''}
    </div>
  `
}

function renderOrganizationSlide(content: Record<string, any>, template: TemplateType): string {
  const { name, description, mission, achievements, logoUrl } = content

  return `
    <div class="slide slide-organization">
      <h2 class="slide-title">Sobre a Organização</h2>
      ${logoUrl ? `<img src="${logoUrl}" class="org-logo" alt="${name}" />` : ''}
      <h3 class="org-name">${name || 'Organization Name'}</h3>
      ${description ? `<p class="org-description">${description}</p>` : ''}
      ${mission ? `
        <div class="org-mission">
          <strong>Missão:</strong> ${mission}
        </div>
      ` : ''}
      ${achievements && achievements.length > 0 ? `
        <div class="org-achievements">
          <h4>Conquistas:</h4>
          <ul>
            ${achievements.map((a: string) => `<li>${a}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
    </div>
  `
}

function renderProjectSlide(content: Record<string, any>, template: TemplateType): string {
  const { name, executiveSummary, objectives, duration, location } = content

  return `
    <div class="slide slide-project">
      <h2 class="slide-title">O Projeto</h2>
      <h3 class="project-name">${name || 'Project Name'}</h3>
      ${executiveSummary ? `<p class="executive-summary">${executiveSummary}</p>` : ''}
      ${objectives && objectives.length > 0 ? `
        <div class="project-objectives">
          <h4>Objetivos:</h4>
          <ul>
            ${objectives.map((obj: string) => `<li>${obj}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
      <div class="project-meta">
        ${duration ? `<span class="meta-item"><strong>Duração:</strong> ${duration}</span>` : ''}
        ${location ? `<span class="meta-item"><strong>Local:</strong> ${location}</span>` : ''}
      </div>
    </div>
  `
}

function renderImpactMetricsSlide(content: Record<string, any>, template: TemplateType): string {
  const { title, metrics, impactStatement } = content

  return `
    <div class="slide slide-impact-metrics">
      <h2 class="slide-title">${title || 'Impacto do Projeto'}</h2>
      ${impactStatement ? `<p class="impact-statement">${impactStatement}</p>` : ''}
      ${metrics && metrics.length > 0 ? `
        <div class="metrics-grid">
          ${metrics.map((metric: any) => `
            <div class="metric-card">
              ${metric.icon ? `<div class="metric-icon">${metric.icon}</div>` : ''}
              <div class="metric-value">${metric.value}${metric.unit || ''}</div>
              <div class="metric-label">${metric.label}</div>
              ${metric.description ? `<p class="metric-description">${metric.description}</p>` : ''}
            </div>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `
}

function renderTimelineSlide(content: Record<string, any>, template: TemplateType): string {
  const { title, events } = content

  return `
    <div class="slide slide-timeline">
      <h2 class="slide-title">${title || 'Cronograma'}</h2>
      ${events && events.length > 0 ? `
        <div class="timeline">
          ${events.map((event: any, index: number) => `
            <div class="timeline-event ${event.isHighlighted ? 'highlighted' : ''}">
              <div class="timeline-marker">${index + 1}</div>
              <div class="timeline-content">
                <div class="timeline-date">${event.date}</div>
                <h4 class="timeline-title">${event.title}</h4>
                ${event.description ? `<p class="timeline-description">${event.description}</p>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `
}

function renderTeamSlide(content: Record<string, any>, template: TemplateType): string {
  const { title, members } = content

  return `
    <div class="slide slide-team">
      <h2 class="slide-title">${title || 'Equipe'}</h2>
      ${members && members.length > 0 ? `
        <div class="team-grid">
          ${members.map((member: any) => `
            <div class="team-member">
              ${member.photoUrl ? `
                <img src="${member.photoUrl}" class="member-photo" alt="${member.name}" />
              ` : `
                <div class="member-photo-placeholder">${member.name.charAt(0)}</div>
              `}
              <h4 class="member-name">${member.name}</h4>
              <p class="member-role">${member.role}</p>
              ${member.bio ? `<p class="member-bio">${member.bio}</p>` : ''}
            </div>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `
}

function renderIncentiveLawSlide(content: Record<string, any>, template: TemplateType): string {
  const { lawName, lawShortName, jurisdiction, taxType, deductionPercentage, description } = content

  return `
    <div class="slide slide-incentive-law">
      <h2 class="slide-title">Lei de Incentivo Fiscal</h2>
      <h3 class="law-name">${lawName || 'Lei de Incentivo'}</h3>
      ${lawShortName ? `<p class="law-short-name">${lawShortName}</p>` : ''}
      ${description ? `<p class="law-description">${description}</p>` : ''}
      <div class="law-details">
        ${jurisdiction ? `<div class="law-detail"><strong>Esfera:</strong> ${jurisdiction}</div>` : ''}
        ${taxType ? `<div class="law-detail"><strong>Tributo:</strong> ${taxType}</div>` : ''}
      </div>
      ${deductionPercentage ? `
        <div class="deduction-highlight">
          <div class="deduction-value">${deductionPercentage}%</div>
          <div class="deduction-label">de dedução</div>
        </div>
      ` : ''}
    </div>
  `
}

function renderTiersSlide(content: Record<string, any>, template: TemplateType): string {
  const { title, tiers, currency } = content

  return `
    <div class="slide slide-tiers">
      <h2 class="slide-title">${title || 'Cotas de Patrocínio'}</h2>
      ${tiers && tiers.length > 0 ? `
        <div class="tiers-grid">
          ${tiers.map((tier: any) => `
            <div class="tier-card ${tier.isHighlighted ? 'highlighted' : ''}">
              <h3 class="tier-name">${tier.name}</h3>
              <div class="tier-value">${currency || 'R$'} ${tier.value.toLocaleString('pt-BR')}</div>
              ${tier.description ? `<p class="tier-description">${tier.description}</p>` : ''}
              ${tier.deliverables && tier.deliverables.length > 0 ? `
                <ul class="tier-deliverables">
                  ${tier.deliverables.slice(0, 5).map((d: any) => `<li>${d.title}</li>`).join('')}
                  ${tier.deliverables.length > 5 ? `<li class="more">+ ${tier.deliverables.length - 5} mais</li>` : ''}
                </ul>
              ` : ''}
            </div>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `
}

function renderTestimonialsSlide(content: Record<string, any>, template: TemplateType): string {
  const { title, testimonials } = content

  return `
    <div class="slide slide-testimonials">
      <h2 class="slide-title">${title || 'Depoimentos'}</h2>
      ${testimonials && testimonials.length > 0 ? `
        <div class="testimonials-grid">
          ${testimonials.map((testimonial: any) => `
            <div class="testimonial-card">
              ${testimonial.photoUrl ? `
                <img src="${testimonial.photoUrl}" class="testimonial-photo" alt="${testimonial.author}" />
              ` : ''}
              <blockquote class="testimonial-quote">"${testimonial.quote}"</blockquote>
              <div class="testimonial-author">${testimonial.author}</div>
              ${testimonial.role ? `<div class="testimonial-role">${testimonial.role}</div>` : ''}
            </div>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `
}

function renderMediaSlide(content: Record<string, any>, template: TemplateType): string {
  const { title, mediaItems } = content

  return `
    <div class="slide slide-media">
      <h2 class="slide-title">${title || 'Na Mídia'}</h2>
      ${mediaItems && mediaItems.length > 0 ? `
        <div class="media-grid">
          ${mediaItems.map((item: any) => `
            <div class="media-item">
              ${item.logoUrl ? `<img src="${item.logoUrl}" class="media-logo" alt="${item.outlet}" />` : ''}
              <h4 class="media-outlet">${item.outlet}</h4>
              ${item.headline ? `<p class="media-headline">${item.headline}</p>` : ''}
              ${item.date ? `<span class="media-date">${item.date}</span>` : ''}
            </div>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `
}

function renderComparisonSlide(content: Record<string, any>, template: TemplateType): string {
  const { title, items } = content

  return `
    <div class="slide slide-comparison">
      <h2 class="slide-title">${title || 'Comparação'}</h2>
      ${items && items.length > 0 ? `
        <div class="comparison-grid">
          ${items.map((item: any) => `
            <div class="comparison-item">
              <h3 class="comparison-label">${item.label}</h3>
              ${item.features && item.features.length > 0 ? `
                <ul class="comparison-features">
                  ${item.features.map((f: any) => `
                    <li class="${f.available ? 'available' : 'unavailable'}">
                      ${f.available ? '✓' : '✗'} ${f.name}
                    </li>
                  `).join('')}
                </ul>
              ` : ''}
            </div>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `
}

function renderContactSlide(content: Record<string, any>, template: TemplateType): string {
  const { title, callToAction, name, email, phone, website, address } = content

  return `
    <div class="slide slide-contact">
      <h2 class="slide-title">${title || 'Entre em Contato'}</h2>
      ${callToAction ? `<p class="call-to-action">${callToAction}</p>` : ''}
      <div class="contact-details">
        ${name ? `<div class="contact-item"><strong>Organização:</strong> ${name}</div>` : ''}
        ${email ? `<div class="contact-item"><strong>Email:</strong> ${email}</div>` : ''}
        ${phone ? `<div class="contact-item"><strong>Telefone:</strong> ${phone}</div>` : ''}
        ${website ? `<div class="contact-item"><strong>Website:</strong> ${website}</div>` : ''}
        ${address ? `<div class="contact-item"><strong>Endereço:</strong> ${address}</div>` : ''}
      </div>
    </div>
  `
}

// =============================================================================
// SLIDE COMPONENT ROUTER
// =============================================================================

function renderSlideComponent(
  slideType: string,
  content: Record<string, any>,
  template: TemplateType
): string {
  switch (slideType) {
    case 'cover':
      return renderCoverSlide(content, template)
    case 'organization':
      return renderOrganizationSlide(content, template)
    case 'project':
      return renderProjectSlide(content, template)
    case 'impact-metrics':
      return renderImpactMetricsSlide(content, template)
    case 'timeline':
      return renderTimelineSlide(content, template)
    case 'team':
      return renderTeamSlide(content, template)
    case 'incentive-law':
      return renderIncentiveLawSlide(content, template)
    case 'tiers':
      return renderTiersSlide(content, template)
    case 'testimonials':
      return renderTestimonialsSlide(content, template)
    case 'media':
      return renderMediaSlide(content, template)
    case 'comparison':
      return renderComparisonSlide(content, template)
    case 'contact':
      return renderContactSlide(content, template)
    default:
      return `<div class="slide"><p>Slide type "${slideType}" not implemented</p></div>`
  }
}

// =============================================================================
// HTML TEMPLATE RENDERER
// =============================================================================

function renderSlideHTML(
  slide: DeckSlide,
  template: TemplateType
): string {
  const templateCSS = getTemplateCSS(template)
  const slideHTML = renderSlideComponent(slide.slide_type, slide.content, template)

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    ${templateCSS}

    body {
      width: ${SLIDE_WIDTH}px;
      height: ${SLIDE_HEIGHT}px;
      overflow: hidden;
      font-family: var(--deck-font-body);
    }

    /* Base slide styles */
    .slide {
      width: ${SLIDE_WIDTH}px;
      height: ${SLIDE_HEIGHT}px;
      padding: 80px;
      display: flex;
      flex-direction: column;
      background: var(--deck-bg);
      color: var(--deck-text);
      font-family: var(--deck-font-body);
    }

    .slide-title {
      font-family: var(--deck-font-title);
      font-size: 72px;
      font-weight: 700;
      color: var(--deck-primary);
      margin-bottom: 40px;
    }

    .slide-subtitle {
      font-size: 36px;
      color: var(--deck-secondary);
      margin-bottom: 60px;
    }

    .slide-content {
      flex: 1;
      font-size: 28px;
      line-height: 1.6;
    }

    /* Cover slide styles */
    .slide-cover {
      justify-content: center;
      align-items: center;
      text-align: center;
      background: linear-gradient(135deg, var(--deck-primary) 0%, var(--deck-secondary) 100%);
      color: white;
    }

    .slide-cover .slide-title {
      color: white;
      font-size: 88px;
      margin-bottom: 30px;
    }

    .slide-cover .slide-subtitle {
      color: rgba(255, 255, 255, 0.9);
      font-size: 42px;
    }

    .slide-cover .tagline {
      font-size: 32px;
      font-style: italic;
      margin-top: 40px;
      opacity: 0.8;
    }

    .slide-cover .logo {
      max-width: 300px;
      max-height: 200px;
      margin-bottom: 40px;
    }

    .approval-badge {
      background: var(--deck-accent);
      color: white;
      padding: 15px 40px;
      border-radius: 50px;
      font-size: 24px;
      margin-top: 60px;
    }

    /* Organization slide styles */
    .org-logo {
      max-width: 250px;
      max-height: 150px;
      margin-bottom: 30px;
    }

    .org-name {
      font-size: 48px;
      color: var(--deck-secondary);
      margin-bottom: 30px;
    }

    .org-description {
      font-size: 28px;
      line-height: 1.6;
      margin-bottom: 40px;
    }

    .org-mission {
      background: rgba(0, 0, 0, 0.05);
      padding: 30px;
      border-radius: 10px;
      font-size: 24px;
      margin-bottom: 30px;
    }

    .org-achievements h4 {
      font-size: 32px;
      margin-bottom: 20px;
    }

    .org-achievements ul {
      list-style: none;
      padding-left: 0;
    }

    .org-achievements li {
      font-size: 24px;
      padding: 10px 0;
      padding-left: 30px;
      position: relative;
    }

    .org-achievements li::before {
      content: "✓";
      position: absolute;
      left: 0;
      color: var(--deck-accent);
      font-weight: bold;
    }

    /* Impact metrics styles */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 40px;
      margin-top: 40px;
    }

    .metric-card {
      background: linear-gradient(135deg, var(--deck-primary) 0%, var(--deck-secondary) 100%);
      color: white;
      padding: 40px;
      border-radius: 20px;
      text-align: center;
    }

    .metric-icon {
      font-size: 64px;
      margin-bottom: 20px;
    }

    .metric-value {
      font-size: 72px;
      font-weight: 700;
      margin-bottom: 15px;
    }

    .metric-label {
      font-size: 28px;
      opacity: 0.9;
    }

    /* Timeline styles */
    .timeline {
      margin-top: 40px;
    }

    .timeline-event {
      display: flex;
      gap: 30px;
      margin-bottom: 40px;
    }

    .timeline-marker {
      width: 60px;
      height: 60px;
      background: var(--deck-accent);
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      font-weight: bold;
      flex-shrink: 0;
    }

    .timeline-event.highlighted .timeline-marker {
      background: var(--deck-primary);
      width: 80px;
      height: 80px;
      font-size: 36px;
    }

    .timeline-date {
      font-size: 20px;
      color: var(--deck-secondary);
      margin-bottom: 10px;
    }

    .timeline-title {
      font-size: 32px;
      margin-bottom: 10px;
    }

    .timeline-description {
      font-size: 24px;
      color: #666;
    }

    /* Team styles */
    .team-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 40px;
      margin-top: 40px;
    }

    .team-member {
      text-align: center;
    }

    .member-photo {
      width: 180px;
      height: 180px;
      border-radius: 50%;
      object-fit: cover;
      margin-bottom: 20px;
      border: 5px solid var(--deck-accent);
    }

    .member-photo-placeholder {
      width: 180px;
      height: 180px;
      border-radius: 50%;
      background: var(--deck-primary);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 72px;
      font-weight: bold;
      margin: 0 auto 20px;
    }

    .member-name {
      font-size: 28px;
      margin-bottom: 10px;
    }

    .member-role {
      font-size: 22px;
      color: var(--deck-secondary);
      margin-bottom: 15px;
    }

    .member-bio {
      font-size: 18px;
      color: #666;
    }

    /* Tiers styles */
    .tiers-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 40px;
      margin-top: 40px;
    }

    .tier-card {
      background: white;
      border: 3px solid var(--deck-primary);
      border-radius: 20px;
      padding: 40px;
    }

    .tier-card.highlighted {
      background: linear-gradient(135deg, var(--deck-primary) 0%, var(--deck-secondary) 100%);
      color: white;
      border: none;
      transform: scale(1.05);
    }

    .tier-name {
      font-size: 36px;
      margin-bottom: 20px;
    }

    .tier-value {
      font-size: 48px;
      font-weight: 700;
      margin-bottom: 20px;
      color: var(--deck-accent);
    }

    .tier-card.highlighted .tier-value {
      color: white;
    }

    .tier-deliverables {
      list-style: none;
      padding: 0;
      margin-top: 30px;
    }

    .tier-deliverables li {
      font-size: 20px;
      padding: 8px 0;
      padding-left: 25px;
      position: relative;
    }

    .tier-deliverables li::before {
      content: "✓";
      position: absolute;
      left: 0;
      color: var(--deck-accent);
    }

    .tier-card.highlighted .tier-deliverables li::before {
      color: white;
    }

    /* Contact slide styles */
    .slide-contact {
      justify-content: center;
      background: linear-gradient(135deg, var(--deck-primary) 0%, var(--deck-secondary) 100%);
      color: white;
    }

    .slide-contact .slide-title {
      color: white;
      text-align: center;
    }

    .call-to-action {
      font-size: 36px;
      text-align: center;
      margin-bottom: 60px;
      font-style: italic;
    }

    .contact-details {
      font-size: 28px;
      text-align: center;
    }

    .contact-item {
      margin: 20px 0;
    }

    /* Incentive law styles */
    .law-name {
      font-size: 48px;
      color: var(--deck-secondary);
      margin-bottom: 20px;
    }

    .law-description {
      font-size: 28px;
      margin-bottom: 40px;
    }

    .law-details {
      display: flex;
      gap: 60px;
      margin-bottom: 60px;
    }

    .law-detail {
      font-size: 24px;
    }

    .deduction-highlight {
      background: linear-gradient(135deg, var(--deck-accent) 0%, var(--deck-secondary) 100%);
      color: white;
      border-radius: 50%;
      width: 400px;
      height: 400px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      margin: 0 auto;
    }

    .deduction-value {
      font-size: 96px;
      font-weight: 700;
    }

    .deduction-label {
      font-size: 32px;
    }

    /* General utilities */
    .project-meta {
      display: flex;
      gap: 40px;
      margin-top: 30px;
      font-size: 24px;
    }

    .executive-summary {
      font-size: 32px;
      line-height: 1.6;
      margin-bottom: 40px;
    }

    .project-objectives h4 {
      font-size: 32px;
      margin-bottom: 20px;
    }

    .project-objectives ul {
      list-style: none;
      padding: 0;
    }

    .project-objectives li {
      font-size: 24px;
      padding: 10px 0;
      padding-left: 30px;
      position: relative;
    }

    .project-objectives li::before {
      content: "→";
      position: absolute;
      left: 0;
      color: var(--deck-accent);
      font-weight: bold;
    }
  </style>
</head>
<body class="template-${template}">
  ${slideHTML}
</body>
</html>
  `
}

// =============================================================================
// PDF GENERATION
// =============================================================================

/**
 * Generate PDF from HTML slides using Puppeteer
 */
async function generatePDF(
  slides: DeckSlide[],
  template: TemplateType
): Promise<Uint8Array> {
  console.log('[generate-presentation-pdf] Launching Puppeteer...')

  const browser = await puppeteer.launch({
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
    headless: true,
  })

  try {
    const page = await browser.newPage()

    // Set viewport to slide dimensions
    await page.setViewport({
      width: SLIDE_WIDTH,
      height: SLIDE_HEIGHT,
      deviceScaleFactor: 2, // High DPI for quality
    })

    const pdfPages: Uint8Array[] = []

    console.log(`[generate-presentation-pdf] Rendering ${slides.length} slides...`)

    // Render each slide
    for (const slide of slides) {
      const html = renderSlideHTML(slide, template)

      await page.setContent(html, {
        waitUntil: 'networkidle0',
      })

      // Wait for fonts to load
      await page.waitForTimeout(500)

      // Generate PDF page
      const pdf = await page.pdf({
        width: `${SLIDE_WIDTH}px`,
        height: `${SLIDE_HEIGHT}px`,
        printBackground: true,
        preferCSSPageSize: true,
      })

      pdfPages.push(pdf)
    }

    console.log('[generate-presentation-pdf] Merging PDF pages...')

    // Merge all PDFs into one
    const mergedPDF = await mergePDFs(pdfPages)

    console.log('[generate-presentation-pdf] PDF generation complete')

    return mergedPDF
  } finally {
    await browser.close()
  }
}

/**
 * Merge multiple PDF pages into a single document
 */
async function mergePDFs(pdfs: Uint8Array[]): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create()

  for (const pdfBytes of pdfs) {
    const pdf = await PDFDocument.load(pdfBytes)
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices())
    copiedPages.forEach((page) => mergedPdf.addPage(page))
  }

  const mergedPdfBytes = await mergedPdf.save()
  return mergedPdfBytes
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    })
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  try {
    // Validate authorization
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization header required' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Parse request body
    const { deck_id, user_id }: GeneratePDFRequest = await req.json()

    if (!deck_id || !user_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: deck_id, user_id' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log(`[generate-presentation-pdf] Starting PDF generation for deck: ${deck_id}`)

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Verify user authentication
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user || user.id !== user_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired authentication token' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Fetch deck data with slides
    const { data: deck, error: deckError } = await supabase
      .from('generated_decks')
      .select(`
        id,
        title,
        template,
        deck_slides (
          id,
          slide_type,
          content,
          sort_order
        )
      `)
      .eq('id', deck_id)
      .eq('user_id', user_id)
      .single()

    if (deckError || !deck) {
      console.error('[generate-presentation-pdf] Deck not found:', deckError)
      return new Response(
        JSON.stringify({ success: false, error: 'Deck not found or access denied' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Sort slides by sort_order
    const slides = (deck.deck_slides as DeckSlide[]).sort((a, b) => a.sort_order - b.sort_order)

    if (slides.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Deck has no slides' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Generate PDF
    const pdfBuffer = await generatePDF(slides, deck.template as TemplateType)

    // Upload to Storage
    const filename = `${user_id}/decks/${deck_id}.pdf`
    console.log(`[generate-presentation-pdf] Uploading PDF to: ${filename}`)

    const { error: uploadError } = await supabase.storage
      .from('presentation-assets')
      .upload(filename, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (uploadError) {
      console.error('[generate-presentation-pdf] Upload error:', uploadError)
      throw new Error(`Failed to upload PDF: ${uploadError.message}`)
    }

    // Update deck record
    await supabase
      .from('generated_decks')
      .update({
        pdf_storage_path: filename,
        pdf_generated_at: new Date().toISOString(),
      })
      .eq('id', deck_id)

    // Generate signed URL (1 hour expiry)
    const { data: signedUrlData } = await supabase.storage
      .from('presentation-assets')
      .createSignedUrl(filename, 3600)

    console.log('[generate-presentation-pdf] PDF generated successfully')

    return new Response(
      JSON.stringify({
        success: true,
        pdf_url: signedUrlData?.signedUrl || null,
        storage_path: filename,
        total_slides: slides.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('[generate-presentation-pdf] Error:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
