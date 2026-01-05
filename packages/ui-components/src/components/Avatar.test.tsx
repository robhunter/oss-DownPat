import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Avatar } from './Avatar.js';

describe('Avatar', () => {
  it('shows initials from display name', () => {
    render(<Avatar displayName="John Doe" />);
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('handles single name', () => {
    render(<Avatar displayName="Alice" />);
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('shows first two initials only', () => {
    render(<Avatar displayName="John Peter Smith" />);
    expect(screen.getByText('JP')).toBeInTheDocument();
  });

  it('handles empty name', () => {
    render(<Avatar displayName="" />);
    expect(screen.getByText('?')).toBeInTheDocument();
  });

  it('renders with custom size', () => {
    render(<Avatar displayName="Test User" size={60} />);
    const avatar = screen.getByRole('img');
    expect(avatar).toHaveStyle({ width: '60px', height: '60px' });
  });

  it('applies custom className', () => {
    render(<Avatar displayName="Test" className="custom-class" />);
    const avatar = screen.getByRole('img');
    expect(avatar).toHaveClass('custom-class');
  });

  it('sets aria-label for accessibility', () => {
    render(<Avatar displayName="Jane Smith" />);
    expect(screen.getByLabelText('Avatar for Jane Smith')).toBeInTheDocument();
  });

  it('generates deterministic colors', () => {
    // Same name should produce same color
    const { container: container1 } = render(<Avatar displayName="Test" />);
    const { container: container2 } = render(<Avatar displayName="Test" />);

    const avatar1 = container1.querySelector('.downpat-avatar');
    const avatar2 = container2.querySelector('.downpat-avatar');

    expect(avatar1?.getAttribute('style')).toBe(avatar2?.getAttribute('style'));
  });
});
