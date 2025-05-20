# Ticketing System Documentation

This document provides detailed information about the ticket-based development workflow used in the coc-vue project.

## Table of Contents

- [Overview](#overview)
- [Ticket Structure](#ticket-structure)
- [Categories](#categories)
- [Workflow](#workflow)
- [CLI Commands](#cli-commands)
- [GitHub Integration](#github-integration)
- [Best Practices](#best-practices)

## Overview

The coc-vue project uses a structured ticket-based workflow to track all development tasks. This system ensures that:

- All changes are properly documented
- Each task follows a standardized workflow
- Progress is visible to all team members
- Work can be easily prioritized
- GitHub Issues integration provides team-wide visibility

## Ticket Structure

### Naming Convention

Tickets follow a standardized naming convention:

```
issue-[priority]-[uuid]-[status]
```

- **priority**: A number from 1-100 indicating the ticket's priority (higher = more important)
- **uuid**: A unique identifier for the ticket
- **status**: The current status of the ticket (pending, in-progress, completed, etc.)

### Directory Structure

Tickets are organized by category in the `Ticket` directory:

```
Ticket/
├── feat/            # Feature development tickets
│   ├── index.md     # Category roadmap
│   └── issue-*      # Individual tickets
├── ui/              # UI component tickets
├── structure/       # Code structure tickets
├── ci/              # CI/CD pipeline tickets
├── docs/            # Documentation tickets
├── test/            # Testing tickets
└── perf/            # Performance tickets
```

Each category has an `index.md` file that serves as a roadmap, listing all tickets in that category.

### Ticket Content

Each ticket contains:

1. **Metadata**: Priority, UUID, category, and status
2. **Description**: Detailed description of the task
3. **Workflow**: Category-specific workflow steps
4. **Acceptance Criteria**: Requirements for completion
5. **Test Cases**: Relevant test cases (where applicable)
6. **Related Components**: Components affected by the change

## Categories

### Feature (feat)

Feature tickets track the development of new features or enhancements to existing features.

**Workflow**:
1. Design Phase
2. Implementation Phase
3. Testing Phase
4. Documentation Phase
5. Review and Finalization

### UI

UI tickets focus on user interface components and visual improvements.

**Workflow**:
1. Design Phase
2. Implementation Phase
3. Testing Phase
4. Integration Phase

### Structure

Structure tickets address code organization, refactoring, and architectural improvements.

**Workflow**:
1. Analysis Phase
2. Planning Phase
3. Implementation Phase
4. Verification Phase

### CI/CD (ci)

CI tickets focus on improving the continuous integration and deployment pipeline.

**Workflow**:
1. Analysis Phase
2. Implementation Phase
3. Testing Phase
4. Documentation Phase

### Documentation (docs)

Documentation tickets track improvements to project documentation.

**Workflow**:
1. Research Phase
2. Writing Phase
3. Review Phase
4. Publication Phase

### Testing (test)

Testing tickets focus on improving test coverage and reliability.

**Workflow**:
1. Analysis Phase
2. Implementation Phase
3. Verification Phase
4. Integration Phase

### Performance (perf)

Performance tickets track optimizations and performance improvements.

**Workflow**:
1. Profiling Phase
2. Implementation Phase
3. Testing Phase
4. Documentation Phase

## Workflow

### Creating a Ticket

1. Identify the appropriate category for your task
2. Determine the priority (1-100)
3. Create a descriptive title
4. Run the ticket creation command:
   ```bash
   ./coc-vue-cli.sh ticket:create [category] [priority] [title]
   ```
5. The system will generate a ticket with a unique UUID and a template specific to the category

### Working on a Ticket

1. Follow the workflow steps defined in the ticket template
2. Update the ticket status as you progress:
   ```bash
   ./coc-vue-cli.sh ticket:status [uuid] [in-progress]
   ```
3. Document your progress within the ticket

### Completing a Ticket

1. Ensure all workflow steps are completed
2. Verify that all acceptance criteria are met
3. Update the ticket status to completed:
   ```bash
   ./coc-vue-cli.sh ticket:status [uuid] completed
   ```
4. If the ticket is linked to a GitHub issue, update the issue with the completion status

## CLI Commands

The coc-vue-cli provides several commands for managing tickets:

### Create a Ticket

```bash
./coc-vue-cli.sh ticket:create [category] [priority] [title]
```

Example:
```bash
./coc-vue-cli.sh ticket:create feat 90 "Add Modal Component"
```

### List All Tickets

```bash
./coc-vue-cli.sh ticket:list
```

This command lists all tickets across all categories, sorted by priority.

### Update Ticket Status

```bash
./coc-vue-cli.sh ticket:status [uuid] [status]
```

Example:
```bash
./coc-vue-cli.sh ticket:status a88cf6d1 in-progress
```

Common status values:
- `pending`: Not yet started
- `in-progress`: Currently being worked on
- `review`: Ready for review
- `completed`: Work is complete
- `blocked`: Blocked by another task

### Deploy to GitHub Issues

```bash
./coc-vue-cli.sh ticket:deploy [uuid]
```

Example:
```bash
./coc-vue-cli.sh ticket:deploy a88cf6d1
```

This command creates a GitHub issue with the ticket details and links it to your local ticket.

## GitHub Integration

The ticketing system integrates with GitHub Issues to provide team-wide visibility:

1. When a ticket is deployed to GitHub, an issue is created with:
   - The ticket title as the issue title
   - The ticket description, priority, and UUID in the issue body
   - Labels for the category and priority

2. The GitHub issue URL is saved in the local ticket for reference

3. When the ticket status is updated, you can also update the GitHub issue manually or through the GitHub CLI

## Best Practices

### Prioritization

- Use priority numbers meaningfully:
  - **90-100**: Critical issues that block other work
  - **70-89**: High-priority features or improvements
  - **50-69**: Medium-priority tasks
  - **30-49**: Low-priority enhancements
  - **1-29**: Nice-to-have improvements

### Ticket Creation

- Be specific and descriptive in ticket titles
- Include all relevant details in the description
- Break large tasks into smaller, manageable tickets
- Assign appropriate priorities based on project needs

### Workflow

- Follow the category-specific workflow steps in order
- Update ticket status regularly to reflect progress
- Document any issues or blockers in the ticket
- Link related tickets where appropriate

### GitHub Integration

- Deploy important tickets to GitHub for team visibility
- Keep GitHub issues updated with progress
- Use GitHub for team discussions about the ticket
- Close GitHub issues when the ticket is completed

---

For any questions or suggestions about the ticketing system, please create a ticket in the `docs` category or open a GitHub issue.
