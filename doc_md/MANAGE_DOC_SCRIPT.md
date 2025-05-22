# MANAGE_DOC_SCRIPT
**Path:** 
**Priority:** HIGH
**Tags:** 
**Summary:** 

## Sections

### print_usage
**Priority:** HIGH
**Tags:** Auto-extracted

Print usage information

Print usage information

Function signature:
print_usage() {

Usage:
No direct usage examples found in script.

### check_dependencies
**Priority:** HIGH
**Tags:** Auto-extracted

Check if jq and grep are installed

Check if jq and grep are installed

Function signature:
check_dependencies() {

Usage:
No direct usage examples found in script.

### validate_file
**Priority:** HIGH
**Tags:** Auto-extracted

Validate file exists

Validate file exists

Function signature:
validate_file() {

Usage:
Example: 259:   validate_file \

### validate_section
**Priority:** HIGH
**Tags:** Auto-extracted

Validate section exists

Validate section exists

Function signature:
validate_section() {

Usage:
Example: 260:   validate_section \

### get_confirmation
**Priority:** HIGH
**Tags:** Auto-extracted

Get confirmation from user

Get confirmation from user

Function signature:
get_confirmation() {

Usage:
No direct usage examples found in script.

### generate_docs
**Priority:** HIGH
**Tags:** Auto-extracted

Generate all YAML docs from Markdown files

Generate all YAML docs from Markdown files

Function signature:
generate_docs() {

Usage:
No direct usage examples found in script.

### generate_md
**Priority:** HIGH
**Tags:** Auto-extracted

Generate Markdown files from YAML docs

Generate Markdown files from YAML docs

Function signature:
generate_md() {

Usage:
No direct usage examples found in script.

### delete_block
**Priority:** HIGH
**Tags:** Auto-extracted

Delete a section from a YAML doc

Delete a section from a YAML doc

Function signature:
delete_block() {

Usage:
Example: 1123:     delete_block 

### delete_file
**Priority:** HIGH
**Tags:** Auto-extracted

Delete a YAML doc file

Delete a YAML doc file

Function signature:
delete_file() {

Usage:
Example: 1132:     delete_file 

### update_doc
**Priority:** HIGH
**Tags:** Auto-extracted

Update a section in a YAML doc

Update a section in a YAML doc

Function signature:
update_doc() {

Usage:
Example: 1142:       update_doc 

### set_priority
**Priority:** HIGH
**Tags:** Auto-extracted

Set priority for a section

Set priority for a section

Function signature:
set_priority() {

Usage:
Example: 1154:     set_priority 

### set_category
**Priority:** HIGH
**Tags:** Auto-extracted

Set category for a section

Set category for a section

Function signature:
set_category() {

Usage:
Example: 1163:     set_category 

### is_session_active
**Priority:** HIGH
**Tags:** Auto-extracted

Check if a session is active

Check if a session is active

Function signature:
is_session_active() {

Usage:
No direct usage examples found in script.

### ensure_session_active
**Priority:** HIGH
**Tags:** Auto-extracted

Ensure session is active before destructive actions

Ensure session is active before destructive actions

Function signature:
ensure_session_active() {

Usage:
No direct usage examples found in script.

### start_session
**Priority:** HIGH
**Tags:** Auto-extracted

Start a session for tracking document changes

Start a session for tracking document changes

Function signature:
start_session() {

Usage:
No direct usage examples found in script.

### reset_session
**Priority:** HIGH
**Tags:** Auto-extracted

Reset session by restoring from backup

Reset session by restoring from backup

Function signature:
reset_session() {

Usage:
No direct usage examples found in script.

### close_session
**Priority:** HIGH
**Tags:** Auto-extracted

Close the session and delete backup

Close the session and delete backup

Function signature:
close_session() {

Usage:
No direct usage examples found in script.

### list_sections
**Priority:** HIGH
**Tags:** Auto-extracted

List sections in a YAML doc

List sections in a YAML doc

Function signature:
list_sections() {

Usage:
Example: 1180:     list_sections 

### list_commands
**Priority:** HIGH
**Tags:** Auto-extracted

List available helper commands

List available helper commands

Function signature:
list_commands() {

Usage:
No direct usage examples found in script.

### initialize_search_stats
**Priority:** HIGH
**Tags:** Auto-extracted

Initialize the search stats file if it doesn

### view_markdown
**Priority:** HIGH
**Tags:** Auto-extracted

View a markdown file

View a markdown file

Function signature:
view_markdown() {

Usage:
Example: 1191:     view_markdown 

### increment_counter
**Priority:** HIGH
**Tags:** Auto-extracted

Increment the search or view counter for a section

Increment the search or view counter for a section

Function signature:
increment_counter() {

Usage:
Example: 582:           increment_counter 

### search_markdown
**Priority:** HIGH
**Tags:** Auto-extracted

Search for text in all markdown files

Search for text in all markdown files

Function signature:
search_markdown() {

Usage:
Example: 1199:     search_markdown 

### view_section
**Priority:** HIGH
**Tags:** Auto-extracted

View a specific section of a markdown file

View a specific section of a markdown file

Function signature:
view_section() {

Usage:
Example: 1207:     view_section 

### show_ranking
**Priority:** HIGH
**Tags:** Auto-extracted

Show the ranking of most viewed sections

Show the ranking of most viewed sections

Function signature:
show_ranking() {

Usage:
No direct usage examples found in script.

### generate_summary
**Priority:** HIGH
**Tags:** Auto-extracted

Generate a global summary of the project

Generate a global summary of the project

Function signature:
generate_summary() {

Usage:
No direct usage examples found in script.

### extract_glossary
**Priority:** HIGH
**Tags:** Auto-extracted

Generate a glossary of technical terms

Generate a glossary of technical terms

Function signature:
extract_glossary() {

Usage:
No direct usage examples found in script.

### show_structure
**Priority:** HIGH
**Tags:** Auto-extracted

Generate a hierarchical view of project structure

Generate a hierarchical view of project structure

Function signature:
show_structure() {

Usage:
No direct usage examples found in script.

### export_context
**Priority:** HIGH
**Tags:** Auto-extracted

Export sections by context

Export sections by context

Function signature:
export_context() {

Usage:
Example: 1227:     export_context 

### document_script
**Priority:** HIGH
**Tags:** Auto-extracted

Document the script itself

Document the script itself

Function signature:
document_script() {

Usage:
No direct usage examples found in script.

### Main Script Execution
**Priority:** HIGH
**Tags:** Auto-extracted

The main execution logic of the script that handles command line arguments and calls the appropriate functions.

# Main script execution
check_dependencies

if [ $# -lt 1 ]; then
  print_usage
  exit 1
fi

command=

