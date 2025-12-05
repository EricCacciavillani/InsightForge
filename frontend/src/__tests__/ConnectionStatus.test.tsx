/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ConnectionStatus from '../components/ConnectionStatus';

describe('ConnectionStatus', () => {
  it('renders without crashing', () => {
    render(<ConnectionStatus connected={true} />);
    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('shows checking state when connected is null', () => {
    render(<ConnectionStatus connected={null} />);
    
    expect(screen.getByText('Checking...')).toBeInTheDocument();
    
    // Should have Loader2 icon (animated spinner)
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('shows connected state when connected is true', () => {
    render(<ConnectionStatus connected={true} />);
    
    expect(screen.getByText('Connected')).toBeInTheDocument();
    
    // Should have Wifi icon (lucide-wifi class)
    const icon = document.querySelector('.lucide-wifi');
    expect(icon).toBeInTheDocument();
  });

  it('shows offline state when connected is false', () => {
    render(<ConnectionStatus connected={false} />);
    
    expect(screen.getByText('Offline')).toBeInTheDocument();
    
    // Should have WifiOff icon (lucide-wifi-off class)
    const icon = document.querySelector('.lucide-wifi-off');
    expect(icon).toBeInTheDocument();
  });

  it('hides text in compact mode when connected', () => {
    render(<ConnectionStatus connected={true} compact={true} />);
    
    expect(screen.queryByText('Connected')).not.toBeInTheDocument();
    
    // Should still have Wifi icon
    const icon = document.querySelector('.lucide-wifi');
    expect(icon).toBeInTheDocument();
  });

  it('hides text in compact mode when offline', () => {
    render(<ConnectionStatus connected={false} compact={true} />);
    
    expect(screen.queryByText('Offline')).not.toBeInTheDocument();
    
    // Should still have WifiOff icon
    const icon = document.querySelector('.lucide-wifi-off');
    expect(icon).toBeInTheDocument();
  });

  it('hides text in compact mode when checking', () => {
    render(<ConnectionStatus connected={null} compact={true} />);
    
    expect(screen.queryByText('Checking...')).not.toBeInTheDocument();
    
    // Should still have spinner
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('has correct title attribute when connected', () => {
    render(<ConnectionStatus connected={true} />);
    
    const container = screen.getByTitle('Backend connected');
    expect(container).toBeInTheDocument();
  });

  it('has correct title attribute when offline', () => {
    render(<ConnectionStatus connected={false} />);
    
    const container = screen.getByTitle('Backend offline');
    expect(container).toBeInTheDocument();
  });

  it('shows queued count when offline with queued actions', () => {
    render(<ConnectionStatus connected={false} queuedCount={3} />);
    
    expect(screen.getByText('3 queued')).toBeInTheDocument();
  });

  it('shows syncing state when retrying', () => {
    render(<ConnectionStatus connected={true} isRetrying={true} />);
    
    expect(screen.getByText('Syncing...')).toBeInTheDocument();
    
    // Should have spinner when retrying
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });
});
