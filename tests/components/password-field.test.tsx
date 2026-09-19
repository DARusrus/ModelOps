import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import PasswordField from '../../src/components/auth/PasswordField';

const baseProps = {
  id: 'test-password',
  label: 'Password',
  value: '',
  onChange: () => undefined,
  autoComplete: 'new-password' as const,
};

describe('PasswordField', () => {
  it('requires credential fields by default', () => {
    expect(renderToStaticMarkup(<PasswordField {...baseProps} />)).toContain('required=""');
  });

  it('allows an explicitly optional password field', () => {
    expect(renderToStaticMarkup(<PasswordField {...baseProps} required={false} />)).not.toContain('required=""');
  });
});
