# Contributing to Kala

Thank you for your interest in contributing to Kala! This document provides guidelines and instructions for contributing.

## Development Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/yourusername/kala.git
   cd kala
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development**
   ```bash
   npm run dev
   ```

4. **Load extension in browser**
   - Navigate to `chrome://extensions`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist/` directory

## Project Structure

```
src/
├── background/     # Service Worker (Manifest V3)
├── content/        # Content Scripts
├── popup/          # React UI Components
└── shared/         # Shared utilities and types
```

## Code Style

- **TypeScript**: Strict mode enabled, full type safety
- **Formatting**: ESLint + Prettier
- **Comments**: JSDoc-style comments for all public APIs
- **Naming**: Clear, descriptive names following TypeScript conventions

## Testing

```bash
# Run unit tests
npm test

# Run with coverage
npm test -- --coverage
```

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes with clear, descriptive commits
3. Write or update tests as needed
4. Ensure all tests pass
5. Update documentation if needed
6. Submit PR with clear description of changes

## Performance Requirements

- Event processing: <2ms overhead
- Frame rate: Maintain 60 FPS
- Memory: <50MB baseline

## Security Considerations

- All security-related code must have JSDoc comments
- No sensitive data in logs (use Logger utility)
- Follow privacy-first principles
- Test against known trackers (BioCatch, BehavioSec, TypingDNA)

## Questions?

Open an issue for questions or discussions about contributions.

