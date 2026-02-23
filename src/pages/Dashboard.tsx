import { Settings, ClipboardList, LayoutGrid } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/PageHeader";
import { useAuth } from "@/contexts/AuthContext";

const cards = [
  {
    icon: ClipboardList,
    iconBg: "bg-success/10 text-success",
    title: "Configuration & BOM",
    description: "Configure mattress specs, edit materials, quantities & rates",
    link: "/configuration",
    linkText: "Start Here →",
  },
  {
    icon: LayoutGrid,
    iconBg: "bg-purple-100 text-purple-600",
    title: "View Results",
    description: "View detailed costing output and export data",
    link: "/results",
    linkText: "View Results →",
  },
];

const steps = [
  { num: 1, title: "Configuration & BOM", desc: "Configure mattress type, size, and edit all material quantities, rates & specs", color: "bg-success" },
  { num: 2, title: "View Results", desc: "See detailed cost breakdown and export reports", color: "bg-purple-500" },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Mattress Costing System - Dashboard" showLogout onLogout={handleLogout} />

      <main className="mx-auto max-w-6xl p-6">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground">Welcome to PEPS Mattress Costing System</h2>
          <p className="mt-1 text-muted-foreground">Select an option below to start your costing calculation</p>
        </div>

        <div className="mb-8 grid gap-6 md:grid-cols-3">
          {cards.map((card) => (
            <button
              key={card.title}
              onClick={() => navigate(card.link)}
              className="group rounded-xl border border-border bg-card p-6 text-left shadow-sm transition-all hover:shadow-md hover:border-primary/30"
            >
              <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full ${card.iconBg}`}>
                <card.icon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg font-bold text-card-foreground">{card.title}</h3>
              <p className="mb-4 text-sm text-muted-foreground">{card.description}</p>
              <span className="text-sm font-semibold text-primary group-hover:underline">{card.linkText}</span>
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-bold text-card-foreground">Quick Start Guide</h3>
          <div className="space-y-4">
            {steps.map((step) => (
              <div key={step.num} className="flex items-start gap-4">
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${step.color} text-sm font-bold text-primary-foreground`}>
                  {step.num}
                </span>
                <div>
                  <p className="font-semibold text-card-foreground">{step.title}</p>
                  <p className="text-sm text-muted-foreground">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
