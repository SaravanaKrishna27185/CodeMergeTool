import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  GitBranch,
  GitMerge,
  FileText,
  Shield,
  Zap,
  Users,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Code Merge Tool - Home",
  description:
    "Streamline your code merge process between GitHub and GitLab repositories",
};

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <GitMerge className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold text-foreground">
                Code Merge Tool
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/auth/login">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link href="/auth/register">
                <Button>Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4 text-center bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto max-w-4xl">
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
            Streamline Your
            <span className="text-primary"> Code Merges</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            A comprehensive application for managing code merges between GitHub
            and GitLab repositories. Visualize changes, resolve conflicts, and
            automate your workflow.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/register">
              <Button size="lg" className="w-full sm:w-auto">
                Start Merging Now
              </Button>
            </Link>
            <Link href="#features">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Powerful Features
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to manage complex code merges between
              different platforms
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="p-6">
              <GitBranch className="h-10 w-10 text-primary mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Cross-Platform Integration
              </h3>
              <p className="text-muted-foreground">
                Seamlessly connect and manage repositories from both GitHub and
                GitLab platforms
              </p>
            </Card>

            <Card className="p-6">
              <FileText className="h-10 w-10 text-primary mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                File Tree Visualization
              </h3>
              <p className="text-muted-foreground">
                Interactive file tree with selective copying and conflict
                resolution capabilities
              </p>
            </Card>

            <Card className="p-6">
              <GitMerge className="h-10 w-10 text-primary mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Automated Merge Requests
              </h3>
              <p className="text-muted-foreground">
                Create and manage merge requests automatically with intelligent
                conflict detection
              </p>
            </Card>

            <Card className="p-6">
              <Shield className="h-10 w-10 text-primary mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Secure Authentication
              </h3>
              <p className="text-muted-foreground">
                OAuth2 integration with GitHub and GitLab for secure access to
                your repositories
              </p>
            </Card>

            <Card className="p-6">
              <Zap className="h-10 w-10 text-primary mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Real-time Sync
              </h3>
              <p className="text-muted-foreground">
                Keep your repositories synchronized with real-time updates and
                webhook integration
              </p>
            </Card>

            <Card className="p-6">
              <Users className="h-10 w-10 text-primary mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Team Collaboration
              </h3>
              <p className="text-muted-foreground">
                Built for teams with role-based access control and collaborative
                merge resolution
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-muted/20">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join developers who are already streamlining their merge workflow
          </p>
          <Link href="/auth/register">
            <Button size="lg">Create Your Account</Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-4 mb-4 md:mb-0">
              <GitMerge className="h-6 w-6 text-primary" />
              <span className="text-sm text-muted-foreground">
                © 2025 Code Merge Tool. All rights reserved.
              </span>
            </div>
            <div className="flex space-x-6">
              <Link
                href="/docs"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Documentation
              </Link>
              <Link
                href="/support"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Support
              </Link>
              <Link
                href="/privacy"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Privacy
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
