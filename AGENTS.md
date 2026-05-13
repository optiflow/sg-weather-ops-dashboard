# Agent Instructions
`weather-starter` is a full-stack monorepo application using React, Express, and SQLite.

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
Update an existing skill whenever:
- A better approach is discovered
- A step in the skill no longer works
- New tools or packages change the workflow

### Skill Naming Convention
- Use lowercase with hyphens: `git-commit-writer`
- Name describes the task, not the tool: `weather-data-fetcher` not `axios-helper`