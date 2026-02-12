import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";

const ThemeToggle = () => {
  const { mode, toggleMode } = useTheme();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleMode}
      className="min-h-[44px] min-w-[44px] w-9 h-9 sm:w-9 sm:h-9 px-0 hover:bg-accent hover:text-accent-foreground transition-colors"
      title={mode === 'dark' ? 'Light moda geç' : 'Dark moda geç'}
    >
      {mode === 'dark' ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
      <span className="sr-only">Toggle theme mode</span>
    </Button>
  );
};

export default ThemeToggle;
