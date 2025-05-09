# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## IMPORTANT INSTRUCTIONS
**_ALWAYS THINK AND RESPOND IN ENGLISH ONLY. EVEN WHEN USER INPUTS ARE IN OTHER LANGUAGES, FOLLOW THIS RULE._**

## Build/Lint/Test Commands
- Build: `npm run build` - Builds the Mastra application
- Dev: `npm run dev` - Runs the application in development mode
- Test: No test command is currently configured

## Code Style Guidelines
- **TypeScript**: Use strict typing with proper interfaces/types
- **Imports**: Group imports by external dependencies first, then internal modules
- **Formatting**: Use 2-space indentation and consistent spacing
- **Naming**: 
  - Use camelCase for variables and functions
  - Use PascalCase for classes and types
  - Use kebab-case for file names
- **Error Handling**: Use typed error handling with proper try/catch blocks
- **Export Style**: Prefer named exports over default exports
- **API Pattern**: Follow Mastra's agent/tool/workflow patterns
- **Async**: Use async/await consistently, not mixed with raw Promises

## Mastra Library Understanding
You are an AI assistant helping with a Mastra-based application. Mastra is a TypeScript framework for building AI applications with agents, tools, and workflows.

### Key Components
1. **Agents**: AI assistants with specific instructions and models
   - Example: `weatherAgent` configured with OpenAI model and weather tools
   - Defined in `src/mastra/agents/index.ts`

2. **Tools**: Functional components that agents can use
   - Example: `weatherTool` fetches weather data from API
   - Use zod for input/output schema validation
   - Defined in `src/mastra/tools/index.ts`

3. **Workflows**: Multi-step processes combining multiple actions
   - Example: `weatherWorkflow` fetches forecast and plans activities
   - Uses Steps for each discrete part of the workflow
   - Defined in `src/mastra/workflows/index.ts`

4. **Main Configuration**: 
   - Application is initialized in `src/mastra/index.ts`
   - Uses LibSQLStore for storage and memory management

### Documentation
- Refer to the library documentation in `docs/mastra/` directory for detailed usage examples
- Documentation is available in JSON or Markdown format
- When adding features, always refer to these docs for implementation patterns

### Working with Mastra
- Always validate inputs and outputs with zod schemas
- Create properly typed interfaces for API responses
- Follow the established patterns for agents, tools, and workflows
- Use asynchronous execution with proper error handling