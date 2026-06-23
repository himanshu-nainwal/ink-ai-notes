import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import { BookOpen } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in · SmartPDF Workspace" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/library" });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s) navigate({ to: "/library" });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const signIn = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) toast.error(error.message);
  };

  const signUp = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: window.location.origin + "/library" },
    });
    setLoading(false);
    if (error) toast.error(error.message);
    else toast.success("Account created. Check your inbox if confirmation is required.");
  };

  const google = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/auth" },
    });
    setLoading(false);
    if (error) toast.error(error.message ?? "Google sign-in failed");
  };

  const sendOtp = async () => {
    if (!email) {
      toast.error("Please enter your email first.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin + "/library",
        shouldCreateUser: true,
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("OTP sent to your email!");
      setOtpSent(true);
    }
  };

  const verifyOtp = async () => {
    if (otpCode.length < 6) {
      toast.error("Please enter a valid 6-digit OTP.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otpCode,
      type: "email",
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Successfully signed in!");
      navigate({ to: "/library" });
    }
  };

  return (
    <div className="min-h-screen bg-background grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between bg-secondary p-12">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground">
            <BookOpen className="h-4 w-4" />
          </div>
          <span className="font-serif text-xl">SmartPDF</span>
        </Link>
        <div>
          <p className="font-serif text-4xl leading-tight">
            "A book is a dream that you hold in your hand."
          </p>
          <p className="mt-3 text-sm text-muted-foreground">— Neil Gaiman</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">© SmartPDF Workspace</p>
          <p className="text-xs text-muted-foreground mt-1">Made by Himanshu Nainwal</p>
        </div>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <h1 className="font-serif text-3xl">Welcome back</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to your reading workspace.</p>

          <Button variant="outline" className="mt-6 w-full" onClick={google} disabled={loading}>
            Continue with Google
          </Button>

          <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
          </div>

          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="otp">Email OTP</TabsTrigger>
              <TabsTrigger value="signup">Register</TabsTrigger>
            </TabsList>
            <TabsContent value="signin" className="space-y-3 pt-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pw">Password</Label>
                <Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button className="w-full" onClick={signIn} disabled={loading}>Sign in</Button>
            </TabsContent>
            <TabsContent value="otp" className="space-y-3 pt-4">
              {!otpSent ? (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="otp-email">Email</Label>
                    <Input id="otp-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
                  </div>
                  <Button className="w-full" onClick={sendOtp} disabled={loading}>Send OTP</Button>
                </>
              ) : (
                <>
                  <div className="space-y-2 flex flex-col items-center">
                    <Label className="self-start">Enter 6-digit OTP</Label>
                    <InputOTP maxLength={6} value={otpCode} onChange={(val) => setOtpCode(val)}>
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                    <p className="text-xs text-muted-foreground mt-2">
                      Code sent to <span className="font-medium text-foreground">{email}</span>
                    </p>
                  </div>
                  <Button className="w-full" onClick={verifyOtp} disabled={loading}>Verify & Sign In</Button>
                  <Button variant="ghost" className="w-full text-xs" onClick={() => setOtpSent(false)} disabled={loading}>
                    Back to edit email
                  </Button>
                </>
              )}
            </TabsContent>
            <TabsContent value="signup" className="space-y-3 pt-4">
              <div className="space-y-1.5">
                <Label htmlFor="email2">Email</Label>
                <Input id="email2" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pw2">Password</Label>
                <Input id="pw2" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button className="w-full" onClick={signUp} disabled={loading}>Create account</Button>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
