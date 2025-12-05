/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

function renderSidebar(collapsed = false, onToggle = vi.fn()) {
  return render(
    <BrowserRouter>
      <Sidebar collapsed={collapsed} onToggle={onToggle} />
    </BrowserRouter>
  );
}

describe('Sidebar', () => {
  it('renders without crashing', () => {
    renderSidebar();
    
    expect(screen.getByText('Research Lab')).toBeInTheDocument();
  });

  it('displays all navigation items when expanded', () => {
    renderSidebar(false);
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Run Orchestrator')).toBeInTheDocument();
    expect(screen.getByText('Results')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('hides labels when collapsed', () => {
    renderSidebar(true);
    
    // Labels should not be visible when collapsed
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
    expect(screen.queryByText('Run Orchestrator')).not.toBeInTheDocument();
    expect(screen.queryByText('Results')).not.toBeInTheDocument();
    expect(screen.queryByText('Settings')).not.toBeInTheDocument();
    expect(screen.queryByText('Research Lab')).not.toBeInTheDocument();
  });

  it('calls onToggle when collapse button is clicked', () => {
    const onToggle = vi.fn();
    renderSidebar(false, onToggle);
    
    const collapseButton = screen.getByText('Collapse').closest('button');
    expect(collapseButton).toBeInTheDocument();
    
    fireEvent.click(collapseButton!);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('navigation links have correct paths', () => {
    renderSidebar(false);
    
    const dashboardLink = screen.getByText('Dashboard').closest('a');
    const runLink = screen.getByText('Run Orchestrator').closest('a');
    const resultsLink = screen.getByText('Results').closest('a');
    const settingsLink = screen.getByText('Settings').closest('a');
    
    expect(dashboardLink).toHaveAttribute('href', '/');
    expect(runLink).toHaveAttribute('href', '/run');
    expect(resultsLink).toHaveAttribute('href', '/results');
    expect(settingsLink).toHaveAttribute('href', '/settings');
  });

  it('shows collapse text when expanded', () => {
    renderSidebar(false);
    
    expect(screen.getByText('Collapse')).toBeInTheDocument();
  });

  it('hides collapse text when collapsed', () => {
    renderSidebar(true);
    
    expect(screen.queryByText('Collapse')).not.toBeInTheDocument();
  });
});
