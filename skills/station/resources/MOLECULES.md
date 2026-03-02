# Molecules in Station v1

Station v1 does not include molecule/template commands.

Practical replacement:
- Keep reusable issue templates in markdown snippets
- Use small shell wrappers around `station create`
- Standardize labels and acceptance text conventions

Example shell helper:

```bash
station create --title "$1" --type task --priority 2 --acceptance "Done means tests updated and passing"
```
