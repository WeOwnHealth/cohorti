export function Footer() {
  return (
    <footer id="roadmap" className="bg-white py-16">
      <div className="mx-auto w-full max-w-6xl px-6">
        <div className="flex flex-col items-start justify-between gap-8 border-t border-gray-200 pt-10 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold text-gray-900">Passport</p>
            <p className="mt-1 max-w-sm text-sm text-gray-500">
              WeOwnHealth&apos;s submission to the Midnight Network Buildathon (Sep 2026). Working
              name — this README reflects the current product spec.
            </p>
          </div>
          <div className="flex gap-6 text-sm font-medium text-gray-600">
            <a href="https://github.com/WeOwnHealth/passport" target="_blank" rel="noreferrer" className="hover:text-gray-900">
              GitHub
            </a>
            <a href="https://github.com/WeOwnHealth/passport#roadmap-midnight-network-buildathon" target="_blank" rel="noreferrer" className="hover:text-gray-900">
              Roadmap
            </a>
            <a href="https://github.com/WeOwnHealth/passport#readme" target="_blank" rel="noreferrer" className="hover:text-gray-900">
              Full spec
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
