"""HTTP API layer for VeillIA's interactive features (currently: Article AI Chat).

Separate from the batch pipelines (main.py, classify_main.py, etc.), which
are one-shot scripts -- this package runs as a long-lived server process,
since a chat needs to respond to live user requests.
"""
