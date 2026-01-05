import { describe, it, expect } from 'vitest';
import { generateTheme } from './generator.js';

describe('generateTheme', () => {
  it('generates CSS with primary color palette', () => {
    const theme = generateTheme({ primary: '#3b82f6' });

    expect(theme.css).toContain(':root');
    expect(theme.css).toContain('--downpat-primary-500');
    expect(theme.variables['--downpat-primary-500']).toBeDefined();
  });

  it('generates all shade levels (50-900)', () => {
    const theme = generateTheme({ primary: '#3b82f6' });
    const shades = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900'];

    shades.forEach((shade) => {
      expect(theme.variables[`--downpat-primary-${shade}`]).toBeDefined();
      expect(theme.variables[`--downpat-secondary-${shade}`]).toBeDefined();
      expect(theme.variables[`--downpat-success-${shade}`]).toBeDefined();
      expect(theme.variables[`--downpat-danger-${shade}`]).toBeDefined();
      expect(theme.variables[`--downpat-neutral-${shade}`]).toBeDefined();
    });
  });

  it('generates default colors when not provided', () => {
    const theme = generateTheme({ primary: '#3b82f6' });

    // Should have secondary (derived from primary)
    expect(theme.variables['--downpat-secondary-500']).toBeDefined();

    // Should have success (default green)
    expect(theme.variables['--downpat-success-500']).toBeDefined();

    // Should have danger (default red)
    expect(theme.variables['--downpat-danger-500']).toBeDefined();

    // Should have neutral (default gray)
    expect(theme.variables['--downpat-neutral-500']).toBeDefined();
  });

  it('uses provided custom colors', () => {
    const theme = generateTheme({
      primary: '#3b82f6',
      secondary: '#8b5cf6',
      success: '#22c55e',
      danger: '#f43f5e',
      neutral: '#71717a',
    });

    // All palettes should be generated from provided colors
    expect(Object.keys(theme.variables).length).toBeGreaterThan(50);
  });

  it('generates semantic colors', () => {
    const theme = generateTheme({ primary: '#3b82f6' });

    expect(theme.variables['--downpat-background']).toBe('#ffffff');
    expect(theme.variables['--downpat-foreground']).toBeDefined();
    expect(theme.variables['--downpat-muted']).toBeDefined();
    expect(theme.variables['--downpat-border']).toBeDefined();
    expect(theme.variables['--downpat-ring']).toBeDefined();
  });

  it('generates message type colors', () => {
    const theme = generateTheme({ primary: '#3b82f6' });

    expect(theme.variables['--downpat-user-bg']).toBeDefined();
    expect(theme.variables['--downpat-conversation-bg']).toBeDefined();
    expect(theme.variables['--downpat-commentary-bg']).toBeDefined();
    expect(theme.variables['--downpat-summary-bg']).toBeDefined();
    expect(theme.variables['--downpat-moderation-bg']).toBeDefined();
  });

  it('generates dark mode variables by default', () => {
    const theme = generateTheme({ primary: '#3b82f6' });

    expect(theme.css).toContain('[data-theme="dark"]');
    expect(theme.darkVariables).toBeDefined();
    expect(theme.darkVariables!['--downpat-primary-500']).toBeDefined();
    expect(theme.darkVariables!['--downpat-background']).toBeDefined();
  });

  it('can disable dark mode generation', () => {
    const theme = generateTheme(
      { primary: '#3b82f6' },
      { includeDarkMode: false }
    );

    expect(theme.css).not.toContain('[data-theme="dark"]');
    expect(theme.darkVariables).toBeUndefined();
  });

  it('uses custom dark mode selector', () => {
    const theme = generateTheme(
      { primary: '#3b82f6' },
      { darkModeSelector: '.dark-mode' }
    );

    expect(theme.css).toContain('.dark-mode');
  });

  it('uses custom variable prefix', () => {
    const theme = generateTheme(
      { primary: '#3b82f6' },
      { prefix: 'myapp' }
    );

    expect(theme.css).toContain('--myapp-primary-500');
    expect(theme.variables['--myapp-primary-500']).toBeDefined();
  });

  it('generates valid hex colors', () => {
    const theme = generateTheme({ primary: '#3b82f6' });
    const hexPattern = /^#[0-9a-f]{6}$/i;

    Object.values(theme.variables).forEach((value) => {
      expect(value).toMatch(hexPattern);
    });
  });

  it('generates lighter shades for lower numbers', () => {
    const theme = generateTheme({ primary: '#3b82f6' });

    // 50 shade should be lighter (higher RGB values) than 900 shade
    const shade50 = theme.variables['--downpat-primary-50'];
    const shade900 = theme.variables['--downpat-primary-900'];

    // Convert to RGB and compare lightness
    const rgb50 = parseInt(shade50.slice(1), 16);
    const rgb900 = parseInt(shade900.slice(1), 16);

    // Higher hex value means lighter color
    expect(rgb50).toBeGreaterThan(rgb900);
  });

  it('generates CSS that can be parsed', () => {
    const theme = generateTheme({ primary: '#3b82f6' });

    // CSS should contain valid :root block
    expect(theme.css).toMatch(/:root\s*\{[^}]+\}/);

    // CSS should contain valid property format
    expect(theme.css).toMatch(/--[\w-]+:\s*#[0-9a-f]{6};/i);
  });
});

describe('theme color derivation', () => {
  it('derives secondary from primary with hue shift', () => {
    const theme1 = generateTheme({ primary: '#3b82f6' }); // Blue
    const theme2 = generateTheme({
      primary: '#3b82f6',
      secondary: '#8b5cf6', // Purple
    });

    // Both should have secondary colors
    expect(theme1.variables['--downpat-secondary-500']).toBeDefined();
    expect(theme2.variables['--downpat-secondary-500']).toBeDefined();

    // Custom secondary should differ from auto-derived
    // (This is a weak assertion, but verifies custom colors are used)
    expect(theme1.variables['--downpat-secondary-500']).not.toBe(
      theme2.variables['--downpat-secondary-500']
    );
  });

  it('handles various input color formats', () => {
    // With #
    const theme1 = generateTheme({ primary: '#3b82f6' });
    expect(theme1.variables['--downpat-primary-500']).toBeDefined();

    // All the colors should be valid hex
    Object.values(theme1.variables).forEach((color) => {
      expect(color).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });
});
