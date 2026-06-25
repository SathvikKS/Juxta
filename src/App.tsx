import { TooltipProvider } from "@/components/ui/tooltip"
import DiffChecker from "@/components/DiffChecker"

export function App() {
  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
        <main className="py-6">
          <DiffChecker />
        </main>
      </div>
    </TooltipProvider>
  )
}

export default App
