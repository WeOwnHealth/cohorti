export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-midnight-surface/60">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-6 py-6 text-sm text-gray-400">
        <div className="flex items-center gap-2">
          <span className="font-mono text-midnight-accent">{"<>"}</span>
          <span>Health Markers Passport — Midnight Network Buildathon</span>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
          <span>Powered by Midnight Network</span>
          <span aria-hidden="true">·</span>
          <span>Built by WeOwnHealth</span>
          <span aria-hidden="true">·</span>
          <a
            href="https://github.com/WeOwnHealth/trials"
            target="_blank"
            rel="noreferrer"
            className="underline decoration-dotted hover:text-gray-300"
          >
            WeOwnHealth/trials on GitHub
          </a>
          <span aria-hidden="true">·</span>
          <span>© {year}</span>
        </div>
      </div>
    </footer>
  );
}
