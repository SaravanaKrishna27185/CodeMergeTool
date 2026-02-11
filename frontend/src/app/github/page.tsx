"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import GitHubRepositoryDownloader from "@/components/GitHubRepositoryDownloader";

export default function GitHubPage() {
  const router = useRouter();
  const { isAuthenticated, loadUser } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/auth/login");
      return;
    }
    loadUser();
  }, [isAuthenticated, loadUser, router]);

  if (!isAuthenticated) {
    return null;
  }

  return <GitHubRepositoryDownloader />;
}
