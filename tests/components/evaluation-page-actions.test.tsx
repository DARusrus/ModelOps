import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { WorkspaceAccessProvider } from '../../src/components/app-shell/WorkspaceAccessContext';
import EvaluationPageActions from '../../src/components/evaluations/EvaluationPageActions';

function renderForRole(role: 'viewer' | 'editor' | 'reviewer' | 'admin') {
  return renderToStaticMarkup(
    <WorkspaceAccessProvider role={role}>
      <EvaluationPageActions />
    </WorkspaceAccessProvider>,
  );
}

describe('evaluation page actions', () => {
  it('does not advertise mutation routes to read-only viewers', () => {
    expect(renderForRole('viewer')).toBe('');
  });

  it.each(['editor', 'reviewer', 'admin'] as const)('offers evaluation creation to %s accounts', (role) => {
    expect(renderForRole(role)).toContain('href="/evaluations/new"');
  });
});
