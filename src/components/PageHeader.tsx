import { ArrowLeft, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PageHeaderProps {
  title: string;
  showBack?: boolean;
  showLogout?: boolean;
  onLogout?: () => void;
}

const PageHeader = ({ title, showBack = true, showLogout = false, onLogout }: PageHeaderProps) => {
  const navigate = useNavigate();

  return (
    <header className="flex items-center justify-between border-b border-border bg-card px-6 py-3">
      <div className="flex items-center gap-3">
        {showBack && (
          <button onClick={() => navigate(-1)} className="text-foreground hover:text-primary transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <span className="peps-badge">PEPS</span>
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      </div>
      {showLogout && (
        <button
          onClick={onLogout || (() => navigate("/"))}
          className="flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      )}
    </header>
  );
};

export default PageHeader;
