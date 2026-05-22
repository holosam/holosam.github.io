SHELL := /bin/bash

.PHONY: serve build new-post compress-image compress-all clean help blossom-words blossom-words-build blossom-words-fetch

# Default target
help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

serve: ## Start local dev server with drafts enabled
	hugo server -D

build: ## Build site with production settings
	hugo --gc --minify

new-post: ## Create a new post (usage: make new-post name=my-post-slug)
	@if [ -z "$(name)" ]; then echo "Usage: make new-post name=my-post-slug"; exit 1; fi
	hugo new posts/$(name).md
	@echo "Created content/posts/$(name).md"

compress-image: ## Compress a single image to WebP (usage: make compress-image src=path/to/image.png)
	@if [ -z "$(src)" ]; then echo "Usage: make compress-image src=path/to/image.png"; exit 1; fi
	@command -v cwebp >/dev/null 2>&1 || { echo "cwebp not found. Install with: brew install webp"; exit 1; }
	cwebp -q 80 "$(src)" -o "$$(echo "$(src)" | sed 's/\.[^.]*$$/.webp/')"

compress-all: ## Compress all PNG/JPG images in static/images/ to WebP
	@command -v cwebp >/dev/null 2>&1 || { echo "cwebp not found. Install with: brew install webp"; exit 1; }
	@shopt -s nullglob; for f in static/images/*.png static/images/*.jpg static/images/*.jpeg; do \
		out="$${f%.*}.webp"; \
		echo "Converting $$f -> $$out"; \
		cwebp -q 80 "$$f" -o "$$out"; \
	done

clean: ## Remove generated files
	rm -rf public/ resources/

blossom-solve: ## Print today's Blossom answer (or pass date=YYYY-MM-DD)
	@node scripts/blossom-solve.js $(date)

blossom-words-fetch: ## Download SCOWL size-60 word list to assets/blossom/
	@mkdir -p assets/blossom
	curl -sL "http://app.aspell.net/create?max_size=60&spelling=US&max_variant=0&diacritic=both&special=hacker&special=roman-numerals&download=wordlist&encoding=utf-8&format=inline" \
		-o assets/blossom/scowl-60.txt
	@echo "Wrote assets/blossom/scowl-60.txt ($$(wc -l < assets/blossom/scowl-60.txt) lines)"
