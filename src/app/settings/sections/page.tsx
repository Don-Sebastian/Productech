"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RedirectToMachinery() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/settings/machinery");
  }, [router]);

  return null;
}
