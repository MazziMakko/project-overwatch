\# PROJECT OVERWATCH: TECHNOLOGY STACK

\#\# 1\. Core Framework & Routing  
\* \*\*Framework:\*\* Next.js 16 (App Router strictly enforced)  
\* \*\*Language:\*\* TypeScript (Strict mode enabled)  
\* \*\*Styling:\*\* Tailwind CSS \+ UI components (shadcn/ui or Radix primitives)  
\* \*\*Animation:\*\* Framer Motion (for tactical UI overlays)

\#\# 2\. State Management & Offline Capability  
\* \*\*Global State:\*\* Zustand  
\* \*\*Local Persistence:\*\* Zustand \`persist\` middleware (IndexedDB/localStorage)

\#\# 3\. Database & Backend Architecture  
\* \*\*Database:\*\* PostgreSQL (Hosted via Neon.tech or Supabase)  
\* \*\*ORM:\*\* Prisma  
\* \*\*API Layer:\*\* Next.js Server Actions (No legacy \`/pages/api\` routes)  
\* \*\*Validation:\*\* Zod (for strict type-checking on all payloads)

\#\# 4\. Geospatial & Intelligence APIs  
\* \*\*Mapping Engine:\*\* Mapbox GL JS (via \`react-map-gl\`)  
\* \*\*Lead Generation:\*\* Google Places API  
\* \*\*AI Processing:\*\* Vercel AI SDK (OpenAI/Anthropic wrappers)

\#\# 5\. Future Phases (Pre-approved libraries)  
\* \*\*WebRTC/Mesh:\*\* PeerJS or simple WebRTC APIs (for Sovereign Mesh)  
\* \*\*Video/Streaming:\*\* Mux or standard HTML5 Video (for Resonance Vault)  
