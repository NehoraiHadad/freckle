"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { login } from "@/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";

interface LoginFormProps {
  returnTo?: string;
}

export function LoginForm({ returnTo }: LoginFormProps) {
  const [state, formAction, isPending] = useActionState(login, null);
  const t = useTranslations("auth");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">Freckle</h1>
          <CardDescription>{t("adminConsole")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            {returnTo && (
              <input type="hidden" name="returnTo" value={returnTo} />
            )}
            <div>
              <label htmlFor="password" className="sr-only">
                {t("adminPassword")}
              </label>
              <Input
                id="password"
                type="password"
                name="password"
                placeholder={t("adminPassword")}
                required
                autoFocus
                disabled={isPending}
                aria-invalid={!!state?.error}
                aria-describedby={state?.error ? "password-error" : undefined}
              />
            </div>
            {state?.error && (
              <p id="password-error" role="alert" className="text-sm text-destructive">{state.error}</p>
            )}
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? t("loginPending") : t("login")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
