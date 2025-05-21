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
  local section_count=$(jq --arg title "$section_title" '.sections[] | select(.title == $title) | length' "$file")
  
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
      summary=$(jq -r '.summary' "$file")
      echo "- $filename: $summary"
    fi
  done
  
  echo "YAML documentation generation complete."
}

# Generate Markdown files from YAML docs
generate_md() {
  echo "Generating Markdown files from YAML docs..."
  
  # Create doc_md directory if it doesn't exist
  mkdir -p doc_md
  
  for yaml_file in doc/*.yml; do
    if [ -f "$yaml_file" ]; then
      filename=$(basename "$yaml_file")
      base_name="${filename%.yml}"
      md_file="doc_md/${base_name}.md"
      
      # Extract values from YAML file using jq
      file_name=$(jq -r '.file_name // "$base_name"' "$yaml_file")
      relative_path=$(jq -r '.relative_path // ""' "$yaml_file")
      priority=$(jq -r '.priority // ""' "$yaml_file")
      tags=$(jq -r '.tags | map(.) | join(", ")' "$yaml_file")
      summary=$(jq -r '.summary // ""' "$yaml_file")
      
      # Start the markdown file with header
      {
        echo "# ${base_name}"
        echo "**Path:** ${relative_path}"
        echo "**Priority:** ${priority}"
        echo "**Tags:** ${tags}"
        echo "**Summary:** ${summary}"
        echo ""
        echo "## Sections"
        echo ""
        
        # Process each section
        jq -c '.sections[]' "$yaml_file" | while read -r section; do
          section_title=$(echo "$section" | jq -r '.title')
          section_priority=$(echo "$section" | jq -r '.priority')
          section_tags=$(echo "$section" | jq -r '.tags | map(.) | join(", ")')
          section_content=$(echo "$section" | jq -r '.content')
          
          echo "### ${section_title}"
          echo "**Priority:** ${section_priority}"
          echo "**Tags:** ${section_tags}"
          echo ""
          echo "${section_content}"
          echo ""
        done
      } > "$md_file"
      
      echo "Generated: $filename -> doc_md/${base_name}.md"
    fi
  done
  
  echo "
List of created Markdown files:"
  for md_file in doc_md/*.md; do
    if [ -f "$md_file" ]; then
      echo "- $(basename "$md_file")"
    fi
  done
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
  
  validate_file "$file"
  validate_section "$file" "$section_title"
  
  echo "About to update the following section in $file:"
  jq --arg title "$section_title" '.sections[] | select(.title == $title)' "$file"
  
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
  
  echo "\nReview the new content:"
  echo "$content"
  
  get_confirmation
  
  # Update the section content and save
  jq --arg title "$section_title" --arg content "$content" '.sections = [.sections[] | if .title == $title then .content = $content else . end]' "$file" > "${file}.tmp" && mv "${file}.tmp" "$file"
  
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
    if [ $# -ne 2 ]; then
      echo "Error: update-doc requires a file and section title."
      print_usage
      exit 1
    fi
    update_doc "$1" "$2"
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
  *)
    echo "Error: Unknown command '$command'."
    print_usage
    exit 1
    ;;
esac
