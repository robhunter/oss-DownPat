import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';

/**
 * Layout/navigation for the example app.
 * Layout is app-specific (branding, nav items, user menu style).
 */
export function Layout() {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <div style={styles.container}>
      <nav style={styles.nav}>
        <div style={styles.navContent}>
          <div style={styles.navLeft}>
            <Link to="/" style={styles.logo}>
              DownPat
            </Link>

            {isAuthenticated && (
              <div style={styles.navLinks}>
                <Link
                  to="/downpat/exercises"
                  style={{
                    ...styles.navLink,
                    ...(isActive('/downpat/exercises') ? styles.navLinkActive : {}),
                  }}
                >
                  Exercises
                </Link>

                {user?.isAdmin && (
                  <Link
                    to="/downpat/admin"
                    style={{
                      ...styles.navLink,
                      ...(isActive('/downpat/admin') ? styles.navLinkActive : {}),
                    }}
                  >
                    Admin
                  </Link>
                )}
              </div>
            )}
          </div>

          <div style={styles.navRight}>
            {isAuthenticated ? (
              <div style={styles.userMenu}>
                <span style={styles.userName}>
                  {user?.displayName}
                  {user?.isAdmin && <span style={styles.adminBadge}>Admin</span>}
                </span>
                <button onClick={logout} style={styles.logoutBtn}>
                  Logout
                </button>
              </div>
            ) : (
              <Link to="/login" style={styles.loginBtn}>
                Login
              </Link>
            )}
          </div>
        </div>
      </nav>

      <main style={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    backgroundColor: 'var(--downpat-background, #f9fafb)',
    color: 'var(--downpat-foreground, #1f2937)',
  },
  nav: {
    backgroundColor: 'white',
    borderBottom: '1px solid var(--downpat-neutral-200, #e5e7eb)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  navContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 20px',
    height: '64px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '32px',
  },
  logo: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: 'var(--downpat-primary-600, #2563eb)',
    textDecoration: 'none',
  },
  navLinks: {
    display: 'flex',
    gap: '8px',
  },
  navLink: {
    padding: '8px 16px',
    borderRadius: '6px',
    textDecoration: 'none',
    color: 'var(--downpat-neutral-600, #4b5563)',
    fontWeight: '500',
    transition: 'background-color 0.2s',
  },
  navLinkActive: {
    backgroundColor: 'var(--downpat-primary-50, #eff6ff)',
    color: 'var(--downpat-primary-600, #2563eb)',
  },
  navRight: {
    display: 'flex',
    alignItems: 'center',
  },
  userMenu: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  userName: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: 'var(--downpat-neutral-700, #374151)',
  },
  adminBadge: {
    backgroundColor: 'var(--downpat-primary-100, #dbeafe)',
    color: 'var(--downpat-primary-700, #1d4ed8)',
    fontSize: '0.75rem',
    padding: '2px 8px',
    borderRadius: '4px',
    fontWeight: '500',
  },
  logoutBtn: {
    padding: '8px 16px',
    backgroundColor: 'transparent',
    border: '1px solid var(--downpat-neutral-300, #d1d5db)',
    borderRadius: '6px',
    cursor: 'pointer',
    color: 'var(--downpat-neutral-600, #4b5563)',
    fontWeight: '500',
  },
  loginBtn: {
    padding: '8px 20px',
    backgroundColor: 'var(--downpat-primary-500, #3b82f6)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '6px',
    fontWeight: '500',
  },
  main: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '24px 20px',
  },
};
