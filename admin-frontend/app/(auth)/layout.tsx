export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dark min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 p-4 relative overflow-hidden">
      {/* Grid lines */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />
      {/* Mobile: green glow top center */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full bg-green-500/30 blur-[150px] animate-pulse-glow pointer-events-none md:hidden" />
      {/* Mobile: purple glow left */}
      <div className="absolute top-1/3 -left-32 w-[350px] h-[350px] rounded-full bg-purple-600/25 blur-[150px] animate-pulse-glow pointer-events-none md:hidden" style={{ animationDelay: "1.5s" }} />
      {/* Mobile: purple glow bottom right */}
      <div className="absolute -bottom-32 -right-20 w-[300px] h-[300px] rounded-full bg-purple-500/20 blur-[120px] animate-pulse-glow pointer-events-none md:hidden" style={{ animationDelay: "3s" }} />

      {/* Desktop: purple glow top left */}
      <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-purple-600/25 blur-[150px] animate-pulse-glow pointer-events-none hidden md:block" />
      {/* Desktop: green glow bottom right */}
      <div className="absolute -bottom-48 -right-48 w-[500px] h-[500px] rounded-full bg-green-500/20 blur-[180px] animate-pulse-glow pointer-events-none hidden md:block" style={{ animationDelay: "2s" }} />
      {/* Desktop: subtle purple bottom left */}
      <div className="absolute bottom-1/4 -left-20 w-[300px] h-[300px] rounded-full bg-purple-500/10 blur-[120px] animate-pulse-glow pointer-events-none hidden md:block" style={{ animationDelay: "1s" }} />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/logo-sav.png" alt="Sistema Automático de Vendas" className="mx-auto w-full max-w-md object-contain" />
        </div>

        {/* Card */}
        {children}
      </div>
    </div>
  );
}
