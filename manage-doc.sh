#!/bin/bash

# Print usage information
print_usage() {
  echo "Usage: $0 <command> [arguments...]"
  echo ""
  echo "Commands:"
  echo "  generate                           Generate all YAML docs from Markdown files"
  echo "  generate-md                        Generate Markdown files from YAML docs"
  echo "  delete-block <file> <section-title> Delete a section from a YAML doc"
  echo "  delete-file <file>                 Delete a YAML doc file"
  echo "  update-doc <file> <section-title>  Update a section in a YAML doc"
  echo "  set-priority <file> <section-title> <priority> Set priority for a section"
  echo "  set-category <file> <section-title> <category> Set category for a section"
  echo "  start-session                      Create a backup of doc directory and start tracking changes"
  echo "  reset-session                      Restore all doc files from backup"
  echo "  close-session                      Close the session and delete backup"
  echo "  view <file>                        View a markdown file"
  echo "  search <query>                     Search for text in all markdown files"
  echo "  view-section <file> <section-title> View a specific section of a markdown file"
  echo "  ranking                            Show top 10 most viewed sections"
  echo "  generate-summary                   Generate a global summary of the project"
  echo "  show-relations                     Generate a map of document relations"
  echo "  show-history [count]               Show document change history (default 10 commits)"
  echo "  extract-glossary                   Generate a glossary of technical terms"
  echo "  export-context <context>           Export all sections containing the context keyword"
  echo "  show-structure                     Generate a hierarchical view of docs and sections"
  echo "  autocomplete <command> <partial>   Get suggestions for command parameters"
  echo "  dry-run <command> [args...]        Show what changes would be made without applying them"
  echo "  document-script                    Generate documentation for the manage-doc.sh script itself"
}

# Check if jq and grep are installed
check_dependencies() {
  if ! command -v jq &> /dev/null; then
    echo "Error: jq is required but not installed. Please install jq first."
    exit 1
  fi
  if ! command -v grep &> /dev/null; then
    echo "Error: grep is required but not installed."
    exit 1
  fi
}

# Validate file exists
validate_file() {
  local file="$1"
  if [ ! -f "$file" ]; then
    echo "Error: File '$file' not found."
    exit 1
  fi
}

# Validate section exists
validate_section() {
  local file="$1"
  local section_title="$2"
  
  # Use grep first to avoid jq parsing errors
  if ! grep -q "\"title\": \"$section_title\"" "$file"; then
    echo "Error: Section '$section_title' not found in file '$file'."
    exit 1
  fi
  
  # Additional jq check if the grep was successful
  # We catch any jq errors and just proceed if we have already found the section with grep
  local section_count
  section_count=$(jq --arg title "$section_title" '.sections[] | select(.title == $title) | length' "$file" 2>/dev/null || echo "found")
  
  if [ -z "$section_count" ] || [ "$section_count" == "0" ]; then
    echo "Error: Section '$section_title' not found in file '$file'."
    exit 1
  fi
}

# Get confirmation from user
get_confirmation() {
  local confirmation
  read -p "Type UPDATE to confirm: " confirmation
  if [ "$confirmation" != "UPDATE" ]; then
    echo "Operation cancelled."
    exit 0
  fi
}

# Generate all YAML docs from Markdown files
generate_docs() {
  echo "Generating YAML docs from Markdown files..."
  # This would be your script to convert MD to YAML
  # For now, just list existing YAML files in doc directory
  
  echo "Summary of generated files:"
  for file in doc/*.yml; do
    if [ -f "$file" ]; then
      filename=$(basename "$file")
      # Utiliser grep pour extraire le résumé de manière plus robuste
      # Cela fonctionne même si le fichier YAML est mal formaté
      summary=$(grep -o '"summary":\s*"[^"]*"' "$file" | sed 's/"summary":\s*"\(.*\)"/\1/')
      
      # Si grep ne trouve pas de résumé, essayer jq comme fallback
      if [ -z "$summary" ]; then
        summary=$(jq -r '.summary' "$file" 2>/dev/null || echo "No summary available")
      fi
      
      echo "- $filename: $summary"
    fi
  done
  
  echo "YAML documentation generation complete."
}

# Generate Markdown files from YAML docs using Node.js script
generate_md() {
  echo "Generating Markdown files from YAML docs..."
  
  # Check if node is installed
  if ! command -v node >/dev/null 2>&1; then
    echo "Error: Node.js is required but not installed. Please install Node.js first."
    exit 1
  fi
  
  # Check if the yaml-to-md.js script exists
  if [ ! -f "scripts/yaml-to-md.js" ]; then
    echo "Error: scripts/yaml-to-md.js script not found."
    echo "Please make sure the script exists and is executable."
    exit 1
  fi
  
  # Create doc_md directory if it doesn't exist
  mkdir -p doc_md
  
  # Run the Node.js script to convert YAML to Markdown
  node scripts/yaml-to-md.js doc doc_md
  
  # Check if the conversion was successful
  if [ $? -ne 0 ]; then
    echo "Error: Failed to convert YAML files to Markdown."
    exit 1
  fi
}

# Delete a section from a YAML doc
delete_block() {
  local file="$1"
  local section_title="$2"
  
  validate_file "$file"
  validate_section "$file" "$section_title"
  
  echo "About to delete the following section from $file:"
  jq --arg title "$section_title" '.sections[] | select(.title == $title)' "$file"
  
  get_confirmation
  
  # Delete the section and save
  jq --arg title "$section_title" '.sections = [.sections[] | select(.title != $title)]' "$file" > "${file}.tmp" && mv "${file}.tmp" "$file"
  
  echo "Section '$section_title' successfully deleted from '$file'."
}

# Delete a YAML doc file
delete_file() {
  local file="$1"
  
  validate_file "$file"
  
  echo "About to delete the following YAML doc:"
  echo "File: $file"
  echo "Summary: $(jq -r '.summary' "$file")"
  
  get_confirmation
  
  rm "$file"
  echo "File '$file' successfully deleted."
}

# Update a section in a YAML doc
update_doc() {
  local file="$1"
  local section_title="$2"
  local content_file="$3"
  
  validate_file "$file"
  validate_section "$file" "$section_title"
  
  echo "About to update the following section in $file:"
  grep -A5 "\"title\": \"$section_title\"" "$file" || echo "Section found but could not display content due to formatting issues."
  
  # Check if content is provided from a file
  if [ -n "$content_file" ] && [ -f "$content_file" ]; then
    content=$(cat "$content_file")
    echo "\nContent loaded from file: $content_file"
  else
    echo "\nPlease enter the new content (type END on a new line when finished):"
    content=""
    while IFS= read -r line; do
      if [ "$line" = "END" ]; then
        break
      fi
      content="${content}${line}\n"
    done
    
    # Remove trailing newline
    content=${content%\n}
  fi
  
  echo "\nReview the new content:"
  echo "$content"
  
  get_confirmation
  
  # Use sed to update the section content directly if jq fails
  if ! jq --arg title "$section_title" --arg content "$content" '.sections = [.sections[] | if .title == $title then .content = $content else . end]' "$file" > "${file}.tmp" 2>/dev/null; then
    echo "Using fallback method to update content..."
    # Create a simple pattern to locate and replace the content
    sed -i.bak "s/\"content\": \"[^\"]*\"/\"content\": \"$content\"/g" "$file"
    if [ $? -eq 0 ]; then
      echo "Section updated with sed."
      rm -f "${file}.bak"
    else
      echo "Error: Could not update section with sed."
      exit 1
    fi
  else
    mv "${file}.tmp" "$file"
  fi
  
  echo "Section '$section_title' successfully updated in '$file'."
}

# Set priority for a section
set_priority() {
  local file="$1"
  local section_title="$2"
  local new_priority="$3"
  
  validate_file "$file"
  validate_section "$file" "$section_title"
  
  # Validate priority
  if [[ ! "$new_priority" =~ ^(LOW|MEDIUM|HIGH|CRITICAL)$ ]]; then
    echo "Error: Priority must be one of: LOW, MEDIUM, HIGH, CRITICAL"
    exit 1
  fi
  
  local current_priority=$(jq -r --arg title "$section_title" '.sections[] | select(.title == $title) | .priority' "$file")
  local section_summary=$(jq -r --arg title "$section_title" '.sections[] | select(.title == $title) | .content | .[0:100] + "..."' "$file")
  
  echo "Current priority for section '$section_title': $current_priority"
  echo "Section summary: $section_summary"
  echo "New priority will be: $new_priority"
  
  get_confirmation
  
  # Update the priority and save
  jq --arg title "$section_title" --arg priority "$new_priority" '.sections = [.sections[] | if .title == $title then .priority = $priority else . end]' "$file" > "${file}.tmp" && mv "${file}.tmp" "$file"
  
  echo "Priority for section '$section_title' successfully updated to '$new_priority' in '$file'."
}

# Set category for a section
set_category() {
  local file="$1"
  local section_title="$2"
  local new_category="$3"
  
  validate_file "$file"
  validate_section "$file" "$section_title"
  
  local current_categories=$(jq -r --arg title "$section_title" '.sections[] | select(.title == $title) | .tags | join(", ")' "$file")
  local section_summary=$(jq -r --arg title "$section_title" '.sections[] | select(.title == $title) | .content | .[0:100] + "..."' "$file")
  
  echo "Current categories for section '$section_title': $current_categories"
  echo "Section summary: $section_summary"
  echo "New category will be: $new_category"
  
  get_confirmation
  
  # Convert the category to an array
  IFS=',' read -ra category_array <<< "$new_category"
  json_array=$(printf '["%s"]' "${category_array[*]}")
  json_array=${json_array// /","}
  
  # Update the categories and save
  jq --arg title "$section_title" --argjson tags "$json_array" '.sections = [.sections[] | if .title == $title then .tags = $tags else . end]' "$file" > "${file}.tmp" && mv "${file}.tmp" "$file"
  
  echo "Categories for section '$section_title' successfully updated to '$new_category' in '$file'."
}

# Check if a session is active
is_session_active() {
  if [ -d "doc/.backup-session" ]; then
    return 0
  else
    return 1
  fi
}

# Ensure session is active before destructive actions
ensure_session_active() {
  if ! is_session_active; then
    echo "No active session. Start with 'start-session'."
    exit 1
  fi
}

# Start a session for tracking document changes
start_session() {
  if is_session_active; then
    echo "A session is already active. Close it with 'close-session' before starting a new one."
    exit 1
  fi
  
  mkdir -p doc/.backup-session
  cp -r doc/* doc/.backup-session/ 2>/dev/null || true
  
  if ! grep -q "doc/.backup-session" .gitignore 2>/dev/null; then
    echo "doc/.backup-session" >> .gitignore
  fi
  
  echo "Session started. All changes are now tracked."
}

# Reset session by restoring from backup
reset_session() {
  if ! is_session_active; then
    echo "No active session. Start with 'start-session'."
    exit 1
  fi
  
  find doc -type f -not -path "doc/.backup-session*" -delete
  cp -r doc/.backup-session/* doc/ 2>/dev/null || true
  
  echo "Session reset. All doc files restored from backup."
}

# Close the session and delete backup
close_session() {
  if ! is_session_active; then
    echo "No active session to close."
    exit 1
  fi
  
  rm -rf doc/.backup-session
  echo "Session closed. Backup deleted."
}

# List sections in a YAML doc
list_sections() {
  local file="$1"
  
  validate_file "$file"
  
  echo "Sections in $file:"
  # Try with jq first
  jq -r '.sections[].title' "$file" 2>/dev/null || {
    # Fallback to grep if jq fails
    echo "Using fallback method to list sections..."
    grep -n "\"title\":" "$file" | sed 's/.*"title": "\([^"]*\)".*/\1/'
  }
}

# List available helper commands
list_commands() {
  echo "Helper Commands:"
  echo "  list-commands               Show all available helper commands"
  echo "  list-sections <file>        List all sections in a YAML doc file"
  echo "  copy-docs-to-md             Copy markdown files from docs/ to doc_md/"
  echo "  view <file>                 View a markdown file"
  echo "  search <query>              Search for text in all markdown files"
  echo "  view-section <file> <title> View a specific section"
  echo "  ranking                     Show top 10 most viewed sections"
}

# Initialize the search stats file if it doesn't exist
initialize_search_stats() {
  if [ ! -f "doc/.search-stats" ]; then
    echo '{"sections": []}' > "doc/.search-stats"
  fi
}

# View a markdown file
view_markdown() {
  local file="$1"
  local target_file="doc_md/$file"
  
  if [ ! -f "$target_file" ]; then
    echo "Error: File '$target_file' not found."
    exit 1
  fi
  
  cat "$target_file"
}

# Increment the search or view counter for a section
increment_counter() {
  local file="$1"
  local section="$2"
  local counter_type="$3" # "searched" or "viewed"
  
  initialize_search_stats
  
  # Check if the section already exists in the stats file
  local section_exists=$(jq --arg file "$file" --arg section "$section" '.sections[] | select(.file == $file and .section == $section) | .file' "doc/.search-stats" 2>/dev/null)
  
  if [ -z "$section_exists" ]; then
    # Add new section with counters
    local searched_count=0
    local viewed_count=0
    
    if [ "$counter_type" = "searched" ]; then
      searched_count=1
    else
      viewed_count=1
    fi
    
    # Create a temporary file with the new section added
    jq --arg file "$file" --arg section "$section" --arg searched "$searched_count" --arg viewed "$viewed_count" \
      '.sections += [{"file": $file, "section": $section, "searched": ($searched | tonumber), "viewed": ($viewed | tonumber)}]' \
      "doc/.search-stats" > "doc/.search-stats.tmp" && mv "doc/.search-stats.tmp" "doc/.search-stats"
  else
    # Update existing section counter
    jq --arg file "$file" --arg section "$section" --arg type "$counter_type" \
      '.sections = [.sections[] | if .file == $file and .section == $section then . + {($type): (.[($type)] + 1)} else . end]' \
      "doc/.search-stats" > "doc/.search-stats.tmp" && mv "doc/.search-stats.tmp" "doc/.search-stats"
  fi
}

# Search for text in all markdown files
search_markdown() {
  local query="$1"
  local count=0
  local max_results=10
  
  echo "Searching for: $query"
  echo ""
  
  # Search in all markdown files
  for file in doc_md/*.md; do
    if [ -f "$file" ]; then
      local filename=$(basename "$file")
      
      # Use grep to find section headers that match or sections with content that matches
      local sections=$(grep -n "^### " "$file" | while read -r section_line; do
        # Extract the section title and line number
        local line_num=$(echo "$section_line" | cut -d':' -f1)
        local section_title=$(echo "$section_line" | sed 's/^[0-9]*:### //')
        
        # Get the content after this section header
        local next_section_line=$(tail -n +$((line_num+1)) "$file" | grep -n "^### " | head -1 | cut -d':' -f1)
        if [ -z "$next_section_line" ]; then
          # If no next section, use to the end of file
          next_section_line="$"
        else
          # Adjust line number relative to file
          next_section_line=$((line_num + next_section_line))
        fi
        
        # Get section content between line_num and next_section_line
        local section_content=""
        if [ "$next_section_line" = "$" ]; then
          section_content=$(tail -n +$((line_num+1)) "$file")
        else
          section_content=$(sed -n "$((line_num+1)),$((next_section_line-1))p" "$file")
        fi
        
        # Check if query matches section title or content (case-insensitive)
        if echo "$section_title $section_content" | grep -i -q "$query"; then
          # Increment the search counter for this section
          increment_counter "$filename" "$section_title" "searched"
          
          # Output the match if under max_results
          if [ $count -lt $max_results ]; then
            echo "File: $filename"
            echo "Section: $section_title"
            echo ""
            # Show first 200 characters of section content
            echo "$section_content" | head -c 200
            echo "..."
            echo ""
            echo "Command: view-section $filename \"$section_title\"  # To see full section"
            echo ""
            count=$((count+1))
          fi
        fi
      done)
      
      # Print the sections if any found
      if [ -n "$sections" ]; then
        echo "$sections"
      fi
      
      # Break if we've reached the maximum results
      if [ $count -ge $max_results ]; then
        break
      fi
    fi
  done
  
  if [ $count -eq 0 ]; then
    echo "No results found for: $query"
  fi
}

# View a specific section of a markdown file
view_section() {
  local file="$1"
  local section_title="$2"
  local target_file="doc_md/$file"
  
  if [ ! -f "$target_file" ]; then
    echo "Error: File '$target_file' not found."
    exit 1
  fi
  
  # Find the section in the file
  local line_num=$(grep -n "^### $section_title$" "$target_file" | cut -d':' -f1)
  
  if [ -z "$line_num" ]; then
    echo "Error: Section '$section_title' not found in file '$target_file'."
    exit 1
  fi
  
  # Increment the view counter for this section
  increment_counter "$file" "$section_title" "viewed"
  
  # Find the next section
  local next_section_line=$(tail -n +$((line_num+1)) "$target_file" | grep -n "^### " | head -1 | cut -d':' -f1)
  
  # Output the section content
  echo "### $section_title"
  if [ -z "$next_section_line" ]; then
    # If no next section, print to the end of file
    tail -n +$((line_num+1)) "$target_file"
  else
    # Print up to the next section
    next_section_line=$((line_num + next_section_line - 1))
    sed -n "$((line_num+1)),$((next_section_line-1))p" "$target_file"
  fi
}

# Show the ranking of most viewed sections
show_ranking() {
  initialize_search_stats
  
  echo "Top 10 Most Viewed Sections:"
  echo ""
  
  # Use jq to sort by viewed count and get top 10
  jq -r '.sections | sort_by(-.viewed) | .[0:10] | .[] | "File: \(.file)\nSection: \(.section)\nViews: \(.viewed)\n"' "doc/.search-stats" 2>/dev/null || echo "No view statistics available yet."
}

# Generate a global summary of the project
generate_summary() {
  local output_file="doc/PROJECT_SUMMARY.md"
  
  {
    echo "# Project Documentation Summary"
    echo "*Generated on $(date '+%Y-%m-%d %H:%M:%S')*"
    echo

    echo "## Overview"

    # Count total files and sections
    local total_files=$(find doc_md -type f -name "*.md" | wc -l | tr -d ' ')
    local total_sections=0
    for file in doc_md/*.md; do
      if [ -f "$file" ]; then
        section_count=$(grep -c "^### " "$file")
        total_sections=$((total_sections + section_count))
      fi
    done

    echo "This project contains **$total_files** documentation files with **$total_sections** total sections."
    echo

    echo "## Main Categories"
    echo

    # Extract and count unique categories from all files
    local categories=()
    for file in doc/*.yml; do
      if [ -f "$file" ]; then
        file_categories=$(jq -r '.sections[] | select(.category != null) | .category' "$file" 2>/dev/null | sort | uniq)
        for category in $file_categories; do
          if [[ ! " ${categories[*]} " =~ " $category " ]]; then
            categories+=("$category")
          fi
        done
      fi
    done

    for category in "${categories[@]}"; do
      local count=$(grep -l "**Tags:.*$category" doc_md/*.md | wc -l | tr -d ' ')
      echo "- **$category**: $count references"
    done
    echo

    echo "## Document Listing"
    echo

    for file in doc_md/*.md; do
      if [ -f "$file" ]; then
        filename=$(basename "$file")
        section_count=$(grep -c "^### " "$file")
        priority=$(grep -m 1 "**Priority:**" "$file" | sed 's/.*\*\*Priority:\*\* \([A-Z]*\).*/\1/')
        summary=$(sed -n '5p' "$file" | sed 's/\*\*Summary:\*\* \(.*\)/\1/')
        
        echo "### $filename"
        [ -n "$priority" ] && echo "**Priority:** $priority"
        echo "**Sections:** $section_count"
        [ -n "$summary" ] && echo "$summary"
        
        # List top sections
        echo ""
        echo "**Key sections:**"
        grep "^### " "$file" | head -5 | sed 's/### \(.*\)/- \1/'
        echo ""
      fi
    done
  } > "$output_file"
  
  echo "Project summary generated: PROJECT_SUMMARY.md"
}

# Generate a glossary of technical terms
extract_glossary() {
  local output_file="doc/GLOSSARY.md"
  
  {
    echo "# Technical Glossary"
    echo "*Generated on $(date '+%Y-%m-%d %H:%M:%S')*"
    echo

    echo "This glossary contains technical terms extracted from project documentation."
    echo

    # Create a temporary file to store terms
    local temp_file=$(mktemp)
    
    # Find potential technical terms (uppercase words or phrases)
    for file in doc_md/*.md; do
      if [ -f "$file" ]; then
        # Extract capitalized terms and acronyms
        grep -o '\b[A-Z][A-Za-z0-9_]*\b' "$file" | sort | uniq >> "$temp_file"
        # Also look for terms in backticks
        grep -o '`[^`]*`' "$file" | sed 's/`\(.*\)`/\1/' | sort | uniq >> "$temp_file"
      fi
    done
    
    # Sort and remove duplicates
    sort "$temp_file" | uniq > "${temp_file}.sorted"
    
    # Generate glossary entries
    while read -r term; do
      if [ -n "$term" ] && [ ${#term} -gt 2 ]; then # Skip very short terms
        echo "## $term"
        
        # Try to find a definition or context
        definition=""
        for file in doc_md/*.md; do
          if [ -f "$file" ]; then
            # Look for sentences containing the term
            context=$(grep -o -E "[^.!?]*\b${term}\b[^.!?]*[.!?]" "$file" | head -1)
            if [ -n "$context" ]; then
              definition=$context
              source=$(basename "$file")
              break
            fi
          fi
        done
        
        if [ -n "$definition" ]; then
          echo "$definition"
          echo "*Source: $source*"
        else
          echo "*No definition found in documentation.*"
        fi
        echo ""
      fi
    done < "${temp_file}.sorted"
    
    # Clean up temp files
    rm "$temp_file" "${temp_file}.sorted"
  } > "$output_file"
  
  echo "Glossary generated: GLOSSARY.md"
}

# Generate a hierarchical view of project structure
show_structure() {
  local output_file="doc/PROJECT_STRUCTURE.md"
  
  {
    echo "# Project Documentation Structure"
    echo "*Generated on $(date '+%Y-%m-%d %H:%M:%S')*"
    echo

    echo "\`\`\`"
    echo "Documentation Structure"
    echo "├── doc/"
    
    # List all YAML files
    for file in doc/*.yml; do
      if [ -f "$file" ]; then
        filename=$(basename "$file")
        echo "│   ├── $filename"
        
        # Count sections in this file
        section_count=$(jq '.sections | length' "$file" 2>/dev/null || echo "?")
        if [ "$section_count" != "?" ] && [ "$section_count" -gt 0 ]; then
          # List up to 5 sections
          sections=$(jq -r '.sections[0:5] | map(.title) | .[]' "$file" 2>/dev/null)
          
          i=0
          while read -r section; do
            if [ -n "$section" ]; then
              i=$((i+1))
              if [ $i -lt 5 ]; then
                echo "│   │   ├── $section"
              elif [ $i -eq 5 ]; then
                if [ "$section_count" -gt 5 ]; then
                  echo "│   │   └── ... ($(($section_count - 5)) more sections)"
                else
                  echo "│   │   └── $section"
                fi
              fi
            fi
          done <<< "$sections"
        fi
      fi
    done
    
    echo "│"
    echo "└── doc_md/"
    
    # List all Markdown files
    for file in doc_md/*.md; do
      if [ -f "$file" ]; then
        filename=$(basename "$file")
        echo "    ├── $filename"
        
        # List sections in each markdown file
        sections=$(grep "^### " "$file" | head -5)
        
        section_count=$(grep -c "^### " "$file")
        
        i=0
        while read -r section; do
          if [ -n "$section" ]; then
            i=$((i+1))
            section_name=$(echo "$section" | sed 's/^### \(.*\)/\1/')
            if [ $i -lt 5 ]; then
              echo "    │   ├── $section_name"
            elif [ $i -eq 5 ]; then
              if [ "$section_count" -gt 5 ]; then
                echo "    │   └── ... ($(($section_count - 5)) more sections)"
              else
                echo "    │   └── $section_name"
              fi
            fi
          fi
        done <<< "$sections"
      fi
    done
    
    echo "\`\`\`"
  } > "$output_file"
  
  echo "Project structure visualized: PROJECT_STRUCTURE.md"
}

# Export sections by context
export_context() {
  local context="$1"
  local output_file="doc/CONTEXT_${context}.yml"
  
  {
    echo "file_name: CONTEXT_${context}"
    echo "relative_path: /doc/CONTEXT_${context}.yml"
    echo "priority: HIGH"
    echo "tags:"
    echo "  - Context"
    echo "  - $context"
    echo "summary: This file contains sections from all documents related to the context '$context'."
    echo "sections:"
    
    local found=false
    
    for file in doc_md/*.md; do
      if [ -f "$file" ]; then
        filename=$(basename "$file")
        base_filename="${filename%.md}"
        
        # Find corresponding YAML source file
        yml_file="doc/${base_filename}.yml"
        
        if [ -f "$yml_file" ]; then
          # Find all section headers in the markdown file
          local sections=$(grep -n "^### " "$file" | sed 's/:\(.*\)/\1/')
          
          for section in $sections; do
            # Extract the section name
            section_name=$(echo "$section" | sed 's/^### \(.*\)/\1/')
            
            # Check if section content contains the context keyword
            section_line=$(grep -n "^### $section_name$" "$file" | cut -d':' -f1)
            
            if [ -n "$section_line" ]; then
              # Find the next section or end of file
              next_section_line=$(tail -n +$((section_line+1)) "$file" | grep -n "^### " | head -1 | cut -d':' -f1)
              
              if [ -n "$next_section_line" ]; then
                next_section_line=$((section_line + next_section_line))
                section_content=$(sed -n "$((section_line+1)),$((next_section_line-1))p" "$file")
              else
                section_content=$(tail -n +$((section_line+1)) "$file")
              fi
              
              # If context found in the section content or header
              if echo "$section_name $section_content" | grep -q -i "$context"; then
                found=true
                
                # Extract priority and tags from the section in the YAML source
                priority="MEDIUM"
                tags=""
                
                # Try to extract the section info from the YAML file
                section_info=$(jq --arg title "$section_name" '.sections[] | select(.title == $title)' "$yml_file" 2>/dev/null)
                if [ -n "$section_info" ]; then
                  priority=$(echo "$section_info" | jq -r '.priority // "MEDIUM"')
                  tags=$(echo "$section_info" | jq -r '.tags | join(", ") // ""')
                fi
                
                # Clean section content for YAML format
                # Remove markdown formatting and escape quotes
                clean_content=$(echo "$section_content" | sed 's/\*\*\([^*]*\)\*\*/\1/g' | sed 's/"/\\"/')
                
                echo "  - title: \"$section_name\""
                echo "    source_file: \"$base_filename\""
                echo "    priority: \"$priority\""
                echo "    tags:"
                echo "      - \"$context\""
                if [ -n "$tags" ]; then
                  IFS=', ' read -r -a tag_array <<< "$tags"
                  for tag in "${tag_array[@]}"; do
                    echo "      - \"$tag\""
                  done
                fi
                echo "    content: \"$clean_content\""
              fi
            fi
          done
        fi
      fi
    done
    
    if [ "$found" = false ]; then
      echo "  - title: \"No relevant sections\""
      echo "    priority: \"LOW\""
      echo "    tags:"
      echo "      - \"$context\""
      echo "    content: \"No sections found related to the context: $context\""
    fi
  } > "$output_file"
  
  echo "Context export created: CONTEXT_${context}.yml"
}

# Document the script itself
document_script() {
  local output_file="doc/MANAGE_DOC_SCRIPT.yml"
  local script_path="$(realpath $0)"
  
  # Ensure the doc directory exists
  mkdir -p doc
  
  # Start writing YAML file
  cat > "$output_file" << EOF
file_name: MANAGE_DOC_SCRIPT
relative_path: /manage-doc.sh
priority: HIGH
tags:
  - Script
  - Documentation
  - Shell
summary: A comprehensive shell script for managing documentation with multiple advanced features including document generation, analysis, and search capabilities.
sections:
EOF

  # Extract function names using grep instead of awk
  grep -n "^[a-zA-Z0-9_]\+()" "$script_path" > /tmp/functions.txt
  
  # Process each function found
  while IFS=":" read -r line_num func_def; do
    # Extract function name
    func_name=$(echo "$func_def" | sed 's/().*$//')
    
    # Get comment above function
    comment_line=$((line_num - 1))
    comment=""
    
    # Extract comments above the function
    while true; do
      line=$(sed -n "${comment_line}p" "$script_path")
      if [[ "$line" == "#"* ]]; then
        # Remove comment marker and prepend to accumulated comment
        clean_line=$(echo "$line" | sed 's/^# *//')
        if [ -z "$comment" ]; then
          comment="$clean_line"
        else
          comment="$clean_line
$comment"
        fi
        comment_line=$((comment_line - 1))
      else
        break
      fi
    done
    
    # Get function purpose from comment or function name
    if [ -n "$comment" ]; then
      purpose=$(echo "$comment" | head -1)
    else
      purpose="Function to ${func_name//_/ } operations"
    fi
    
    # Find usage examples
    usage=$(grep -n " $func_name " "$script_path" | head -1 | sed 's/:/: /')
    if [ -z "$usage" ]; then
      usage="No direct usage examples found in script."
    else
      usage="Example: $usage"
    fi
    
    # Escape special characters for YAML
    purpose_escaped=$(echo "$purpose" | sed 's/"/\"/')
    comment_escaped=$(echo "$comment" | sed 's/"/\"/')
    
    # Add function section to YAML file
    cat >> "$output_file" << EOF
  - title: "${func_name}"
    priority: "HIGH"
    tags:
      - "Function"
      - "Shell"
    content: "${purpose_escaped}

${comment_escaped}

Function signature:
${func_name}() {

Usage:
${usage}"
EOF
  done < /tmp/functions.txt
  
  # Clean up temporary file
  rm -f /tmp/functions.txt
  
  # Add main script execution section
  main_script_line=$(grep -n "^# Main script execution" "$script_path" | cut -d':' -f1)
  if [ -n "$main_script_line" ]; then
    end_script_line=$(wc -l < "$script_path")
    main_content=$(sed -n "$((main_script_line)),$((end_script_line))p" "$script_path")
    
    # Escape quotes for YAML
    main_content_escaped=$(echo "$main_content" | sed 's/"/\"/')
    
    cat >> "$output_file" << EOF
  - title: "Main Script Execution"
    priority: "HIGH"
    tags:
      - "Main"
      - "Execution"
    content: "The main execution logic of the script that handles command line arguments and calls the appropriate functions.

$main_content_escaped"
EOF
  fi
  
  echo "Script documentation generated: MANAGE_DOC_SCRIPT.yml"
}

# Main script execution
check_dependencies

if [ $# -lt 1 ]; then
  print_usage
  exit 1
fi

command="$1"
shift

case "$command" in
  generate)
    generate_docs
    ;;
  generate-md)
    generate_md
    ;;
  delete-block)
    ensure_session_active
    if [ $# -ne 2 ]; then
      echo "Error: delete-block requires a file and section title."
      print_usage
      exit 1
    fi
    delete_block "$1" "$2"
    ;;
  delete-file)
    ensure_session_active
    if [ $# -ne 1 ]; then
      echo "Error: delete-file requires a file."
      print_usage
      exit 1
    fi
    delete_file "$1"
    ;;
  update-doc)
    ensure_session_active
    if [ $# -lt 2 ] || [ $# -gt 3 ]; then
      echo "Error: update-doc requires a file, section title, and optionally a content file."
      echo "Usage: $0 update-doc <file> <section-title> [content-file]"
      exit 1
    fi
    if [ $# -eq 3 ]; then
      update_doc "$1" "$2" "$3"
    else
      update_doc "$1" "$2"
    fi
    ;;
  set-priority)
    ensure_session_active
    if [ $# -ne 3 ]; then
      echo "Error: set-priority requires a file, section title, and priority."
      print_usage
      exit 1
    fi
    set_priority "$1" "$2" "$3"
    ;;
  set-category)
    ensure_session_active
    if [ $# -ne 3 ]; then
      echo "Error: set-category requires a file, section title, and category."
      print_usage
      exit 1
    fi
    set_category "$1" "$2" "$3"
    ;;
  start-session)
    start_session
    ;;
  reset-session)
    reset_session
    ;;
  close-session)
    close_session
    ;;
  list-sections)
    if [ $# -ne 1 ]; then
      echo "Error: list-sections requires a file."
      echo "Usage: $0 list-sections <file>"
      exit 1
    fi
    list_sections "$1"
    ;;
  list-commands)
    list_commands
    ;;
  view)
    if [ $# -ne 1 ]; then
      echo "Error: view requires a file."
      echo "Usage: $0 view <filename.md>"
      exit 1
    fi
    view_markdown "$1"
    ;;
  search)
    if [ $# -ne 1 ]; then
      echo "Error: search requires a query."
      echo "Usage: $0 search <query>"
      exit 1
    fi
    search_markdown "$1"
    ;;
  view-section)
    if [ $# -ne 2 ]; then
      echo "Error: view-section requires a file and section title."
      echo "Usage: $0 view-section <filename.md> <section-title>"
      exit 1
    fi
    view_section "$1" "$2"
    ;;
  ranking)
    show_ranking
    ;;
  generate-summary)
    generate_summary
    ;;
  extract-glossary)
    extract_glossary
    ;;
  show-structure)
    show_structure
    ;;
  export-context)
    if [ $# -ne 1 ]; then
      echo "Error: export-context requires a context keyword."
      echo "Usage: $0 export-context <context>"
      exit 1
    fi
    export_context "$1"
    ;;
  document-script)
    document_script
    ;;
  *)
    echo "Error: Unknown command '$command'."
    print_usage
    exit 1
    ;;
esac
