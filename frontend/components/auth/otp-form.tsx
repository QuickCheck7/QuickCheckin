"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/lib/auth-store";
import { useTranslation } from "@/lib/i18n";
import { MessageSquare, ArrowLeft, CheckCircle2 } from "lucide-react";

export function OtpForm() {
  const { t } = useTranslation();
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const { phoneNumber, userRole, verifyOtp, logout, isLoading } = useAuthStore();

  useEffect(() => {
    document.getElementById("otp-input")?.focus();
  }, []);

  const handleVerify = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (otp.length !== 6) return setError(t("pleaseEnterCompleteOtp"));
    setError("");
    
    const valid = await verifyOtp(otp);
    
    if (!valid) {
      setError(t("invalidOtp"));
      setOtp("");
    }
  };

  const handleResendOTP = async () => {
    // TODO: Implement resend OTP logic
    setOtp("");
    setError("");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="text-center">
        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <MessageSquare className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-ink mb-2">{t("verifyYourNumber")}</h2>
        <p className="text-sm text-muted">{t("weveSentCode")} <br /><span className="font-medium text-ink">{phoneNumber}</span></p>
      </div>

      <form onSubmit={handleVerify}>
        <div>
          <Label htmlFor="otp-input" className="text-sm font-medium text-ink">
            {t("enterOtpCode")}
          </Label>
          <Input
            id="otp-input"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            maxLength={6}
            inputMode="numeric"
            className="mt-2 text-center text-2xl tracking-widest h-12 rounded-xl border-border focus-visible:ring-2 focus-visible:ring-primary"
          />
          {error && <p className="text-error text-sm mt-2">{error}</p>}
        </div>

        <div className="space-y-3 mt-6">
          <Button
            type="submit"
            disabled={isLoading || otp.length !== 6}
            className="w-full h-12 text-lg bg-primary text-white hover:bg-primary-600 rounded-xl shadow transition"
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                {t("verifying")}
              </div>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5 mr-2" />
                {t("verifyAndContinue")}
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={logout}
            disabled={isLoading}
            className="w-full h-12 text-lg border-border text-ink hover:bg-off rounded-xl"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            {t("backToLogin")}
          </Button>
        </div>
      </form>

      <div className="text-center text-sm text-muted">
        <p>
          {t("accessing")}{" "}
          <span className="font-medium text-ink capitalize">
            {userRole === 'admin' ? t("adminRestaurantDashboard" as any) : `${t(userRole || "guest")} \u2013 ${t("panel")}`}
          </span>
        </p>
        <button
          onClick={handleResendOTP}
          disabled={isLoading}
          className="mt-2 text-primary hover:underline disabled:opacity-50"
        >
          {t('didntReceiveCode')}
        </button>
      </div>
    </motion.div>
  );
}

