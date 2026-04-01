"use client";

function handleReload() {
  window.location.reload();
}

export default function Offline() {
  return (
    <div className="bg-background text-foreground min-h-dvh">
      <main>
        <div className="container mx-auto flex min-h-dvh flex-col items-center justify-center gap-6 px-4 py-16 text-center sm:px-6 lg:px-8">
          <div className="animate-fade-in-up flex flex-col gap-2 [animation-delay:0ms]">
            <h1 className="text-2xl font-bold">You&apos;re offline</h1>
            <p className="text-foreground/60 text-sm">
              Check your internet connection and try again.
            </p>
          </div>
          <div className="animate-fade-in-up [animation-delay:100ms]">
            <button
              className="bg-foreground text-background focus-visible:outline-foreground inline-flex min-h-11 min-w-11 items-center justify-center rounded-md px-5 py-3 text-sm font-bold transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-95"
              onClick={handleReload}
              type="button"
            >
              Reload page
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
