# @downpat/express

## 0.1.0

### Minor Changes

- Remove wildcard CORS default from Socket.io configuration. corsOrigin must now be passed explicitly for cross-origin access; omitting it rejects cross-origin requests (secure by default).

### Patch Changes

- Add custom error classes (NotFoundError, UnauthorizedError, ValidationError) to @downpat/core. Express routes now use instanceof checks instead of fragile error message string matching.
- Updated dependencies
- Updated dependencies
  - @downpat/ai-adapters@0.1.0
  - @downpat/core@0.0.2
