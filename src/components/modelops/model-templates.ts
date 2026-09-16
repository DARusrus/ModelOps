import type React from 'react';
import { Brain, FileText, Image as ImageIcon, MessageSquare, Shield, ThumbsUp } from 'lucide-react';
import type { ModelOpsInput } from '@/types/modelops';

export interface ModelTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  data: ModelOpsInput;
}

function emptyDraft(): ModelOpsInput {
  return {
    model_name: '',
    version: '',
    dataset: '',
    intended_use: '',
    metrics: {},
    limitations: [],
    risks: [],
    tests: [],
    reproducibility: '',
  };
}

const archetypes = [
  ['blank', 'Blank template', 'Start from scratch with an empty model card', FileText],
  ['nlp-classifier', 'NLP classifier', 'Guidance for language classification models', MessageSquare],
  ['image-classifier', 'Image classifier', 'Guidance for computer-vision classifiers', ImageIcon],
  ['llm', 'Large language model', 'Guidance for generative-AI and language models', Brain],
  ['recommendation', 'Recommendation system', 'Guidance for ranking and retrieval systems', ThumbsUp],
  ['fraud-detection', 'Fraud detection', 'Guidance for risk and anomaly models', Shield],
] as const;

/** Archetypes select guidance only; they never provide model facts or evidence. */
export const MODEL_TEMPLATES: ModelTemplate[] = archetypes.map(([id, name, description, icon]) => ({
  id,
  name,
  description,
  icon,
  data: emptyDraft(),
}));
