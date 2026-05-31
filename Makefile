SHELL := /bin/bash

.PHONY: help serve build new-post compress-image clean blossom-solve blossom-remove-word

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

clean: ## Remove generated files
	rm -rf public/ resources/

blossom-solve: ## Print today's Blossom answer (or pass date=YYYY-MM-DD)
	@node scripts/blossom-solve.js $(date)

blossom-remove-word: ## Pull word(s) from the Blossom banks + rebuild (usage: make blossom-remove-word word="foo bar")
	@if [ -z "$(word)" ]; then echo 'Usage: make blossom-remove-word word="foo bar"'; exit 1; fi
	@node scripts/blossom-remove-word.js $(word)
