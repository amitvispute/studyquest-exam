import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

function safeNext(raw: string | null): string {
  if (!raw) return "/";
  try {
    const decoded = decodeURIComponent(raw);
    if (decoded.startsWith("/") && !decoded.startsWith("//")) return decoded;
  } catch {}
  return "/";
}
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { GraduationCap, Users } from "lucide-react";

// Sign-up is temporarily disabled; new accounts are created from the Lovable backend UI instead.
// Flip this back to true to re-enable public self-registration.
const SIGNUP_ENABLED = false;

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextPath = safeNext(searchParams.get("next"));
  const [loading, setLoading] = useState(false);

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Signup state
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [selectedRole, setSelectedRole] = useState<"parent" | "student">("student");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Welcome back! 🎓");
      if (nextPath.startsWith("/.lovable/oauth/consent")) {
        window.location.href = nextPath;
      } else {
        navigate(nextPath);
      }
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!SIGNUP_ENABLED) return;
    if (!displayName.trim()) {
      toast.error("Please enter a display name");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: signupEmail,
      password: signupPassword,
      options: {
        emailRedirectTo: window.location.origin + nextPath,
        data: {
          display_name: displayName,
          role: selectedRole,
        },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Account created! Please check your email to verify your account. 📧");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-foreground">🎓 StudyQuest</h1>
          <p className="text-muted-foreground text-sm mt-1">Grammar School Exam Tracker & AI Mentor</p>
        </div>

        <Card className="shadow-card">
          <Tabs defaultValue="login">
            <CardHeader className="pb-2">
              <TabsList className={`grid w-full ${SIGNUP_ENABLED ? "grid-cols-2" : "grid-cols-1"}`}>
                <TabsTrigger value="login">Log In</TabsTrigger>
                {SIGNUP_ENABLED && <TabsTrigger value="signup">Sign Up</TabsTrigger>}
              </TabsList>
            </CardHeader>

            <TabsContent value="login">
              <form onSubmit={handleLogin}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="you@example.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Logging in..." : "Log In"}
                  </Button>
                  {!SIGNUP_ENABLED && (
                    <p className="text-xs text-muted-foreground text-center">
                      New accounts are set up by the family admin.
                    </p>
                  )}
                </CardContent>
              </form>
            </TabsContent>

            {SIGNUP_ENABLED && (
              <TabsContent value="signup">
                <form onSubmit={handleSignup}>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name">Display Name</Label>
                      <Input
                        id="signup-name"
                        placeholder="e.g. Pareet or Mum/Dad"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="you@example.com"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="Min 6 characters"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>I am a...</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setSelectedRole("parent")}
                          className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                            selectedRole === "parent"
                              ? "border-primary bg-primary/5 shadow-card"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <Users className="h-8 w-8 text-primary" />
                          <span className="font-semibold text-sm text-foreground">Parent</span>
                          <span className="text-xs text-muted-foreground">Manage schedules</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedRole("student")}
                          className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                            selectedRole === "student"
                              ? "border-primary bg-primary/5 shadow-card"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <GraduationCap className="h-8 w-8 text-primary" />
                          <span className="font-semibold text-sm text-foreground">Student</span>
                          <span className="text-xs text-muted-foreground">Log practice</span>
                        </button>
                      </div>
                    </div>

                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Creating account..." : "Sign Up"}
                    </Button>
                  </CardContent>
                </form>
              </TabsContent>
            )}
          </Tabs>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
