# Authentication Integration Guide

## Overview

The DownPat packages use a **token-based authentication** pattern that works with any auth provider (Firebase Auth, Auth0, custom JWT, session tokens, etc.).

**Key principle**: Client provides opaque tokens, server validates them and extracts user information.

---

## User Model

All authenticated users must provide this information:

```typescript
interface User {
  userId: string        // Unique identifier
  displayName: string   // Display name for UI
  isAdmin: boolean      // Can access admin interface, view all conversations
  isSubscriber: boolean // Can start new conversations
}
```

**Demo Users**:
```typescript
const demoUser: User = {
  userId: 'demo-user',
  displayName: 'Demo User',
  isAdmin: false,
  isSubscriber: false  // Demo users have separate access rules
}
```

---

## Client-Side Integration

### Client Auth Provider Interface

```typescript
interface ClientAuthProvider {
  // Get current auth token (NOT user data - just the token)
  getToken(): Promise<string | null>

  // Listen for auth state changes
  onAuthChange(callback: (hasAuth: boolean) => void): () => void
}
```

### Example: Firebase Auth

```typescript
import { getAuth } from 'firebase/auth'

const firebaseClientAuth: ClientAuthProvider = {
  getToken: async () => {
    const auth = getAuth()
    const user = auth.currentUser
    if (!user) return null

    return await user.getIdToken()
  },

  onAuthChange: (callback) => {
    const auth = getAuth()
    return onAuthStateChanged(auth, (user) => {
      callback(!!user)
    })
  }
}
```

### Example: Custom JWT

```typescript
const customClientAuth: ClientAuthProvider = {
  getToken: async () => {
    // Get token from localStorage, sessionStorage, or memory
    return localStorage.getItem('authToken')
  },

  onAuthChange: (callback) => {
    // Listen for login/logout events
    window.addEventListener('auth-change', (event) => {
      callback(event.detail.isAuthenticated)
    })

    // Return cleanup function
    return () => {
      window.removeEventListener('auth-change', ...)
    }
  }
}
```

### Example: Session-based Auth

```typescript
const sessionClientAuth: ClientAuthProvider = {
  getToken: async () => {
    // For session-based auth, might return session ID
    const response = await fetch('/api/session')
    const data = await response.json()
    return data.sessionToken
  },

  onAuthChange: (callback) => {
    // Poll or use server-sent events to detect session changes
    const interval = setInterval(async () => {
      const response = await fetch('/api/session/check')
      const data = await response.json()
      callback(data.isAuthenticated)
    }, 60000) // Check every minute

    return () => clearInterval(interval)
  }
}
```

---

## Server-Side Integration

### Server Auth Provider Interface

```typescript
interface ServerAuthProvider {
  // Validate token and return user information
  // Throws error if token is invalid
  validateToken(token: string): Promise<User>

  // Get demo user (for unauthenticated requests)
  getDemoUser(): User
}
```

### Example: Firebase Admin SDK

```typescript
import admin from 'firebase-admin'

const firebaseServerAuth: ServerAuthProvider = {
  validateToken: async (token: string) => {
    // Validate JWT token
    const decodedToken = await admin.auth().verifyIdToken(token)

    // Fetch additional user data from Firestore
    const userDoc = await admin
      .firestore()
      .collection('users')
      .doc(decodedToken.uid)
      .get()

    if (!userDoc.exists) {
      throw new Error('User not found')
    }

    const userData = userDoc.data()

    return {
      userId: decodedToken.uid,
      displayName: userData.displayName || decodedToken.name || 'User',
      isAdmin: userData.isAdmin || false,
      isSubscriber: userData.isSubscriber || false
    }
  },

  getDemoUser: () => ({
    userId: 'demo-user',
    displayName: 'Demo User',
    isAdmin: false,
    isSubscriber: false
  })
}
```

### Example: Custom JWT

```typescript
import jwt from 'jsonwebtoken'

const customServerAuth: ServerAuthProvider = {
  validateToken: async (token: string) => {
    // Verify JWT signature
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as any

    // Fetch user from your database
    const user = await db.users.findById(decoded.userId)

    if (!user) {
      throw new Error('User not found')
    }

    return {
      userId: user.id,
      displayName: user.name,
      isAdmin: user.role === 'admin',
      isSubscriber: user.subscription?.active || false
    }
  },

  getDemoUser: () => ({
    userId: 'demo-user',
    displayName: 'Demo User',
    isAdmin: false,
    isSubscriber: false
  })
}
```

### Example: API Key Validation

```typescript
const apiKeyServerAuth: ServerAuthProvider = {
  validateToken: async (apiKey: string) => {
    // Validate API key against your database
    const key = await db.apiKeys.findByKey(apiKey)

    if (!key || !key.isActive) {
      throw new Error('Invalid API key')
    }

    // Get associated user
    const user = await db.users.findById(key.userId)

    return {
      userId: user.id,
      displayName: user.name,
      isAdmin: key.permissions.includes('admin'),
      isSubscriber: key.permissions.includes('subscriber')
    }
  },

  getDemoUser: () => ({ ... })
}
```

---

## Token Refresh Strategy

The packages implement a **single retry pattern** for token validation:

1. Attempt to validate token
2. If validation fails:
   - Request fresh token from client auth provider
   - Retry validation with fresh token
3. If still fails: throw authentication error

This handles common cases like expired tokens without excessive retries.

**Implementation** (handled by packages):
```typescript
async function validateWithRetry(
  serverAuth: ServerAuthProvider,
  clientAuth: ClientAuthProvider,
  currentToken: string
): Promise<User> {
  try {
    // First attempt
    return await serverAuth.validateToken(currentToken)
  } catch (error) {
    // Get fresh token
    const freshToken = await clientAuth.getToken()

    if (!freshToken) {
      throw new Error('Not authenticated')
    }

    // Retry with fresh token
    return await serverAuth.validateToken(freshToken)
  }
}
```

---

## Access Control Rules

### Conversation Access
```typescript
function canAccessConversation(user: User, conversation: Conversation): boolean {
  // Demo users can only access their own demo conversations
  if (user.userId === 'demo-user') {
    return conversation.userId === 'demo-user'
  }

  // Regular users can access their own conversations
  if (conversation.userId === user.userId) {
    return true
  }

  // Admins can access all conversations (for QA/support)
  if (user.isAdmin) {
    return true
  }

  return false
}
```

### Exercise Access (Start Conversation)
```typescript
function canStartConversation(user: User, exercise: Exercise): boolean {
  // Demo users can always start demo conversations
  if (user.userId === 'demo-user') {
    return true
  }

  // Non-subscribers are blocked
  if (!user.isSubscriber) {
    return false
  }

  return true
}
```

**Note**: Host applications can set `isSubscriber: true` for all users if they want open access to all exercises.

### Admin UI Access
```typescript
function canAccessAdminUI(user: User): boolean {
  return user.isAdmin
}

function canCreateExercise(user: User): boolean {
  return user.isAdmin
}
```

---

## HTTP API Integration

### Express Middleware Example

```typescript
import { ServerAuthProvider, User } from '@downpat-oss/core'

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: User
    }
  }
}

function authMiddleware(serverAuth: ServerAuthProvider) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.replace('Bearer ', '')

    if (!token) {
      return res.status(401).json({ error: 'No token provided' })
    }

    try {
      req.user = await serverAuth.validateToken(token)
      next()
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' })
    }
  }
}

// Usage
app.post('/api/conversation/start',
  authMiddleware(serverAuth),
  async (req, res) => {
    const user = req.user! // Guaranteed by middleware

    // Check subscription
    if (!user.isSubscriber) {
      return res.status(403).json({
        error: 'Subscription required to start conversations'
      })
    }

    const conversation = await conversationEngine.startConversation({
      user,
      exerciseId: req.body.exerciseId
    })

    res.json(conversation)
  }
)
```

### Demo Endpoints (Unauthenticated)

```typescript
// Demo endpoints explicitly skip auth
app.post('/api/demo/conversation/start', async (req, res) => {
  const demoUser = serverAuth.getDemoUser()

  const conversation = await conversationEngine.startConversation({
    user: demoUser,
    exerciseId: req.body.exerciseId,
    isDemo: true
  })

  res.json(conversation)
})
```

---

## Socket.io Integration

### Server Setup

```typescript
import { Server } from 'socket.io'
import { ServerAuthProvider, User } from '@downpat-oss/core'

function setupSocketAuth(io: Server, serverAuth: ServerAuthProvider) {
  io.on('connection', async (socket) => {
    // Get token from handshake
    const token = socket.handshake.auth.token

    let user: User

    try {
      if (token) {
        // Validate token
        user = await serverAuth.validateToken(token)
      } else {
        // No token = demo user
        user = serverAuth.getDemoUser()
      }

      // Attach user to socket for future events
      socket.data.user = user

    } catch (error) {
      socket.disconnect()
      return
    }

    // Handle conversation messages
    socket.on('continue-chat', async (data) => {
      const user = socket.data.user as User

      // Validate subscription
      if (user.userId !== 'demo-user' && !user.isSubscriber) {
        socket.emit('error', { message: 'Subscription required' })
        return
      }

      await conversationEngine.continueConversation({
        user,
        conversationId: data.conversationId,
        message: data.message
      })
    })
  })
}
```

### Client Setup

```typescript
import { io } from 'socket.io-client'

// Get token from auth provider
const token = await clientAuthProvider.getToken()

// Connect with token in handshake
const socket = io('http://localhost:3001', {
  auth: {
    token: token || undefined  // Undefined for demo
  }
})

// Send message
socket.emit('continue-chat', {
  conversationId: '123',
  message: 'Hello'
})

// Listen for responses
socket.on('stream-response', (message) => {
  console.log('AI response:', message)
})
```

---

## Security Considerations

### 1. Token Validation
- **Always validate tokens server-side** - never trust client data
- **Validate on every request** - don't cache user data across requests
- **Use HTTPS in production** - tokens are sensitive

### 2. Demo User Protection
- Demo users use shared `userId: 'demo-user'`
- Demo conversations are isolated (demo users can't access each other's conversations)
- Demo users cannot access admin features
- Demo users skip subscription checks

### 3. Admin Access
- Admin status comes from validated token only
- Never trust client claims of admin status
- Log admin actions for audit trail

### 4. Token Exposure
- Tokens should be short-lived (< 1 hour recommended)
- Implement token refresh on client
- Clear tokens on logout
- Don't log tokens in server logs

### 5. Subscription Enforcement
- Always check `isSubscriber` before allowing conversation start
- Block non-subscribers at API level, not just UI level
- Admins should also have `isSubscriber: true` if they need to test

---

## Migration Examples

### From Firebase Auth to Custom Auth

**Before** (Firebase):
```typescript
const token = await firebase.auth().currentUser.getIdToken()
```

**After** (Custom):
```typescript
const token = await customAuthProvider.getToken()
```

The packages work the same regardless of auth provider!

### From Session-based to JWT

**Server-side change only**:
```typescript
// Before: validate session
const sessionAuth: ServerAuthProvider = {
  validateToken: async (sessionId) => {
    const session = await redis.get(`session:${sessionId}`)
    // ... return user
  }
}

// After: validate JWT
const jwtAuth: ServerAuthProvider = {
  validateToken: async (token) => {
    const decoded = jwt.verify(token, secret)
    // ... return user
  }
}
```

Client code unchanged!

---

## Complete Integration Example

See the example app at `/example-app` for a full working implementation showing:
- Firebase Auth integration (client + server)
- Protected routes
- Socket.io authentication
- Demo mode support
- Subscription checks
- Admin UI protection

---

## FAQ

### Q: Can I use multiple auth providers?
**A**: Yes! Just implement different `ClientAuthProvider` and `ServerAuthProvider` instances and swap them based on your needs.

### Q: What if I don't have subscriptions?
**A**: Set `isSubscriber: true` for all users. The packages will allow everyone to start conversations.

### Q: How do I make all exercises public?
**A**: Set `isSubscriber: true` for all users, including demo users.

### Q: Can I add custom user properties?
**A**: Yes! The `User` interface can be extended:
```typescript
interface ExtendedUser extends User {
  organizationId: string
  customField: any
}
```

### Q: Do I need to implement token refresh myself?
**A**: The packages handle the retry logic, but your `ClientAuthProvider.getToken()` should return a fresh token when called. Most auth libraries (Firebase, Auth0) handle this automatically.

### Q: What about multi-tenancy?
**A**: The open source version assumes single organization. For multi-tenancy, you could add `organizationId` to your `User` model and filter exercises/conversations by organization in your storage layer.

---

## Summary

**Client**: Provides tokens via `ClientAuthProvider`
**Server**: Validates tokens and extracts user info via `ServerAuthProvider`
**Security**: Always validate server-side, never trust client data
**Demo**: No token required, uses shared demo user
**Subscription**: `isSubscriber` controls conversation access
**Admin**: `isAdmin` controls admin UI and full conversation access
