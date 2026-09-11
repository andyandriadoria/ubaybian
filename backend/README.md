# UbayBian API

Cloudflare Worker backend for UbayBian.

This folder contains the Worker source, D1 migration, tests, and deployment configuration used by Cloudflare Builds. The production Worker is expected to deploy from the `main` branch with this folder configured as the build root.

Runtime secrets and Google service account credentials must be configured in Cloudflare and must never be committed to this repository.
