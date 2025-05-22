# Documentation Exploration Prompt

This prompt is designed to guide users through a comprehensive exploration of the project documentation before making any modifications, using the powerful `manage-doc.sh` script.

## Instructions for Documentation Exploration

```
You are exploring the coc-vue documentation system using the manage-doc.sh script. This documentation system provides comprehensive information about the project's architecture, components, testing framework, and development workflows.

Before making any changes to the documentation, please follow these steps to fully explore the relevant sections:

1. First, generate a summary of the entire documentation structure:
   ./manage-doc.sh generate-summary

2. Understand the hierarchical relationships between documents:
   ./manage-doc.sh show-structure

3. Search for all mentions of the component or feature you intend to modify:
   ./manage-doc.sh search "[YOUR KEYWORD]"

4. For each relevant document found, view it in full:
   ./manage-doc.sh view [DOCUMENT_NAME].md

5. Extract specific sections that relate to your area of interest:
   ./manage-doc.sh view-section [DOCUMENT_NAME].md "[SECTION_TITLE]"

6. If your changes involve technical terms, review the glossary:
   ./manage-doc.sh extract-glossary

7. For context-specific exploration, export relevant context:
   ./manage-doc.sh export-context [CONTEXT_KEYWORD]

8. When you're ready to make changes, first start a documentation session:
   ./manage-doc.sh start-session

9. Make your modifications using the appropriate commands:
   - To update a section: ./manage-doc.sh update-doc [FILE] [SECTION_TITLE]
   - To set priority: ./manage-doc.sh set-priority [FILE] [SECTION_TITLE] [PRIORITY]
   - To delete a section: ./manage-doc.sh delete-block [FILE] [SECTION_TITLE]

10. After making changes, regenerate Markdown files:
    ./manage-doc.sh generate-md

11. Review your changes and either commit them or reset if needed:
    - To reset changes: ./manage-doc.sh reset-session
    - To confirm changes: ./manage-doc.sh close-session

Remember that comprehensive documentation exploration before making changes ensures consistency, accuracy, and integration with the existing documentation system.
```

## Best Practices for Documentation Modification

1. **Understand the Context**: Always explore related documents and sections before making any changes
2. **Maintain Consistency**: Follow existing documentation styles, prioritization, and tagging conventions
3. **Use Proper Tags**: Assign relevant tags to help with categorization and search
4. **Set Appropriate Priorities**: Use HIGH for critical information, MEDIUM for standard content, LOW for supplementary details
5. **Create Safe Sessions**: Always use session management to ensure you can revert changes if needed
6. **Cross-Reference**: Mention related documents or sections when adding new content
7. **Regenerate After Changes**: Always run `generate-md` after updating YAML files to keep Markdown in sync
8. **Review Generated Output**: Check the final Markdown files to ensure they render as expected

## Common Modification Scenarios

### Adding a New Component Documentation

```bash
# Start a session
./manage-doc.sh start-session

# Create documentation file (requires manual editing)
# Then update sections as needed
./manage-doc.sh update-doc doc/NEW_COMPONENT.yml "Overview"
./manage-doc.sh update-doc doc/NEW_COMPONENT.yml "Implementation Details"

# Set appropriate priorities
./manage-doc.sh set-priority doc/NEW_COMPONENT.yml "Overview" "HIGH"

# Regenerate markdown
./manage-doc.sh generate-md

# Close the session to confirm changes
./manage-doc.sh close-session
```

### Updating Existing Documentation

```bash
# Start with exploration
./manage-doc.sh search "feature name"

# Start a session
./manage-doc.sh start-session

# Update relevant sections
./manage-doc.sh update-doc doc/EXISTING_DOC.yml "Section To Update"

# Regenerate markdown
./manage-doc.sh generate-md

# Close the session to confirm changes
./manage-doc.sh close-session
```
