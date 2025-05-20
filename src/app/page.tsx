import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Scissors, FileCode, Send, Library, Plus } from "lucide-react";

export default function Home() {
  return (
    <div className="container mx-auto py-10">
      <header className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight">T-ShirtCraft</h1>
        <p className="text-muted-foreground mt-2">
          T-shirt cutting patterns and print design positioning
        </p>
      </header>

      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="designs">My Designs</TabsTrigger>
          <TabsTrigger value="machines">Machines</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Quick Actions
                </CardTitle>
                <Scissors className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="grid gap-2">
                  <Button asChild className="w-full bg-blue-600 justify-start">
                    <Link href="/designer/new">
                      <Plus className="mr-2 h-4 w-4" />
                      New T-Shirt Design
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="w-full justify-start"
                  >
                    <Link href="/designs">
                      <Library className="mr-2 h-4 w-4" />
                      Browse Designs
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="w-full justify-start"
                  >
                    <Link href="/machines">
                      <Send className="mr-2 h-4 w-4" />
                      Connect Machine
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Recent Designs
                </CardTitle>
                <FileCode className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {["Classic Fit - M", "Slim Fit - L", "Oversized - XL"].map(
                    (pattern, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between"
                      >
                        <span className="text-sm">{pattern}</span>
                        <Button variant="ghost" size="sm">
                          Open
                        </Button>
                      </div>
                    )
                  )}
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="ghost" size="sm" asChild className="w-full">
                  <Link href="/designs">View all designs</Link>
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Machine Status
                </CardTitle>
                <Send className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <span className="h-2 w-2 rounded-full bg-red-500 mr-2"></span>
                    <span className="text-sm">Cutter - Disconnected</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  asChild
                  variant="outline"
                  className="w-full justify-start"
                >
                  <Link href="/machines">
                    <Send className="mr-2 h-4 w-4" />
                    Connect Machine
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Getting Started</CardTitle>
                <CardDescription>
                  New to T-ShirtCraft? Follow these steps to create your first
                  t-shirt design.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border bg-muted">
                      1
                    </div>
                    <div className="ml-4">
                      <h3 className="text-sm font-medium">
                        Select a t-shirt size template
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Choose from standard sizes (S, M, L, XL, etc.)
                      </p>
                    </div>
                  </div>
                  <div className="flex">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border bg-muted">
                      2
                    </div>
                    <div className="ml-4">
                      <h3 className="text-sm font-medium">
                        Upload your print design
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Add your artwork and position it on the t-shirt
                      </p>
                    </div>
                  </div>
                  <div className="flex">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border bg-muted">
                      3
                    </div>
                    <div className="ml-4">
                      <h3 className="text-sm font-medium">
                        Generate cutting pattern
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Convert your design to machine-readable instructions
                      </p>
                    </div>
                  </div>
                  <div className="flex">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border bg-muted">
                      4
                    </div>
                    <div className="ml-4">
                      <h3 className="text-sm font-medium">Send to machine</h3>
                      <p className="text-sm text-muted-foreground">
                        Connect to your cutter and start the cutting process
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button asChild>
                  <Link href="/designer/new">Create Your First T-Shirt</Link>
                </Button>
              </CardFooter>
            </Card>

            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>T-Shirt Size Guide</CardTitle>
                <CardDescription>
                  Standard measurements for different t-shirt sizes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Size</th>
                        <th className="text-center py-2">Chest (cm)</th>
                        <th className="text-center py-2">Length (cm)</th>
                        <th className="text-center py-2">Sleeve (cm)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="py-2">S</td>
                        <td className="text-center py-2">96-101</td>
                        <td className="text-center py-2">71-74</td>
                        <td className="text-center py-2">20</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2">M</td>
                        <td className="text-center py-2">101-106</td>
                        <td className="text-center py-2">74-76</td>
                        <td className="text-center py-2">21</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2">L</td>
                        <td className="text-center py-2">106-111</td>
                        <td className="text-center py-2">76-79</td>
                        <td className="text-center py-2">22</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2">XL</td>
                        <td className="text-center py-2">111-116</td>
                        <td className="text-center py-2">79-81</td>
                        <td className="text-center py-2">23</td>
                      </tr>
                      <tr>
                        <td className="py-2">XXL</td>
                        <td className="text-center py-2">116-121</td>
                        <td className="text-center py-2">81-84</td>
                        <td className="text-center py-2">24</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="designs" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">My T-Shirt Designs</h2>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Design
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                name: "Classic Fit - M",
                date: "Apr 2, 2025",
                print: "Mountain Logo",
                size: "M",
              },
              {
                name: "Slim Fit - L",
                date: "Mar 28, 2025",
                print: "Abstract Pattern",
                size: "L",
              },
              {
                name: "Oversized - XL",
                date: "Mar 15, 2025",
                print: "Company Logo",
                size: "XL",
              },
              {
                name: "V-Neck - S",
                date: "Feb 20, 2025",
                print: "Floral Design",
                size: "S",
              },
              {
                name: "Crew Neck - XXL",
                date: "Feb 10, 2025",
                print: "Text Only",
                size: "XXL",
              },
              {
                name: "Athletic Fit - M",
                date: "Jan 5, 2025",
                print: "Geometric Pattern",
                size: "M",
              },
            ].map((design, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-md">{design.name}</CardTitle>
                  <CardDescription>Last edited: {design.date}</CardDescription>
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="aspect-video rounded-md bg-muted flex flex-col items-center justify-center p-4">
                    <div className="text-muted-foreground text-xs mb-2">
                      Size: {design.size}
                    </div>
                    <div className="w-24 h-32 border-2 border-dashed border-muted-foreground flex items-center justify-center">
                      <div className="text-xs text-center text-muted-foreground">
                        {design.print}
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline" size="sm">
                    Edit
                  </Button>
                  <Button size="sm">Cut Now</Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="machines" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">My Machines</h2>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Machine
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {[{ name: "Cutter", type: "Network", status: "Disconnected" }].map(
              (machine, i) => (
                <Card key={i}>
                  <CardHeader>
                    <CardTitle>{machine.name}</CardTitle>
                    <CardDescription>{machine.type} Connection</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center">
                      <span className="h-2 w-2 rounded-full bg-red-500 mr-2"></span>
                      <span>Status: {machine.status}</span>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button variant="outline">Configure</Button>
                    <Button>Connect</Button>
                  </CardFooter>
                </Card>
              )
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
