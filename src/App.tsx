import { TooltipProvider } from "@/components/ui/tooltip"
import DiffChecker from "@/components/DiffChecker"

export function App() {
  return (
    <TooltipProvider>
      <div className="h-screen w-screen bg-background text-foreground transition-colors duration-200 overflow-hidden flex flex-col">
        <main className="flex-1 min-h-0 py-4 md:py-6">
          <DiffChecker />
        </main>
      </div>
    </TooltipProvider>
  )
}

export default App
