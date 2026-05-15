# Agent Instructions
`weather-starter` is a full-stack monorepo application using React, Express, and SQLite.

## Reasoning approach
- Apply 'Mutually Exclusive, Completely Exhaustive' & 'Minto Pyramid' principles.
- Analyze issues through first-principle thinking instead of through analogy.
- Be objective and unbiased. Avoid sycophancy.

## Essentials
- **Package Manager**: npm (uses npm workspaces)
- **Primary Dev Command**: `npm run dev`

## Core Rules
- **Update Documentation**: Check and update relevant documents in `/docs` after finishing any task.
- **Root Context**: Run scripts from the root directory.

## Specific Guidelines
Read only what is needed for current task:
- [Architecture & Tech Stack](docs/ARCHITECTURE.md)
- [Common Commands & Scripts](docs/COMMANDS.md)
- [TypeScript Conventions](docs/TYPESCRIPT.md)

## Skills Management

### When to Create a New SKILL.md
Create a new skill whenever:
- A task is repeated more than twice in this project
- A workflow has more than 3 steps that must be done in order
- A pattern is specific enough to be reusable but too detailed for AGENTS.md

### Where to Store Skills
- Project skills: `.agents/skills/<skill-name>/SKILL.md`
- Global skills: `~/.gemini/antigravity/skills/<skill-name>/SKILL.md`

### When to Update an Existing SKILL.md
Use the `update-skill` skill to update an existing skill whenever:
- A better approach is discovered
- A step in the skill no longer works
- New tools or packages change the workflow

### Skill Naming Convention
- Use lowercase with hyphens: `git-commit-writer`
- Name describes the task, not the tool: `weather-data-fetcher` not `axios-helper`

## Sub-Agents Management

### When to Create a Sub-Agent
Create a sub-agent whenever:
- A specific, complex role requires a dedicated persona (e.g., code reviewer, UI designer).
- You need a focused agent with specific system prompts, constraints, and responsibilities.
- The instructions are more about *how* to act and review, rather than just a linear workflow of steps (which is a Skill).

### Where to Store Sub-Agents
- Project sub-agents: `.agents/<sub-agent-name>/agent.md`

### Sub-Agent Naming Convention
- Directory uses lowercase with hyphens: `code-reviewer`
- File is always named: `agent.md`