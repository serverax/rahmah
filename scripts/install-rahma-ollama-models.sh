#!/usr/bin/env sh
set -eu

# classification
ollama pull qwen2.5:1.5b
# answer drafting
ollama pull llama3.2:3b
# review / escalation
ollama pull phi3.5:3.8b
# coding helper only
ollama pull qwen2.5-coder:1.5b