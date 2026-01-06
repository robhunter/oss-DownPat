# NPM Publishing Checklist

## 1. Documentation
- [ ] Add quickstart README.md to each package with:
  - Installation instructions
  - Basic usage examples
  - API overview
  - Link to main repo docs
- [ ] Ensure root README.md is up to date

## 2. npm Organization Setup
- [ ] Create `@downpat` organization on npmjs.com
- [ ] Run `npm login` with account that has publish access to the org

## 3. Package.json Enhancements
Add missing fields to each package:
- [ ] `repository` - GitHub repo URL
- [ ] `author` - maintainer info
- [ ] `bugs` - issue tracker URL
- [ ] `homepage` - docs/project URL
- [ ] `keywords` - for discoverability (only `ai-adapters` has these currently)
- [ ] `publishConfig.access: "public"` - required for scoped packages

## 4. Dependency Version Pinning
- [ ] Replace `"@downpat/core": "*"` with real versions (e.g., `"^0.0.1"`)
- [ ] Consider using **changesets** or **lerna** for coordinated versioning across packages

## 5. Pre-publish Verification
- [ ] Run `npm test --workspaces` - all tests pass
- [ ] Run `npm run build --workspaces` - clean builds
- [ ] Run `npm pack` in each package to verify contents
- [ ] Verify `files` field excludes test files, source maps, etc.

## 6. Publishing Order
Must publish in dependency order:
1. `@downpat/core` (no internal deps)
2. `@downpat/firebase-storage`
3. `@downpat/express`
4. `@downpat/ui-components`
5. `@downpat/admin-ui`
6. `@downpat/ai-adapters`

## 7. Optional but Recommended
- [ ] Add CHANGELOG.md per package
- [ ] Set up CI/CD pipeline for automated publishing
- [ ] Enable provenance (`--provenance` flag for supply chain security)
- [ ] Add `.npmignore` if `files` field is insufficient
