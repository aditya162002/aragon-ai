import { UI } from '../constants';

/** Top bar with the product wordmark. */
export function AppHeader() {
  return (
    <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-2.5 px-4 sm:px-6 lg:px-8">
        <img src={UI.LOGO_SRC} alt="" className="size-8" />
        <span className="text-lg font-semibold tracking-tight text-slate-900">
          Aragon<span className="text-brand-600">.ai</span>
        </span>
      </div>
    </header>
  );
}
