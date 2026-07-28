export default function RootLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  )
}
