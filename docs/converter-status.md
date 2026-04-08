# Converter status

Implemented and covered with Playwright:
- `PDF -> JPG`
- `JPG -> PNG`
- `PNG -> WEBP`
- `JPG -> PDF`

Implemented in the browser converter but not all covered as primary happy paths:
- `PDF -> PNG`
- `PNG -> JPG`
- `PNG -> PDF`
- `WEBP -> JPG`
- `WEBP -> PNG`
- `WEBP -> PDF`
- `JPG -> WEBP`

Visible in UI but intentionally disabled / coming soon:
- Document conversions involving `DOCX`, `TXT`, or `PPTX`
- Audio conversions involving `MP3`, `WAV`, or `M4A`
- Video conversions involving `MP4`, `MOV`, or `Extract Audio`
- Batch conversion

What was tested:
- Workspace smoke render
- FROM/TO option behavior and swap
- File upload readiness
- Successful conversion and download flows
- Basic plan size limit
- Basic daily quota messaging
- Pro plan larger file allowance
- Unsupported file rejection
- Disabled conversion path handling
- Forced conversion failure handling
- Empty submission handling

Known gaps:
- Media conversion backend is not wired yet
- Real authenticated quota persistence is not committed server-side by the current converter page flow
- The current implementation focuses on deterministic browser-safe conversions instead of server processing
