import { TooltipProvider } from "@/components/ui/tooltip"
import DiffChecker from "@/components/DiffChecker"

export function App() {
  return (
    <TooltipProvider>
      <div className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground transition-colors duration-200">
        <main className="min-h-0 flex-1 py-4 md:py-6">
          <DiffChecker />
        </main>
      </div>
    </TooltipProvider>
  )
}

export default App
