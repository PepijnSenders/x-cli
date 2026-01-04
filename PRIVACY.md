# Privacy Policy for Browse Extension

**Last updated:** January 2025

## Overview

The Browse extension ("Browse") is a companion extension for the browse-cli tool. It enables scraping webpage content to markdown using your browser session.

## Data Collection

**Browse does not collect, store, or transmit any personal data to external servers.**

### What the extension accesses:

- **Page content**: When you run a scrape command via the CLI, the extension reads the HTML content of your active browser tab
- **Page metadata**: URL and title of the current page

### Where data goes:

- All data stays **100% local** on your machine
- Page content is sent only to the **local WebSocket daemon** (localhost:9222) running on your computer
- The daemon processes the content and returns markdown to your terminal
- **No data is ever sent to any remote server**

## Permissions Explained

| Permission | Why it's needed |
|------------|-----------------|
| `activeTab` | Read content from the tab you're scraping |
| `scripting` | Execute scripts to extract page content |
| `alarms` | Keep the extension connection alive |
| `storage` | Remember connection state across browser restarts |

## Third Parties

Browse has **no third-party integrations**. No analytics, no tracking, no external services.

## Open Source

Browse is fully open source. You can audit the code at:
https://github.com/PepijnSenders/browse-cli

## Contact

For privacy concerns or questions:
- GitHub Issues: https://github.com/PepijnSenders/browse-cli/issues

## Changes

Any changes to this policy will be reflected in the "Last updated" date above.
