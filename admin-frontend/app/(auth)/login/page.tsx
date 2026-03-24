"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Register fields
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regLoading, setRegLoading] = useState(false);

  async function handleSignIn() {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erro ao entrar");
        return;
      }
      router.push("/boards");
    } catch {
      toast.error("Erro de conexão");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUp() {
    if (regPassword.length < 6) {
      toast.error("Senha deve ter no mínimo 6 caracteres");
      return;
    }
    if (regPassword !== regConfirmPassword) {
      toast.error("As senhas não conferem");
      return;
    }

    setRegLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: regName, email: regEmail, password: regPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erro ao criar conta");
        return;
      }
      toast.success("Conta criada com sucesso!");
      router.push("/setup");
    } catch {
      toast.error("Erro de conexão");
    } finally {
      setRegLoading(false);
    }
  }

  return (
    <Card className="border-zinc-800 bg-zinc-900/50 backdrop-blur">
      <Tabs defaultValue="login">
        <div className="p-6 pb-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Entrar</TabsTrigger>
            <TabsTrigger value="signup">Criar Conta</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="login">
          <CardContent className="space-y-4 pt-4">
            <CardDescription className="text-zinc-400 text-center">
              Entre com sua conta para usar o{" "}
              <strong className="text-white">kanban AI Agent</strong> do
              Sistema Automático de Vendas.
            </CardDescription>
            <div className="space-y-2">
              <Label htmlFor="login-email">Email</Label>
              <Input
                id="login-email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password">Senha</Label>
              <Input
                id="login-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
              />
            </div>
            <Button
              className="w-full"
              onClick={handleSignIn}
              disabled={loading || !email || !password}
            >
              {loading ? "Entrando..." : "Entrar"}
            </Button>
            <button
              type="button"
              onClick={() =>
                toast.info(
                  "Entre em contato com o suporte para alterar sua senha."
                )
              }
              className="w-full text-center text-xs text-zinc-500 hover:text-purple-400 transition-colors mt-2"
            >
              Esqueceu sua senha?
            </button>
          </CardContent>
        </TabsContent>

        <TabsContent value="signup">
          <CardContent className="space-y-4 pt-4">
            <CardDescription className="text-zinc-400 text-center">
              Crie uma conta para configurar sua infra e comece a usar o{" "}
              <strong className="text-white">kanban AI Agent</strong> do
              Sistema Automático de Vendas.
            </CardDescription>
            <div className="space-y-2">
              <Label htmlFor="signup-name">Nome completo</Label>
              <Input
                id="signup-name"
                type="text"
                placeholder="Seu nome completo"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-email">Email</Label>
              <Input
                id="signup-email"
                type="email"
                placeholder="seu@email.com"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-password">Senha</Label>
              <Input
                id="signup-password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-confirm">Confirmar senha</Label>
              <Input
                id="signup-confirm"
                type="password"
                placeholder="Repita a senha"
                value={regConfirmPassword}
                onChange={(e) => setRegConfirmPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSignUp()}
              />
            </div>
            <Button
              className="w-full"
              onClick={handleSignUp}
              disabled={regLoading || !regEmail || !regPassword || !regName}
            >
              {regLoading ? "Criando..." : "Criar Conta"}
            </Button>
          </CardContent>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
