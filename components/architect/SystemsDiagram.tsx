"use client";

import { Fragment } from "react";
import { motion } from "framer-motion";

const FLOW = [
  { key: "harvest", title: "DATA HARVEST", detail: "Overpass" },
  { key: "intel", title: "INTEL", detail: "Groq" },
  { key: "ledger", title: "LEDGER", detail: "Neon" },
  { key: "edge", title: "EDGE", detail: "AuraMesh PWA" },
  { key: "mesh", title: "MESH", detail: "WebRTC P2P" },
] as const;

export function SystemsDiagram() {
  return (
    <section className="relative overflow-hidden border border-white/10 bg-black/40 p-5 sm:p-7">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-lime-400/70 shadow-[0_0_18px_2px_rgba(163,230,53,0.35)]" />
      <div className="pointer-events-none absolute inset-0 opacity-20 [background:linear-gradient(to_bottom,transparent_0%,rgba(132,204,22,0.12)_48%,transparent_100%)]" />

      <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-lime-400">
        Systems Diagram
      </p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
        Sovereign Intelligence Pipeline
      </h2>

      {/* Avoid display:contents around motion nodes — breaks Framer layout/projection in some browsers */}
      <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-stretch">
        {FLOW.map((node, idx) => (
          <Fragment key={node.key}>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.35, delay: idx * 0.08 }}
              className="relative min-w-0 flex-1 border border-white/15 bg-[#070707] p-4"
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">
                Node {String(idx + 1).padStart(2, "0")}
              </p>
              <p className="mt-2 text-sm font-semibold text-white">{node.title}</p>
              <p className="mt-1 font-mono text-xs text-lime-300">{node.detail}</p>
            </motion.div>

            {idx < FLOW.length - 1 ? (
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 + idx * 0.08 }}
                className="hidden shrink-0 items-center self-center lg:flex lg:w-8"
                aria-hidden
              >
                <div className="h-px w-full bg-lime-400/70" />
              </motion.div>
            ) : null}
          </Fragment>
        ))}
      </div>
    </section>
  );
}
