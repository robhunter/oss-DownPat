# NPM Publishing Checklist

## 1. Documentation
- [x] Add quickstart README.md to each package with:
  - Installation instructions
  - Basic usage examples
  - API overview
  - Link to main repo docs
- [x] Ensure root README.md is up to date

## 2. npm Organization Setup
- [ ] Create `@downpat` organization on npmjs.com
- [ ] Run `npm login` with account that has publish access to the org

## 3. Package.json Enhancements
Add missing fields to each package:
- [x] `repository` - GitHub repo URL
- [x] `author` - maintainer info
- [x] `bugs` - issue tracker URL
- [x] `homepage` - docs/project URL
- [x] `keywords` - for discoverability
- [x] `publishConfig.access: "public"` - required for scoped packages

## 4. Dependency Version Pinning
- [x] Replace `"@downpat/core": "*"` with real versions (e.g., `"^0.0.1"`)
- [ ] Consider using **changesets** or **lerna** for coordinated versioning across packages

## 5. Pre-publish Verification
- [ ] Run `npm test --workspaces` - all tests pass
- [ ] Run `npm run build --workspaces` - clean builds
- [ ] Run `npm pack` in each package to verify contents
- [ ] Verify `files` field excludes test files, source maps, etc.

## 6. Publishing Order
Must publish in dependency order:
1. `@downpat/core` (no internal deps)
2. `@downpat/api-client`, `@downpat/ai-adapters`, `@downpat/firebase-storage`, `@downpat/ui-components` (depend only on core)
3. `@downpat/express` (depends on core, ai-adapters)
4. `@downpat/admin-ui` (depends on core, api-client)
5. `@downpat/react` (depends on core, api-client, ui-components, admin-ui)

## 7. Optional but Recommended
- [ ] Add CHANGELOG.md per package
- [ ] Set up CI/CD pipeline for automated publishing
- [ ] Enable provenance (`--provenance` flag for supply chain security)
- [ ] Add `.npmignore` if `files` field is insufficient
