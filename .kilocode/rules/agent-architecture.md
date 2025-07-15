## Brief overview
This rule file outlines the preferred architectural patterns and abstraction principles for agent-related code within this project. These guidelines are derived from our recent collaboration on abstracting the agent.

## Agent Abstraction
- **Encapsulation**: The core agent logic, including the Anthropic client instance and conversation flow, should be encapsulated within a dedicated `Agent` class.
- **Statelessness**: The `Agent` class should be designed to be stateless regarding conversation history. Conversation state should be managed locally within the `Agent.start()` method or passed as parameters, ensuring each session is independent.

## Dependency Management
- **Dependency Injection**: External dependencies, such as input mechanisms (e.g., `readline`), should be injected into the `Agent` class constructor rather than being instantiated internally. This promotes modularity and testability.
- **Decoupling**: The `Agent` should be decoupled from specific I/O implementations, allowing it to be reused in various environments (e.g., CLI, web, bot).

## Code Structure
- **Separation of Concerns**: Agent-specific logic should reside in its own file (e.g., `src/agent.ts`), separate from the application's entry point (`src/index.ts`).
- **Entry Point Responsibility**: The main application file (`src/index.ts`) should be responsible for setting up external dependencies, instantiating the `Agent` with injected dependencies, and initiating the agent's operation.