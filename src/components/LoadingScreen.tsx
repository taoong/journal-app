export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 border-4 border-zinc-200 rounded-full" />
          <div className="absolute inset-0 border-4 border-transparent border-t-zinc-800 rounded-full animate-spin" />
        </div>
        <p className="text-zinc-400 text-sm font-medium animate-pulse">Loading...</p>
      </div>
    </div>
  )
}
