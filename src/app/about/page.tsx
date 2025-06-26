import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DrillIcon as Drone, BarChart3, Target, TrendingUp, Users, Award, ArrowRight } from "lucide-react"

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/">
              <Image src="/images/plnt-logo.svg" alt="PLNT Logo" width={120} height={40} className="h-10 w-auto" />
            </Link>
          </div>
          <nav className="hidden md:flex space-x-8">
            <Link href="/" className="text-gray-700 hover:text-green-700 font-medium">
              Home
            </Link>
            <Link href="/#services" className="text-gray-700 hover:text-green-700 font-medium">
              Services
            </Link>
            <Link href="/#technology" className="text-gray-700 hover:text-green-700 font-medium">
              Technology
            </Link>
            <Link href="/about" className="text-green-700 font-medium">
              About
            </Link>
            <Link href="/#contact" className="text-gray-700 hover:text-green-700 font-medium">
              Contact
            </Link>
          </nav>
          <div className="flex items-center space-x-3">
            <Link href="/dashboard">
              <Button variant="outline" className="border-green-700 text-green-700 hover:bg-green-50">
                <BarChart3 className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
            </Link>
            <Button className="bg-green-700 hover:bg-green-800">Schedule Demo</Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-gray-50 to-green-50 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-4xl mx-auto">
            <Badge className="bg-green-700 text-white mb-4">About PLNT</Badge>
            <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
              Revolutionizing Nursery Operations Through Technology
            </h1>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              We're on a mission to transform the nursery industry with cutting-edge drone technology and data
              analytics, making precision plant counting and inventory management accessible to nursery operators
              everywhere.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/dashboard">
                <Button size="lg" className="bg-green-700 hover:bg-green-800">
                  <Drone className="w-5 h-5 mr-2" />
                  Try Our Technology
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link href="/#contact">
                <Button size="lg" variant="outline" className="border-green-700 text-green-700 hover:bg-green-50">
                  Get In Touch
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Founder Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">Meet Our Founder</h2>
              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-semibold text-green-700 mb-3">Porter Comstock</h3>
                  <p className="text-lg text-gray-600 mb-4">Founder & CEO</p>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    Porter Comstock is the Founder and CEO of PLNT. From working in the nursery industry to working in
                    landscaping, Porter has seen firsthand the inefficiencies in the nursery and landscaping business.
                  </p>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    PLNT is a company leveraging modern hardware and software to streamline inventory counting and make
                    data analytics available to the nursery industry. Porter believes that data accessibility for
                    nurseries will enhance nursery operations and profitability.
                  </p>
                  <p className="text-gray-700 leading-relaxed">
                    His vision is to empower nursery operators with the same advanced technology and insights that have
                    transformed other agricultural sectors, making precision agriculture accessible to businesses of all
                    sizes.
                  </p>
                </div>
              </div>
            </div>
            <div className="relative">
              <Image
                src="/placeholder.svg?height=500&width=600"
                alt="Porter Comstock, Founder and CEO of PLNT"
                width={600}
                height={500}
                className="rounded-lg shadow-2xl"
              />
              <div className="absolute -bottom-6 -left-6 bg-white p-6 rounded-lg shadow-lg">
                <div className="flex items-center space-x-3">
                  <Target className="w-8 h-8 text-green-700" />
                  <div>
                    <p className="font-semibold text-gray-900">Industry Expert</p>
                    <p className="text-sm text-gray-600">10+ Years Experience</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Our Mission & Vision</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Driving innovation in the nursery industry through technology and data
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Target className="w-8 h-8 text-green-700" />
                </div>
                <CardTitle className="text-green-800 text-2xl">Our Mission</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  To revolutionize nursery operations by providing accessible, accurate, and actionable data through
                  advanced drone technology and AI-powered analytics. We're committed to helping nursery operators
                  optimize their inventory management, reduce operational costs, and increase profitability.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-8 h-8 text-green-700" />
                </div>
                <CardTitle className="text-green-800 text-2xl">Our Vision</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  To become the leading technology partner for nursery operators worldwide, creating an ecosystem where
                  data-driven decisions are the standard. We envision a future where every nursery, regardless of size,
                  has access to precision agriculture tools that drive sustainable growth and success.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Company Values */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Our Values</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">The principles that guide everything we do</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Award className="w-8 h-8 text-green-700" />
                </div>
                <CardTitle className="text-green-800">Excellence</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  We strive for 99.5% accuracy in everything we do, from plant counting to customer service.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-green-700" />
                </div>
                <CardTitle className="text-green-800">Partnership</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  We work closely with our customers, understanding their unique challenges and needs.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Drone className="w-8 h-8 text-green-700" />
                </div>
                <CardTitle className="text-green-800">Innovation</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  We continuously push the boundaries of what's possible with drone technology and AI.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="w-8 h-8 text-green-700" />
                </div>
                <CardTitle className="text-green-800">Accessibility</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  We make advanced technology accessible to nurseries of all sizes and technical backgrounds.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-green-800">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">Ready to Transform Your Nursery?</h2>
          <p className="text-xl text-green-100 mb-8 max-w-2xl mx-auto">
            Join Porter's vision and hundreds of nursery operators who trust PLNT for their aerial surveying needs
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/dashboard">
              <Button size="lg" className="bg-white text-green-700 hover:bg-gray-100">
                <Drone className="w-5 h-5 mr-2" />
                Try Flight Planner Free
              </Button>
            </Link>
            <Link href="/#contact">
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-white text-white bg-transparent hover:bg-white hover:text-green-800 hover:border-white"
              >
                Schedule Demo Call
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <Image
                  src="/images/plnt-logo.svg"
                  alt="PLNT Logo"
                  width={120}
                  height={40}
                  className="h-10 w-auto filter brightness-0 invert"
                />
              </div>
              <p className="text-gray-400">
                Advanced drone technology for precision plant counting and nursery analytics.
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Services</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Link href="/#services" className="hover:text-white">
                    Plant Counting
                  </Link>
                </li>
                <li>
                  <Link href="/#services" className="hover:text-white">
                    Growth Analytics
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard" className="hover:text-white">
                    Flight Planning
                  </Link>
                </li>
                <li>
                  <Link href="/#services" className="hover:text-white">
                    Business Intelligence
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Link href="/about" className="hover:text-white">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link href="/#technology" className="hover:text-white">
                    Technology
                  </Link>
                </li>
                <li>
                  <Link href="/#contact" className="hover:text-white">
                    Contact
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard" className="hover:text-white">
                    Dashboard
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li>(555) 123-PLNT</li>
                <li>hello@plnt.tech</li>
                <li>Documentation</li>
                <li>Training Videos</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 PLNT Technologies. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
