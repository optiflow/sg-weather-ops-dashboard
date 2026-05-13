---
name: update-skill
description: Update an existing skill. Use this when AGENTS.md rules dictate a skill needs updating (e.g., a better approach is discovered, a step no longer works, or new tools/packages change the workflow).
---

A skill for updating and maintaining existing skills within the project or global agents directory.

As per `AGENTS.md`, an existing skill MUST be updated whenever:
- A better approach is discovered.
- A step in the skill no longer works.
- New tools or packages change the workflow.

## Skill Update Workflow

When tasked with updating an existing skill, follow these steps:

### 1. Locate the Skill
Identify if the skill is a project skill or a global skill.
- Project skills are located in: `.agents/skills/<skill-name>/SKILL.md`
- Global skills are located in: `~/.gemini/antigravity/skills/<skill-name>/SKILL.md`

### 2. Analyze the Need for Update
Determine the exact reason for the update. 
- Are you replacing an outdated tool?
- Are you fixing a broken step in a workflow?
- Are you optimizing a script bundled with the skill?

### 3. Review Existing Skill Content
- Read the current `SKILL.md` file of the target skill.
- Review any bundled resources in the `scripts/`, `references/`, or `assets/` directories.
- Ensure you understand the current workflow before making modifications.

### 4. Implement the Updates
- **Update `SKILL.md`**: Modify the Markdown instructions to reflect the new approach, fix the broken step, or incorporate the new tools.
- **Update Bundled Resources**: If a script or reference file is outdated, modify it directly. 
- **Maintain Frontmatter**: Ensure the `name` and `description` in the YAML frontmatter remain accurate, updating the description if the skill's purpose or triggers have changed.

### 5. Verify the Update
- Ensure the updated instructions are clear, concise, and follow the imperative form.
- Confirm that the context size remains manageable (keep the `SKILL.md` body focused on essentials).
- Check that the reason for updating (better approach, broken step, new tools) has been fully addressed.
