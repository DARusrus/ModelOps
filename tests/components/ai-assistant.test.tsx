import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { buildAIAssistantSuggestions, applySuggestionToField, applyAllSuggestions } from '@/lib/modelops/ai-assistant';
import { AIAssistantModal } from '@/components/modelops/AIAssistantModal';
import { AIRecommendationBadge } from '@/components/modelops/AIRecommendationBadge';
import type { ModelCardOutput } from '@/types';

describe('AI assistant suggestions', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
  it('builds assistant suggestions for weak documentation and missing evidence', () => {
    const card: Partial<ModelCardOutput> = {
      executive_summary: '',
      dataset_description: '',
      architecture: 'Architecture details are limited.',
      limitations: [],
      warnings: [],
      recommendations: ['Add stronger governance evidence.'],
      suggested_fixes: ['Expand the executive summary.'],
      detected_issues: ['Documentation is too thin.'],
    };

    const suggestions = buildAIAssistantSuggestions(card as ModelCardOutput);

    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.some((suggestion) => suggestion.fieldName === 'Executive Summary')).toBe(true);
    expect(suggestions.some((suggestion) => suggestion.fieldName === 'Dataset Description')).toBe(true);
  });

  it('applies a single suggestion to the selected field and applies all approved suggestions', () => {
    const card: ModelCardOutput = {
      model_name: 'Demo',
      version: '1.0',
      dataset: 'Demo Data',
      experiment_info: 'Example',
      input_shape: 'N/A',
      data_types: [],
      distribution_summary: '',
      metrics: {},
      intended_use: 'Testing',
      warnings: [],
      limitations: [],
      risks: [],
      tests: [],
      reproducibility: 'High',
      overview: 'Short overview',
      executive_summary: 'Old summary',
      architecture: 'Old architecture',
      architecture_analysis: '',
      training_details: 'Old training',
      training_analysis: '',
      dataset_description: 'Old dataset',
      dataset_analysis: '',
      evaluation: 'Old evaluation',
      evaluation_analysis: '',
      bias_analysis: '',
      fairness: '',
      ethical_considerations: '',
      ethical_analysis: '',
      failure_cases: '',
      deployment_readiness: '',
      deployment_analysis: '',
      production_readiness: '',
      production_risks: '',
      monitoring: '',
      monitoring_strategy: '',
      rollback_strategy: '',
      security_considerations: '',
      security_analysis: '',
      risk_assessment: '',
      detected_issues: [],
      suggested_fixes: [],
      recommendations: [],
      next_steps: [],
      references: [],
      evidence: [],
      confidence_notes: [],
      assumptions: [],
    };

    const updatedField = applySuggestionToField(card, {
      fieldName: 'Executive Summary',
      fieldKey: 'executive_summary',
      problem: 'Needs context',
      reason: 'The summary is too short',
      suggestion: 'A stronger summary',
      impact: 'Improves clarity',
      confidence: 0.94,
    });

    expect(updatedField.executive_summary).toBe('A stronger summary');

    const updatedAll = applyAllSuggestions(card, [
      {
        fieldName: 'Executive Summary',
        fieldKey: 'executive_summary',
        problem: 'Needs context',
        reason: 'The summary is too short',
        suggestion: 'A stronger summary',
        impact: 'Improves clarity',
        confidence: 0.94,
      },
      {
        fieldName: 'Dataset Description',
        fieldKey: 'dataset_description',
        problem: 'Needs detail',
        reason: 'The dataset context is weak',
        suggestion: 'A richer dataset description',
        impact: 'Improves trust',
        confidence: 0.92,
      },
    ]);

    expect(updatedAll.executive_summary).toBe('A stronger summary');
    expect(updatedAll.dataset_description).toBe('A richer dataset description');
  });

  it('renders the assistant modal shell with its actions', () => {
    const markup = renderToStaticMarkup(
      <AIAssistantModal
        isOpen
        title="AI Assistant"
        suggestions={[
          {
            fieldName: 'Executive Summary',
            fieldKey: 'executive_summary',
            problem: 'Needs context',
            reason: 'The summary is too short',
            suggestion: 'A stronger summary',
            impact: 'Improves clarity',
            confidence: 0.94,
          },
        ]}
        onClose={() => undefined}
        onApply={() => undefined}
        onIgnore={() => undefined}
        onExplain={() => undefined}
        onApplyAll={() => undefined}
      />,
    );

    expect(markup).toContain('AI Assistant');
    expect(markup).toContain('Apply');
    expect(markup).toContain('Explain More');
  });

  it('renders the embedded AI recommendation badge for incomplete sections', () => {
    render(
      <AIRecommendationBadge
        title="Dataset Description"
        fieldKey="dataset_description"
        currentValue=""
        onApply={() => undefined}
      >
        <div>Card body</div>
      </AIRecommendationBadge>,
    );

    expect(screen.getByText(/AI Recommendation/i)).toBeInTheDocument();
  });

  it('opens the popup and applies a suggestion from the assistant', async () => {
    const onApply = vi.fn();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: async () => ({
        message: 'This section needs stronger evidence.',
        suggestions: [
          {
            id: 'suggestion-1',
            title: 'Strengthen the section',
            detail: 'Add more evidence',
            field: 'dataset_description',
            value: 'A stronger dataset description',
            confidence: 0.96,
          },
        ],
      }),
    }));

    render(
      <AIRecommendationBadge
        title="Dataset Description"
        fieldKey="dataset_description"
        currentValue=""
        onApply={onApply}
      >
        <div>Card body</div>
      </AIRecommendationBadge>,
    );

    fireEvent.click(screen.getByRole('button', { name: /ai recommendation/i }));

    await waitFor(() => expect(screen.getByText(/AI Assistant/i)).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /apply suggestion/i }));

    expect(onApply).toHaveBeenCalledWith('dataset_description', 'A stronger dataset description');
  });
});
