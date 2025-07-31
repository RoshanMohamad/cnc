import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Play,
  Sparkles,
  Cpu,
  Layers,
  Zap,
  Target,
  TrendingUp,
  Shield,
  Users,
  Activity,
  Wifi,
} from "lucide-react";
import { GcodeProgressMonitor } from "@/components/GcodeProgressMonitor";

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Header Navigation */}
      <nav className="bg-white/70 backdrop-blur-md border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Cpu className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Tech Titans CNC
              </span>
            </div>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center space-x-8">
              <Link
                href="/machines"
                className="text-gray-600 hover:text-blue-600 transition-colors"
              >
                Machines
              </Link>
              <Link
                href="/designer/new"
                className="text-gray-600 hover:text-blue-600 transition-colors"
              >
                G-Code Designer
              </Link>
              <Link
                href="/monitor"
                className="text-gray-600 hover:text-blue-600 transition-colors"
              >
                Monitor
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-20 px-6 sm:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50" />
        <div className="absolute inset-0 bg-grid-slate-900/[0.04] bg-[size:32px_32px]" />

        <div className="relative max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center px-4 py-2 bg-blue-100/50 backdrop-blur-sm rounded-full border border-blue-200/50 mb-6">
            <Sparkles className="w-4 h-4 text-blue-600 mr-2" />
            <span className="text-sm font-medium text-blue-700">
              Professional CNC Control Software
            </span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent">
              Precision Manufacturing
            </span>
            <br />
            <span className="text-gray-900">Made Simple</span>
          </h1>

          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
            Advanced CNC control with real-time monitoring, intuitive G-code
            generation, and seamless machine integration for professional
            manufacturing workflows.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link
              href="/machines"
              className="text-gray-600 hover:text-blue-600 transition-colors"
            >
              <Button size="lg" className="group cursor-pointer">
                <Play className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                Start Machining
              </Button>
            </Link>
            <Link href="/designer/new">
              <Button variant="outline" size="lg" className="group cursor-pointer">
                <Layers className="w-5 h-5 mr-2" />
                Design G-Code
              </Button>
            </Link>
          </div>

          {/* Live Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <Card className="bg-white/50 backdrop-blur-sm border-white/20 hover:bg-white/60 transition-all duration-300">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">24/7</h3>
                <p className="text-gray-600">Continuous Monitoring</p>
              </CardContent>
            </Card>

            <Card className="bg-white/50 backdrop-blur-sm border-white/20 hover:bg-white/60 transition-all duration-300">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  ±0.01mm
                </h3>
                <p className="text-gray-600">Precision Accuracy</p>
              </CardContent>
            </Card>

            <Card className="bg-white/50 backdrop-blur-sm border-white/20 hover:bg-white/60 transition-all duration-300">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">3x</h3>
                <p className="text-gray-600">Faster Production</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Real-time Machine Control */}
      <section className="py-20 px-6 sm:px-8 bg-white/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Real-time Machine Control
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Monitor your CNC machines, track G-code progress, and maintain
              complete control over your manufacturing process.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* G-code Progress Monitor */}
            <Card className="bg-white/70 backdrop-blur-md border-white/20 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
                  G-Code Progress
                </CardTitle>
                <CardDescription>
                  Real-time machining progress and status updates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <GcodeProgressMonitor />
              </CardContent>
            </Card>

            {/* Machine Status */}
            <Card className="bg-white/70 backdrop-blur-md border-white/20 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Wifi className="w-5 h-5 mr-2 text-green-600" />
                  Machine Status
                </CardTitle>
                <CardDescription>
                  Connected machines and their current status
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                    <span className="font-medium">CNC Router 01</span>
                  </div>
                  <span className="text-sm text-green-700 bg-green-100 px-2 py-1 rounded">
                    Online
                  </span>
                </div>
                <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></div>
                    <span className="font-medium">Plasma Cutter 01</span>
                  </div>
                  <span className="text-sm text-yellow-700 bg-yellow-100 px-2 py-1 rounded">
                    Standby
                  </span>
                </div>
                <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
                    <span className="font-medium">Laser Engraver 01</span>
                  </div>
                  <span className="text-sm text-red-700 bg-red-100 px-2 py-1 rounded">
                    Offline
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-6 sm:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Professional Features
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Everything you need for professional CNC operations, from design
              to production.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Layers,
                title: "G-Code Generation",
                description:
                  "Intuitive visual designer for creating optimized toolpaths",
                color: "from-blue-500 to-cyan-500",
              },
              {
                icon: Shield,
                title: "Safety Controls",
                description:
                  "Advanced safety systems with emergency stop and monitoring",
                color: "from-green-500 to-emerald-500",
              },
              {
                icon: Users,
                title: "Multi-User Access",
                description:
                  "Secure user management with role-based permissions",
                color: "from-purple-500 to-violet-500",
              },
              {
                icon: Activity,
                title: "Live Monitoring",
                description:
                  "Real-time machine status and performance analytics",
                color: "from-orange-500 to-red-500",
              },
              {
                icon: Target,
                title: "Precision Control",
                description:
                  "Micro-adjustment capabilities for ultimate precision",
                color: "from-teal-500 to-cyan-500",
              },
              {
                icon: Wifi,
                title: "Remote Access",
                description: "Monitor and control your machines from anywhere",
                color: "from-indigo-500 to-purple-500",
              },
            ].map((feature, index) => (
              <Card
                key={index}
                className="bg-white/50 backdrop-blur-sm border-white/20 hover:bg-white/60 transition-all duration-300 group"
              >
                <CardContent className="p-6">
                  <div
                    className={`w-12 h-12 bg-gradient-to-br ${feature.color} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                  >
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-6 sm:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Cpu className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold">Tech Titans CNC</span>
          </div>
          <p className="text-gray-400 mb-6">
            Professional CNC control software for modern manufacturing
          </p>
          <div className="flex justify-center space-x-6 text-sm text-gray-400">
            <Link
              href="/privacy"
              className="hover:text-white transition-colors"
            >
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-white transition-colors">
              Terms of Service
            </Link>
            <Link
              href="/support"
              className="hover:text-white transition-colors"
            >
              Support
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
