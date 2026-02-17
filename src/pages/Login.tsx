import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate("/dashboard");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md rounded-2xl bg-card p-8 shadow-lg">
        <div className="mb-6 flex flex-col items-center gap-3">
          <span className="peps-badge text-base">PEPS</span>
          <h1 className="text-2xl font-bold text-card-foreground">Mattress Costing System</h1>
          <p className="text-sm text-muted-foreground">Sign in to access the dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="font-semibold text-card-foreground">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="font-semibold text-card-foreground">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox id="remember" />
              <Label htmlFor="remember" className="text-sm text-card-foreground">Remember me</Label>
            </div>
            <button type="button" className="text-sm font-medium text-primary hover:underline">
              Forgot password?
            </button>
          </div>

          <Button type="submit" className="w-full text-base font-semibold" size="lg">
            Sign In
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <button className="font-medium text-primary hover:underline">Contact Administrator</button>
        </p>

        <div className="mt-4 border-t border-border pt-4">
          <p className="text-center text-xs text-muted-foreground">Demo credentials: any email and password</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
