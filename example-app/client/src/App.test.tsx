import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('should render the app title', () => {
    render(<App />);
    expect(screen.getByText('DownPat')).toBeInTheDocument();
  });

  it('should show home page content', () => {
    render(<App />);
    expect(screen.getByText('Welcome to DownPat')).toBeInTheDocument();
  });
});
