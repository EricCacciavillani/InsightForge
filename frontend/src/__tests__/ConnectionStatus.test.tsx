/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ConnectionStatus from '../components/ConnectionStatus';

describe('ConnectionStatus', () => {
  it('renders without crashing', () => {
    const { container } = render(<ConnectionStatus connected={true} />);
    expect(container.textContent).toContain('Connected');
  });

  it('shows checking state when connected is null', () => {
    const { container } = render(<ConnectionStatus connected={null} />);
    
    expect(container.textContent).toContain('Checking...');
    
    // Should have Loader2 icon (animated spinner)
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeTruthy();
  });

  it('shows connected state when connected is true', () => {
    const { container } = render(<ConnectionStatus connected={true} />);
    
    expect(container.textContent).toContain('Connected');
    
    // Should have Wifi icon (lucide class)
    const icon = container.querySelector('svg');
    expect(icon).toBeTruthy();
  });

  it('shows offline state when connected is false', () => {
    const { container } = render(<ConnectionStatus connected={false} />);
    
    expect(container.textContent).toContain('Offline');
    
    // Should have WifiOff icon (lucide class)
    const icon = container.querySelector('svg');
    expect(icon).toBeTruthy();
  });

  it('hides text in compact mode when connected', () => {
    const { container } = render(<ConnectionStatus connected={true} compact={true} />);
    
    expect(container.textContent).not.toContain('Connected');
    
    // Should still have Wifi icon
    const icon = container.querySelector('svg');
    expect(icon).toBeTruthy();
  });

  it('hides text in compact mode when offline', () => {
    const { container } = render(<ConnectionStatus connected={false} compact={true} />);
    
    expect(container.textContent).not.toContain('Offline');
    
    // Should still have WifiOff icon
    const icon = container.querySelector('svg');
    expect(icon).toBeTruthy();
  });

  it('hides text in compact mode when checking', () => {
    const { container } = render(<ConnectionStatus connected={null} compact={true} />);
    
    expect(container.textContent).not.toContain('Checking...');
    
    // Should still have spinner
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeTruthy();
  });

  it('has correct title attribute when connected', () => {
    const { container } = render(<ConnectionStatus connected={true} />);
    
    const element = container.querySelector('[title="Backend connected"]');
    expect(element).toBeTruthy();
  });

  it('has correct title attribute when offline', () => {
    const { container } = render(<ConnectionStatus connected={false} />);
    
    const element = container.querySelector('[title="Backend offline"]');
    expect(element).toBeTruthy();
  });

  it('shows queued count when offline with queued actions', () => {
    const { container } = render(<ConnectionStatus connected={false} queuedCount={3} />);
    
    expect(container.textContent).toContain('3 queued');
  });

  it('shows syncing state when retrying', () => {
    const { container } = render(<ConnectionStatus connected={true} isRetrying={true} />);
    
    expect(container.textContent).toContain('Syncing...');
    
    // Should have spinner when retrying
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeTruthy();
  });
});
