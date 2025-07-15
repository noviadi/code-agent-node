# Code Agent Node

A Node.js-based agent application powered by Anthropic, featuring a modular architecture with dependency injection and a robust tool system.

## Setup

1.  **Clone the repository:**
    ```bash
    git clone [repository-url]
    cd code-agent-node
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Configure environment variables:**
    Create a `.env` file in the root directory based on `.env.example` and add your `ANTHROPIC_API_KEY`.
    ```
    ANTHROPIC_API_KEY=your_anthropic_api_key_here
    ```

## Usage

To start the agent:

```bash
npm start
```

Prompt your agent:

```bash
You: Create fizzbuzz.js with fizzbuzz implementation that can be run using NodeJS
Clause: <magic>
```

Type `exit` to quit the agent.

## Testing

To run unit tests:

```bash
npm test
