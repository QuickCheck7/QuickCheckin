"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuthStore, UserRole } from "@/lib/auth-store";
import { useTranslation } from "@/lib/i18n";
import { Phone, UserCircle2, ArrowRight } from "lucide-react";

export function LoginForm() {
  const { t } = useTranslation();
  const [countryCode, setCountryCode] = useState("+1");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole | "">("");
  const [errors, setErrors] = useState<{ phone?: string; role?: string }>({});
  const { login, isLoading } = useAuthStore();

  const validateForm = () => {
    const e: { phone?: string; role?: string } = {};
    const cleanDigits = phoneNumber.trim().replace(/\D/g, "");
    if (!phoneNumber.trim()) {
      e.phone = t("pleaseEnterPhone");
    } else if (cleanDigits.length < 7 || cleanDigits.length > 15) {
      e.phone = t("pleaseEnterValidPhone");
    }
    if (!selectedRole) e.role = t("pleaseSelectAccessType");
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleContinue = () => {
    if (validateForm()) {
      const trimmed = phoneNumber.trim();
      let fullPhone = '';
      if (trimmed.startsWith('+')) {
        fullPhone = `+${trimmed.replace(/\D/g, "")}`;
      } else {
        const cleanDigits = trimmed.replace(/\D/g, "");
        fullPhone = `${countryCode}${cleanDigits}`;
      }
      login(fullPhone, selectedRole as UserRole);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Phone */}
      <div>
        <Label htmlFor="phone" className="text-sm font-medium text-ink">
          {t("mobileNumber")}
        </Label>
        <div className="flex gap-2 mt-2">
          {/* Country Code Dropdown */}
          <Select value={countryCode} onValueChange={setCountryCode}>
            <SelectTrigger className="w-28 h-12 rounded-xl border-border focus-visible:ring-2 focus-visible:ring-primary text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              <SelectItem value="+1">
                <span className="font-mono">+1 (US/CA)</span>
              </SelectItem>
              <SelectItem value="+91">
                <span className="font-mono">+91 (IN)</span>
              </SelectItem>
              <SelectItem value="+44">
                <span className="font-mono">+44 (UK)</span>
              </SelectItem>
              <SelectItem value="+61">
                <span className="font-mono">+61 (AU)</span>
              </SelectItem>
              <SelectItem value="+49">
                <span className="font-mono">+49 (DE)</span>
              </SelectItem>
              <SelectItem value="+33">
                <span className="font-mono">+33 (FR)</span>
              </SelectItem>
              <SelectItem value="+971">
                <span className="font-mono">+971 (UAE)</span>
              </SelectItem>
              <SelectItem value="+65">
                <span className="font-mono">+65 (SG)</span>
              </SelectItem>
              <SelectItem value="+52">
                <span className="font-mono">+52 (MX)</span>
              </SelectItem>
              <SelectItem value="+34">
                <span className="font-mono">+34 (ES)</span>
              </SelectItem>
              <SelectItem value="+39">
                <span className="font-mono">+39 (IT)</span>
              </SelectItem>
              <SelectItem value="+81">
                <span className="font-mono">+81 (JP)</span>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Phone Number Input */}
          <div className="relative flex-1">
            <Phone className="absolute left-3 top-3.5 h-5 w-5 text-muted" />
            <Input
              id="phone"
              type="tel"
              placeholder={countryCode === "+1" ? "(555) 000-0000" : countryCode === "+91" ? "98765 43210" : "Phone number"}
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value.replace(/[^\d+\s\-()]/g, ""))}
              className="pl-10 h-12 text-lg rounded-xl border-border focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>
        </div>
        {errors.phone && <p className="text-error text-sm mt-2">{errors.phone}</p>}
      </div>

      {/* Role */}
      <div>
        <Label htmlFor="role" className="text-sm font-medium text-ink">
          {t("accessType")}
        </Label>
        <Select value={selectedRole} onValueChange={(v: UserRole) => setSelectedRole(v)}>
          <SelectTrigger className="h-12 mt-2 rounded-xl border-border focus-visible:ring-2 focus-visible:ring-primary">
            <SelectValue placeholder={t("selectAccessType")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="guest">
              <div className="flex items-center gap-2">
                <UserCircle2 className="w-4 h-4 text-secondary" />
                <span>{t("guestJoinWaitlist")}</span>
              </div>
            </SelectItem>
            <SelectItem value="admin">
              <div className="flex items-center gap-2">
                <UserCircle2 className="w-4 h-4 text-primary" />
                <span>{t("adminRestaurantDashboard")}</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
        {errors.role && <p className="text-error text-sm mt-2">{errors.role}</p>}
      </div>

      {/* CTA */}
      <Button
        onClick={handleContinue}
        disabled={isLoading}
        className="w-full h-12 text-lg bg-primary text-white hover:bg-primary-600 rounded-xl shadow-md transition"
      >
        {isLoading ? (
          <div className="flex items-center justify-center gap-2">
            <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
            {t('sending')}
          </div>
        ) : (
          <>
            {t("continue")}
            <ArrowRight className="ml-2 h-5 w-5" />
          </>
        )}
      </Button>

      <p className="text-center text-sm text-muted">
        {t('otpSmsNotice')}
      </p>
    </motion.div>
  );
}
